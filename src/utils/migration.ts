/**
 * Migration utilities for transitioning from old app to new app
 * 
 * This module handles:
 * - Settings migration from old format to new format
 * - Data preservation and validation
 * - Backup creation before migration
 * - Rollback capabilities
 */

import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'

// Types for old app data structures
interface OldAppSettings {
  ingestPath?: string
  autoIngest?: boolean
  theme?: 'light' | 'dark'
  sortBy?: string
  cameraIp?: string
  thumbnailPath?: string
  cameraPath?: string
  [key: string]: any
}

interface OldAppData {
  settings?: OldAppSettings
  thumbnails?: Record<string, string>
  downloadHistory?: Array<{
    fileName: string
    downloadPath: string
    timestamp: string
    size: number
  }>
  cache?: Record<string, any>
}

interface MigrationResult {
  success: boolean
  migratedItems: number
  errors: string[]
  warnings: string[]
  backupPath?: string
}

/**
 * Migration service for handling app data transitions
 */
export class MigrationService {
  private readonly oldAppDataPath: string
  private readonly newAppDataPath: string
  private readonly backupPath: string

  constructor() {
    // Determine old app data path (where the old app stored data)
    this.oldAppDataPath = this.detectOldAppDataPath()
    
    // New app data path
    this.newAppDataPath = app.getPath('userData')
    
    // Backup path for safety
    this.backupPath = path.join(this.newAppDataPath, 'migration-backup')
  }

