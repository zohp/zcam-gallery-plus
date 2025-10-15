/**
 * IPC handlers for migration functionality
 * 
 * Handles migration operations between old and new app versions
 */

import { ipcMain, app } from 'electron'
import { MigrationService, MigrationUtils } from '../../../utils/migration'

/**
 * Register migration IPC handlers
 */
export function registerMigrationHandlers(): void {
  console.log('Registering migration IPC handlers...')

  // Check if migration is needed
  ipcMain.handle('migration:isNeeded', async () => {
    try {
      const migrationService = new MigrationService()
      const needed = await migrationService.isMigrationNeeded()
      return { success: true, needed }
    } catch (error) {
      console.error('Failed to check migration status:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Get migration information
  ipcMain.handle('migration:getInfo', async () => {
    try {
      const info = await MigrationUtils.getMigrationInfo()
      return { success: true, info }
    } catch (error) {
      console.error('Failed to get migration info:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Perform migration
  ipcMain.handle('migration:perform', async () => {
    try {
      console.log('Starting migration process...')
      const migrationService = new MigrationService()
      const result = await migrationService.performMigration()
      return { success: true, result }
    } catch (error) {
      console.error('Migration failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        result: {
          success: false,
          migratedItems: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
        }
      }
    }
  })

  // Validate migration
  ipcMain.handle('migration:validate', async () => {
    try {
      const migrationService = new MigrationService()
      const validation = await migrationService.validateMigration()
      return { success: true, validation }
    } catch (error) {
      console.error('Migration validation failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        validation: { valid: false, issues: [error instanceof Error ? error.message : 'Unknown error'] }
      }
    }
  })

  // Get migration status
  ipcMain.handle('migration:getStatus', async () => {
    try {
      const migrationService = new MigrationService()
      const status = await migrationService.getMigrationStatus()
      return { success: true, status }
    } catch (error) {
      console.error('Failed to get migration status:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Rollback migration
  ipcMain.handle('migration:rollback', async (event, backupPath: string) => {
    try {
      if (!backupPath) {
        return { success: false, error: 'Backup path is required' }
      }

      const migrationService = new MigrationService()
      const success = await migrationService.rollbackMigration(backupPath)
      return { success, error: success ? undefined : 'Rollback failed' }
    } catch (error) {
      console.error('Migration rollback failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Cleanup old data
  ipcMain.handle('migration:cleanup', async () => {
    try {
      const success = await MigrationUtils.cleanupOldData()
      return { success, error: success ? undefined : 'Cleanup failed' }
    } catch (error) {
      console.error('Old data cleanup failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Check if this is first run after migration
  ipcMain.handle('migration:isFirstRunAfterMigration', async () => {
    try {
      const isFirstRun = MigrationUtils.isFirstRunAfterMigration()
      return { success: true, isFirstRun }
    } catch (error) {
      console.error('Failed to check first run status:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  console.log('Migration IPC handlers registered successfully')
}

/**
 * Cleanup migration handlers
 */
export function cleanupMigrationHandlers(): void {
  console.log('Cleaning up migration IPC handlers...')
  
  const handlers = [
    'migration:isNeeded',
    'migration:getInfo',
    'migration:perform',
    'migration:validate',
    'migration:getStatus',
    'migration:rollback',
    'migration:cleanup',
    'migration:isFirstRunAfterMigration',
  ]

  handlers.forEach(handler => {
    ipcMain.removeHandler(handler)
  })

  console.log('Migration IPC handlers cleaned up successfully')
}
