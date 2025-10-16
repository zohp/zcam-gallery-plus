/**
 * Migration service tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MigrationService, MigrationUtils } from '../migration'
import fs from 'fs-extra'
import path from 'path'

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/mock/userData'
      return '/mock/path'
    }),
  },
}))

describe('MigrationService', () => {
  let migrationService: MigrationService
  const mockOldAppDataPath = '/mock/oldAppData'
  const mockNewAppDataPath = '/mock/userData'
  const mockBackupPath = '/mock/userData/migration-backup'

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock fs methods
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    vi.spyOn(fs, 'ensureDir').mockResolvedValue(undefined)
    vi.spyOn(fs, 'copy').mockResolvedValue(undefined)
    vi.spyOn(fs, 'writeJson').mockResolvedValue(undefined)
    vi.spyOn(fs, 'readJson').mockResolvedValue({})
    vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined)
    vi.spyOn(fs, 'move').mockResolvedValue(undefined)
    vi.spyOn(fs, 'remove').mockResolvedValue(undefined)

    migrationService = new MigrationService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isMigrationNeeded', () => {
    it('should return false when no old app data exists', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      
      const result = await migrationService.isMigrationNeeded()
      
      expect(result).toBe(false)
    })

    it('should return false when migration already completed', async () => {
      // Mock old app data exists
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('oldAppData') || path.includes('.migration-complete')
      })
      
      const result = await migrationService.isMigrationNeeded()
      
      expect(result).toBe(false)
    })

    it('should return true when old app data exists and migration not completed', async () => {
      // Mock old app data exists but migration not completed
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('oldAppData') && !path.includes('.migration-complete')
      })
      
      const result = await migrationService.isMigrationNeeded()
      
      expect(result).toBe(true)
    })
  })

  describe('performMigration', () => {
    it('should create backup before migration', async () => {
      // Mock old app data exists
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('oldAppData')
      })
      
      // Mock loadOldAppData to return test data
      const mockOldData = {
        settings: {
          ingestPath: '/test/ingest',
          theme: 'dark',
          autoIngest: true,
        },
        thumbnails: {
          'file1': '/test/thumb1.jpg',
        },
        downloadHistory: [
          {
            fileName: 'test.mov',
            downloadPath: '/test/downloads',
            timestamp: '2023-01-01T00:00:00Z',
            size: 1000000,
          },
        ],
      }
      
      vi.spyOn(fs, 'readJson').mockResolvedValue(mockOldData.settings)
      
      const result = await migrationService.performMigration()
      
      expect(result.success).toBe(true)
      expect(result.backupPath).toBeDefined()
      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('migration-backup'))
    })

    it('should migrate settings correctly', async () => {
      // Mock old app data exists
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('oldAppData')
      })
      
      const oldSettings = {
        ingestPath: '/test/ingest',
        theme: 'dark',
        autoIngest: true,
        sortBy: 'date',
        cameraIp: '192.168.1.100',
      }
      
      vi.spyOn(fs, 'readJson').mockResolvedValue(oldSettings)
      
      const result = await migrationService.performMigration()
      
      expect(result.success).toBe(true)
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.objectContaining({
          ingestPath: '/test/ingest',
          theme: 'dark',
          autoIngest: true,
          sortPreference: 'date',
          defaultCameraIp: '192.168.1.100',
        }),
        expect.any(Object)
      )
    })

    it('should handle migration errors gracefully', async () => {
      // Mock fs operations to throw error
      vi.spyOn(fs, 'ensureDir').mockRejectedValue(new Error('Permission denied'))
      
      const result = await migrationService.performMigration()
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Migration failed: Permission denied')
    })
  })

  describe('validateMigration', () => {
    it('should return valid when migration is complete', async () => {
      // Mock migration files exist
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('settings.json') || path.includes('.migration-complete')
      })
      
      vi.spyOn(fs, 'readJson').mockResolvedValue({ version: '2.0.0' })
      
      const result = await migrationService.validateMigration()
      
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should return invalid when settings file missing', async () => {
      // Mock only migration marker exists
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('.migration-complete')
      })
      
      const result = await migrationService.validateMigration()
      
      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Settings file not found after migration')
    })

    it('should return invalid when settings file is corrupted', async () => {
      // Mock files exist but settings are invalid
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('settings.json') || path.includes('.migration-complete')
      })
      
      vi.spyOn(fs, 'readJson').mockResolvedValue(null)
      
      const result = await migrationService.validateMigration()
      
      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Settings file is invalid')
    })
  })

  describe('getMigrationStatus', () => {
    it('should return correct status when migration needed', async () => {
      // Mock old app data exists but migration not completed
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('oldAppData') && !path.includes('.migration-complete')
      })
      
      const status = await migrationService.getMigrationStatus()
      
      expect(status.needed).toBe(true)
      expect(status.completed).toBe(false)
      expect(status.oldDataPath).toBeDefined()
    })

    it('should return completed status when migration done', async () => {
      // Mock migration completed
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('.migration-complete')
      })
      
      const mockMarkerData = {
        version: '2.0.0',
        migratedAt: '2023-01-01T00:00:00Z',
      }
      
      vi.spyOn(fs, 'readJson').mockResolvedValue(mockMarkerData)
      
      const status = await migrationService.getMigrationStatus()
      
      expect(status.needed).toBe(false)
      expect(status.completed).toBe(true)
      expect(status.migratedAt).toBe('2023-01-01T00:00:00Z')
    })
  })

  describe('rollbackMigration', () => {
    it('should rollback migration successfully', async () => {
      const backupPath = '/mock/backup'
      
      // Mock migration marker exists
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('.migration-complete')
      })
      
      const result = await migrationService.rollbackMigration(backupPath)
      
      expect(result).toBe(true)
      expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining('.migration-complete'))
      expect(fs.copy).toHaveBeenCalledWith(
        expect.stringContaining('new-app-data'),
        expect.stringContaining('userData')
      )
    })

    it('should handle rollback errors', async () => {
      const backupPath = '/mock/backup'
      
      // Mock fs operations to throw error
      vi.spyOn(fs, 'remove').mockRejectedValue(new Error('Permission denied'))
      
      const result = await migrationService.rollbackMigration(backupPath)
      
      expect(result).toBe(false)
    })
  })
})

describe('MigrationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    vi.spyOn(fs, 'move').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isFirstRunAfterMigration', () => {
    it('should return true when migration marker exists', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      
      const result = MigrationUtils.isFirstRunAfterMigration()
      
      expect(result).toBe(true)
    })

    it('should return false when migration marker does not exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      
      const result = MigrationUtils.isFirstRunAfterMigration()
      
      expect(result).toBe(false)
    })
  })

  describe('getMigrationInfo', () => {
    it('should return no migration needed when no old data', async () => {
      const result = await MigrationUtils.getMigrationInfo()
      
      expect(result.hasOldData).toBe(false)
      expect(result.canMigrate).toBe(false)
      expect(result.estimatedItems).toBe(0)
    })

    it('should return migration info when old data exists', async () => {
      // Mock old data exists
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('oldAppData')
      })
      
      const mockOldData = {
        settings: { theme: 'dark' },
        thumbnails: { 'file1': '/thumb1.jpg', 'file2': '/thumb2.jpg' },
        downloadHistory: [{ fileName: 'test.mov' }],
      }
      
      vi.spyOn(fs, 'readJson').mockResolvedValue(mockOldData.settings)
      
      const result = await MigrationUtils.getMigrationInfo()
      
      expect(result.hasOldData).toBe(true)
      expect(result.canMigrate).toBe(true)
      expect(result.estimatedItems).toBeGreaterThan(0)
    })
  })

  describe('cleanupOldData', () => {
    it('should cleanup old data after successful migration', async () => {
      // Mock migration completed and old data exists
      vi.spyOn(fs, 'existsSync').mockImplementation((path: string) => {
        return path.includes('.migration-complete') || path.includes('oldAppData')
      })
      
      const result = await MigrationUtils.cleanupOldData()
      
      expect(result).toBe(true)
      expect(fs.move).toHaveBeenCalledWith(
        expect.stringContaining('oldAppData'),
        expect.stringContaining('old-app-backup')
      )
    })

    it('should return false when no migration completed', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      
      const result = await MigrationUtils.cleanupOldData()
      
      expect(result).toBe(false)
    })
  })
})
})