  /**
   * Detect where the old app stored its data
   */
  private detectOldAppDataPath(): string {
    const possiblePaths = [
      // Common Electron app data locations
      path.join(app.getPath('userData'), '..', 'zcam-gallery'),
      path.join(app.getPath('userData'), '..', 'ZCAM Gallery'),
      path.join(app.getPath('userData'), '..', 'zcam-gallery-plus'),
      
      // Alternative locations
      path.join(app.getPath('documents'), 'ZCAM Gallery'),
      path.join(app.getPath('home'), '.zcam-gallery'),
      
      // Development paths
      path.join(app.getPath('userData'), '..', 'zcam-gallery-dev'),
    ]

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        console.log(`Found old app data at: ${possiblePath}`)
        return possiblePath
      }
    }

    console.log('No old app data found, will use defaults')
    return ''
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    if (!this.oldAppDataPath || !fs.existsSync(this.oldAppDataPath)) {
      return false
    }

    // Check if we already migrated (look for migration marker)
    const migrationMarker = path.join(this.newAppDataPath, '.migration-complete')
    if (fs.existsSync(migrationMarker)) {
      console.log('Migration already completed')
      return false
    }

    return true
  }

  /**
   * Create backup of existing data before migration
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(this.backupPath, `backup-${timestamp}`)
    
    await fs.ensureDir(backupDir)

    // Backup old app data
    if (this.oldAppDataPath && fs.existsSync(this.oldAppDataPath)) {
      await fs.copy(this.oldAppDataPath, path.join(backupDir, 'old-app-data'))
    }

    // Backup new app data (if any exists)
    if (fs.existsSync(this.newAppDataPath)) {
      await fs.copy(this.newAppDataPath, path.join(backupDir, 'new-app-data'))
    }

    console.log(`Backup created at: ${backupDir}`)
    return backupDir
  }

  /**
   * Migrate settings from old format to new format
   */
  private migrateSettings(oldSettings: OldAppSettings): any {
    const newSettings: any = {}

    // Map old setting names to new ones
    const settingMap: Record<string, string> = {
      ingestPath: 'ingestPath',
      autoIngest: 'autoIngest',
      theme: 'theme',
      sortBy: 'sortPreference',
      cameraIp: 'defaultCameraIp',
      thumbnailPath: 'thumbnailCachePath',
      cameraPath: 'defaultCameraPath',
    }

    // Migrate mapped settings
    for (const [oldKey, newKey] of Object.entries(settingMap)) {
      if (oldSettings[oldKey] !== undefined) {
        newSettings[newKey] = oldSettings[oldKey]
      }
    }

    // Set defaults for missing settings
    const defaults = {
      theme: 'dark',
      autoIngest: false,
      sortPreference: 'date-desc',
      defaultCameraIp: '10.98.32.1',
      defaultCameraPath: '/DCIM/',
    }

    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (newSettings[key] === undefined) {
        newSettings[key] = defaultValue
      }
    }

    return newSettings
  }

  /**
   * Migrate thumbnail cache
   */
  private async migrateThumbnails(oldThumbnails: Record<string, string>): Promise<void> {
    if (!oldThumbnails || Object.keys(oldThumbnails).length === 0) {
      return
    }

    const newThumbnailDir = path.join(this.newAppDataPath, 'thumbnails')
    await fs.ensureDir(newThumbnailDir)

    let migratedCount = 0
    for (const [fileId, thumbnailPath] of Object.entries(oldThumbnails)) {
      try {
        if (fs.existsSync(thumbnailPath)) {
          const fileName = `${fileId}.jpg`
          const newPath = path.join(newThumbnailDir, fileName)
          await fs.copy(thumbnailPath, newPath)
          migratedCount++
        }
      } catch (error) {
        console.warn(`Failed to migrate thumbnail ${fileId}:`, error)
      }
    }

    console.log(`Migrated ${migratedCount} thumbnails`)
  }

  /**
   * Migrate download history
   */
  private async migrateDownloadHistory(downloadHistory: Array<any>): Promise<void> {
    if (!downloadHistory || downloadHistory.length === 0) {
      return
    }

    const historyFile = path.join(this.newAppDataPath, 'download-history.json')
    const newHistory = {
      version: '2.0.0',
      migratedAt: new Date().toISOString(),
      downloads: downloadHistory.map(download => ({
        id: `${download.fileName}-${download.timestamp}`,
        fileName: download.fileName,
        destination: download.downloadPath,
        size: download.size,
        timestamp: download.timestamp,
        status: 'completed',
        migrated: true,
      }))
    }

    await fs.writeJson(historyFile, newHistory, { spaces: 2 })
    console.log(`Migrated ${downloadHistory.length} download records`)
  }

  /**
   * Perform the complete migration
   */
  async performMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedItems: 0,
      errors: [],
      warnings: [],
    }

    try {
      console.log('Starting migration process...')

      // Create backup first
      result.backupPath = await this.createBackup()

      // Load old app data
      const oldData = await this.loadOldAppData()
      if (!oldData) {
        result.warnings.push('No old app data found to migrate')
        result.success = true
        return result
      }

      // Migrate settings
      if (oldData.settings) {
        const newSettings = this.migrateSettings(oldData.settings)
        const settingsFile = path.join(this.newAppDataPath, 'settings.json')
        await fs.writeJson(settingsFile, newSettings, { spaces: 2 })
        result.migratedItems++
        console.log('Settings migrated successfully')
      }

      // Migrate thumbnails
      if (oldData.thumbnails) {
        await this.migrateThumbnails(oldData.thumbnails)
        result.migratedItems++
      }

      // Migrate download history
      if (oldData.downloadHistory) {
        await this.migrateDownloadHistory(oldData.downloadHistory)
        result.migratedItems++
      }

      // Create migration marker
      const migrationMarker = path.join(this.newAppDataPath, '.migration-complete')
      await fs.writeFile(migrationMarker, JSON.stringify({
        version: '2.0.0',
        migratedAt: new Date().toISOString(),
        sourcePath: this.oldAppDataPath,
        backupPath: result.backupPath,
      }, null, 2))

      result.success = true
      console.log(`Migration completed successfully. Migrated ${result.migratedItems} data types.`)

    } catch (error) {
      result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('Migration failed:', error)
    }

    return result
  }

  /**
   * Load old app data from various possible locations
   */
  private async loadOldAppData(): Promise<OldAppData | null> {
    if (!this.oldAppDataPath || !fs.existsSync(this.oldAppDataPath)) {
      return null
    }

    const data: OldAppData = {}

    try {
      // Try to load settings from various possible files
      const possibleSettingsFiles = [
        'settings.json',
        'config.json',
        'preferences.json',
        'store.json',
        'user-settings.json',
      ]

      for (const fileName of possibleSettingsFiles) {
        const filePath = path.join(this.oldAppDataPath, fileName)
        if (fs.existsSync(filePath)) {
          data.settings = await fs.readJson(filePath)
          console.log(`Loaded settings from: ${fileName}`)
          break
        }
      }

      // Try to load thumbnails data
      const thumbnailsFile = path.join(this.oldAppDataPath, 'thumbnails.json')
      if (fs.existsSync(thumbnailsFile)) {
        data.thumbnails = await fs.readJson(thumbnailsFile)
      }

      // Try to load download history
      const historyFile = path.join(this.oldAppDataPath, 'download-history.json')
      if (fs.existsSync(historyFile)) {
        data.downloadHistory = await fs.readJson(historyFile)
      }

      // Try to load cache data
      const cacheFile = path.join(this.oldAppDataPath, 'cache.json')
      if (fs.existsSync(cacheFile)) {
        data.cache = await fs.readJson(cacheFile)
      }

      return Object.keys(data).length > 0 ? data : null

    } catch (error) {
      console.warn('Failed to load old app data:', error)
      return null
    }
  }

  /**
   * Validate migrated data
   */
  async validateMigration(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = []

    try {
      // Check if settings file exists and is valid
      const settingsFile = path.join(this.newAppDataPath, 'settings.json')
      if (!fs.existsSync(settingsFile)) {
        issues.push('Settings file not found after migration')
      } else {
        const settings = await fs.readJson(settingsFile)
        if (!settings || typeof settings !== 'object') {
          issues.push('Settings file is invalid')
        }
      }

      // Check if migration marker exists
      const migrationMarker = path.join(this.newAppDataPath, '.migration-complete')
      if (!fs.existsSync(migrationMarker)) {
        issues.push('Migration marker not found')
      }

      return {
        valid: issues.length === 0,
        issues,
      }

    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { valid: false, issues }
    }
  }

  /**
   * Rollback migration (restore from backup)
   */
  async rollbackMigration(backupPath: string): Promise<boolean> {
    try {
      console.log(`Rolling back migration from backup: ${backupPath}`)

      // Remove migration marker
      const migrationMarker = path.join(this.newAppDataPath, '.migration-complete')
      if (fs.existsSync(migrationMarker)) {
        await fs.remove(migrationMarker)
      }

      // Restore new app data from backup
      const newAppBackup = path.join(backupPath, 'new-app-data')
      if (fs.existsSync(newAppBackup)) {
        await fs.remove(this.newAppDataPath)
        await fs.copy(newAppBackup, this.newAppDataPath)
      }

      console.log('Migration rollback completed successfully')
      return true

    } catch (error) {
      console.error('Migration rollback failed:', error)
      return false
    }
  }

  /**
   * Get migration status and information
   */
  async getMigrationStatus(): Promise<{
    needed: boolean
    completed: boolean
    oldDataPath?: string
    backupPath?: string
    migratedAt?: string
  }> {
    const needed = await this.isMigrationNeeded()
    const migrationMarker = path.join(this.newAppDataPath, '.migration-complete')
    const completed = fs.existsSync(migrationMarker)

    let migratedAt: string | undefined
    if (completed) {
      try {
        const markerData = await fs.readJson(migrationMarker)
        migratedAt = markerData.migratedAt
      } catch (error) {
        console.warn('Failed to read migration marker:', error)
      }
    }

    return {
      needed,
      completed,
      oldDataPath: this.oldAppDataPath || undefined,
      migratedAt,
    }
  }
}

