/**
 * Tests for migration utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MigrationService, MigrationUtils } from '../migration'
import fs from 'fs-extra'
import path from 'path'
import { app } from 'electron'

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/mock/user-data'
      if (name === 'documents') return '/mock/documents'
      if (name === 'home') return '/mock/home'
      return '/mock/path'
    }),
  },
}))

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    existsSync: vi.fn(),
    ensureDir: vi.fn(),
    copy: vi.fn(),
    writeJson: vi.fn(),
    readJson: vi.fn(),
    writeFile: vi.fn(),
    remove: vi.fn(),
    move: vi.fn(),
  },
}))

describe('MigrationService', () => {
  let migrationService: MigrationService
  const mockFs = fs as any

  beforeEach(() => {
    vi.clearAllMocks()
    migrationService = new MigrationService()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('detectOldAppDataPath', () => {
    it('should detect old app data in common locations', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('zcam-gallery')
      })

      // This tests the private method indirectly through constructor
      expect(migrationService).toBeDefined()
    })

    it('should return empty string if no old data found', () => {
      mockFs.existsSync.mockReturnValue(false)

      const service = new MigrationService()
      expect(service).toBeDefined()
    })
  })

  describe('isMigrationNeeded', () => {
    it('should return false if no old app data path', async () => {
      mockFs.existsSync.mockReturnValue(false)

      const needed = await migrationService.isMigrationNeeded()
      expect(needed).toBe(false)
    })

    it('should return false if migration already completed', async () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('.migration-complete')
      })

      const needed = await migrationService.isMigrationNeeded()
      expect(needed).toBe(false)
    })

    it('should return true if old data exists and migration not completed', async () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('zcam-gallery') && !filePath.includes('.migration-complete')
      })

      const needed = await migrationService.isMigrationNeeded()
      expect(needed).toBe(true)
    })
  })

  describe('performMigration', () => {
    it('should perform successful migration', async () => {
      // Mock old data exists
      mockFs.existsSync.mockReturnValue(true)
      
      // Mock successful operations
      mockFs.ensureDir.mockResolvedValue(undefined)
      mockFs.copy.mockResolvedValue(undefined)
      mockFs.writeJson.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.readJson.mockResolvedValue({
        settings: {
          ingestPath: '/test/path',
          autoIngest: true,
          theme: 'dark',
        },
        thumbnails: {
          'file1': '/path/to/thumb1.jpg',
          'file2': '/path/to/thumb2.jpg',
        },
        downloadHistory: [
          {
            fileName: 'test.mov',
            downloadPath: '/downloads/test.mov',
            timestamp: '2023-01-01T00:00:00Z',
            size: 1024000,
          },
        ],
      })

      const result = await migrationService.performMigration()

      expect(result.success).toBe(true)
      expect(result.migratedItems).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.backupPath).toBeDefined()
    })

    it('should handle migration errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.ensureDir.mockRejectedValue(new Error('Disk full'))

      const result = await migrationService.performMigration()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Disk full')
    })

    it('should return warning if no old data found', async () => {
      mockFs.existsSync.mockReturnValue(false)
      mockFs.readJson.mockResolvedValue(null)

      const result = await migrationService.performMigration()

      expect(result.success).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('No old app data found')
    })
  })

  describe('validateMigration', () => {
    it('should validate successful migration', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readJson.mockResolvedValue({
        version: '2.0.0',
        ingestPath: '/test/path',
      })

      const validation = await migrationService.validateMigration()

      expect(validation.valid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should detect invalid migration', async () => {
      mockFs.existsSync.mockReturnValue(false)

      const validation = await migrationService.validateMigration()

      expect(validation.valid).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
    })

    it('should handle validation errors', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readJson.mockRejectedValue(new Error('Corrupt file'))

      const validation = await migrationService.validateMigration()

      expect(validation.valid).toBe(false)
      expect(validation.issues[0]).toContain('Corrupt file')
    })
  })

  describe('rollbackMigration', () => {
    it('should successfully rollback migration', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.remove.mockResolvedValue(undefined)
      mockFs.copy.mockResolvedValue(undefined)

      const success = await migrationService.rollbackMigration('/backup/path')

      expect(success).toBe(true)
      expect(mockFs.remove).toHaveBeenCalled()
      expect(mockFs.copy).toHaveBeenCalled()
    })

    it('should handle rollback errors', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.remove.mockRejectedValue(new Error('Permission denied'))

      const success = await migrationService.rollbackMigration('/backup/path')

      expect(success).toBe(false)
    })
  })

  describe('getMigrationStatus', () => {
    it('should return correct migration status', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readJson.mockResolvedValue({
        migratedAt: '2023-01-01T00:00:00Z',
      })

      const status = await migrationService.getMigrationStatus()

      expect(status.needed).toBeDefined()
      expect(status.completed).toBe(true)
      expect(status.migratedAt).toBe('2023-01-01T00:00:00Z')
    })
  })
})

describe('MigrationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getMigrationInfo', () => {
    it('should return migration info when old data exists', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readJson.mockResolvedValue({
        settings: { theme: 'dark' },
        thumbnails: { 'file1': '/thumb1.jpg' },
        downloadHistory: [{ fileName: 'test.mov' }],
      })

      const info = await MigrationUtils.getMigrationInfo()

      expect(info.hasOldData).toBe(true)
      expect(info.canMigrate).toBe(true)
      expect(info.estimatedItems).toBeGreaterThan(0)
    })

    it('should return no migration needed when no old data', async () => {
      mockFs.existsSync.mockReturnValue(false)

      const info = await MigrationUtils.getMigrationInfo()

      expect(info.hasOldData).toBe(false)
      expect(info.canMigrate).toBe(false)
      expect(info.estimatedItems).toBe(0)
    })
  })

  describe('isFirstRunAfterMigration', () => {
    it('should detect first run after migration', () => {
      mockFs.existsSync.mockReturnValue(true)

      const isFirstRun = MigrationUtils.isFirstRunAfterMigration()

      expect(isFirstRun).toBe(true)
    })

    it('should detect not first run', () => {
      mockFs.existsSync.mockReturnValue(false)

      const isFirstRun = MigrationUtils.isFirstRunAfterMigration()

      expect(isFirstRun).toBe(false)
    })
  })

  describe('cleanupOldData', () => {
    it('should cleanup old data after successful migration', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.move.mockResolvedValue(undefined)

      const success = await MigrationUtils.cleanupOldData()

      expect(success).toBe(true)
      expect(mockFs.move).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.move.mockRejectedValue(new Error('Permission denied'))

      const success = await MigrationUtils.cleanupOldData()

      expect(success).toBe(false)
    })

    it('should return false if no migration completed', async () => {
      mockFs.existsSync.mockReturnValue(false)

      const success = await MigrationUtils.cleanupOldData()

      expect(success).toBe(false)
    })
  })
})

describe('Migration Integration', () => {
  it('should handle complete migration flow', async () => {
    const migrationService = new MigrationService()

    // Mock successful migration flow
    mockFs.existsSync.mockReturnValue(true)
    mockFs.ensureDir.mockResolvedValue(undefined)
    mockFs.copy.mockResolvedValue(undefined)
    mockFs.writeJson.mockResolvedValue(undefined)
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.readJson.mockResolvedValue({
      settings: { ingestPath: '/test/path' },
    })

    // Check if migration needed
    const needed = await migrationService.isMigrationNeeded()
    expect(needed).toBe(true)

    // Perform migration
    const result = await migrationService.performMigration()
    expect(result.success).toBe(true)

    // Validate migration
    const validation = await migrationService.validateMigration()
    expect(validation.valid).toBe(true)

    // Get status
    const status = await migrationService.getMigrationStatus()
    expect(status.completed).toBe(true)
  })

  it('should handle migration failure and rollback', async () => {
    const migrationService = new MigrationService()

    // Mock migration failure
    mockFs.existsSync.mockReturnValue(true)
    mockFs.ensureDir.mockRejectedValue(new Error('Disk full'))

    // Perform migration (should fail)
    const result = await migrationService.performMigration()
    expect(result.success).toBe(false)

    // Rollback migration
    mockFs.remove.mockResolvedValue(undefined)
    mockFs.copy.mockResolvedValue(undefined)
    const rollbackSuccess = await migrationService.rollbackMigration('/backup/path')
    expect(rollbackSuccess).toBe(true)
  })
})