/**
 * Migration utility functions
 */
export const MigrationUtils = {
  /**
   * Check if this is the first run after migration
   */
  isFirstRunAfterMigration(): boolean {
    const migrationMarker = path.join(app.getPath('userData'), '.migration-complete')
    return fs.existsSync(migrationMarker)
  },

  /**
   * Get migration info for display to user
   */
  async getMigrationInfo(): Promise<{
    hasOldData: boolean
    canMigrate: boolean
    estimatedItems: number
  }> {
    const migrationService = new MigrationService()
    const needed = await migrationService.isMigrationNeeded()
    
    if (!needed) {
      return {
        hasOldData: false,
        canMigrate: false,
        estimatedItems: 0,
      }
    }

    // Estimate number of items to migrate
    let estimatedItems = 0
    try {
      const oldData = await (migrationService as any).loadOldAppData()
      if (oldData) {
        if (oldData.settings) estimatedItems++
        if (oldData.thumbnails) estimatedItems += Object.keys(oldData.thumbnails).length
        if (oldData.downloadHistory) estimatedItems += oldData.downloadHistory.length
      }
    } catch (error) {
      console.warn('Failed to estimate migration items:', error)
    }

    return {
      hasOldData: true,
      canMigrate: true,
      estimatedItems,
    }
  },

  /**
   * Clean up old app data after successful migration
   */
  async cleanupOldData(): Promise<boolean> {
    try {
      const migrationService = new MigrationService()
      const status = await migrationService.getMigrationStatus()
      
      if (status.completed && status.oldDataPath) {
        // Move old data to backup instead of deleting
        const backupDir = path.join(app.getPath('userData'), 'old-app-backup')
        await fs.move(status.oldDataPath, backupDir)
        console.log(`Old app data moved to backup: ${backupDir}`)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to cleanup old data:', error)
      return false
    }
  },
}

