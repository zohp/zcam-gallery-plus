#!/usr/bin/env node

/**
 * Manual migration script for ZCAM Gallery Plus
 * 
 * This script can be run manually to migrate data from the old ZCAM Gallery
 * to the new ZCAM Gallery Plus application.
 * 
 * Usage:
 *   node scripts/migrate.js [options]
 * 
 * Options:
 *   --help, -h          Show this help message
 *   --dry-run          Show what would be migrated without making changes
 *   --backup-only      Create backup without migrating
 *   --validate-only    Validate existing migration
 *   --rollback         Rollback to previous version
 *   --cleanup          Clean up old data after successful migration
 */

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function error(message) {
  log(`❌ ${message}`, 'red')
}

function success(message) {
  log(`✅ ${message}`, 'green')
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// Get platform-specific paths
function getAppDataPaths() {
  const platform = process.platform
  const homeDir = process.env.HOME || process.env.USERPROFILE

  const paths = {
    oldApp: '',
    newApp: '',
    backup: '',
  }

  switch (platform) {
    case 'darwin': // macOS
      paths.oldApp = path.join(homeDir, 'Library', 'Application Support', 'ZCAM Gallery')
      paths.newApp = path.join(homeDir, 'Library', 'Application Support', 'ZCAM Gallery Plus')
      paths.backup = path.join(paths.newApp, 'migration-backup')
      break
    case 'win32': // Windows
      paths.oldApp = path.join(process.env.APPDATA, 'ZCAM Gallery')
      paths.newApp = path.join(process.env.APPDATA, 'ZCAM Gallery Plus')
      paths.backup = path.join(paths.newApp, 'migration-backup')
      break
    case 'linux': // Linux
      paths.oldApp = path.join(homeDir, '.config', 'zcam-gallery')
      paths.newApp = path.join(homeDir, '.config', 'zcam-gallery-plus')
      paths.backup = path.join(paths.newApp, 'migration-backup')
      break
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }

  return paths
}

// Detect old app data
async function detectOldAppData() {
  const paths = getAppDataPaths()
  const possiblePaths = [
    paths.oldApp,
    path.join(path.dirname(paths.oldApp), 'zcam-gallery'),
    path.join(path.dirname(paths.oldApp), 'ZCAM Gallery'),
    path.join(path.dirname(paths.oldApp), 'zcam-gallery-plus'),
    path.join(process.env.HOME, 'Documents', 'ZCAM Gallery'),
    path.join(process.env.HOME, '.zcam-gallery'),
  ]

  for (const possiblePath of possiblePaths) {
    if (await fs.pathExists(possiblePath)) {
      log(`Found old app data at: ${possiblePath}`, 'green')
      return possiblePath
    }
  }

  return null
}

// Analyze old app data
async function analyzeOldAppData(oldAppPath) {
  const analysis = {
    settings: null,
    thumbnails: null,
    downloadHistory: null,
    cache: null,
    totalSize: 0,
    fileCount: 0,
  }

  try {
    // Check for settings files
    const settingsFiles = [
      'settings.json',
      'config.json',
      'preferences.json',
      'store.json',
      'user-settings.json',
    ]

    for (const fileName of settingsFiles) {
      const filePath = path.join(oldAppPath, fileName)
      if (await fs.pathExists(filePath)) {
        analysis.settings = filePath
        break
      }
    }

    // Check for thumbnails
    const thumbnailsPath = path.join(oldAppPath, 'thumbnails')
    if (await fs.pathExists(thumbnailsPath)) {
      const stats = await fs.stat(thumbnailsPath)
      analysis.thumbnails = thumbnailsPath
      analysis.totalSize += stats.size
      analysis.fileCount += 1
    }

    // Check for download history
    const historyPath = path.join(oldAppPath, 'download-history.json')
    if (await fs.pathExists(historyPath)) {
      analysis.downloadHistory = historyPath
    }

    // Check for cache
    const cachePath = path.join(oldAppPath, 'cache.json')
    if (await fs.pathExists(cachePath)) {
      analysis.cache = cachePath
    }

    // Calculate total size
    const allFiles = await fs.readdir(oldAppPath)
    for (const file of allFiles) {
      const filePath = path.join(oldAppPath, file)
      const stats = await fs.stat(filePath)
      if (stats.isFile()) {
        analysis.totalSize += stats.size
        analysis.fileCount += 1
      }
    }

  } catch (error) {
    warning(`Failed to analyze old app data: ${error.message}`)
  }

  return analysis
}

// Create backup
async function createBackup(oldAppPath, backupPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(backupPath, `backup-${timestamp}`)

  await fs.ensureDir(backupDir)
  await fs.copy(oldAppPath, path.join(backupDir, 'old-app-data'))

  log(`Backup created at: ${backupDir}`, 'green')
  return backupDir
}

// Migrate settings
async function migrateSettings(oldSettingsPath, newAppPath) {
  if (!oldSettingsPath) {
    warning('No settings file found to migrate')
    return false
  }

  try {
    const oldSettings = await fs.readJson(oldSettingsPath)
    
    // Map old settings to new format
    const newSettings = {
      version: '2.0.0',
      migratedAt: new Date().toISOString(),
      ingestPath: oldSettings.ingestPath || '',
      autoIngest: oldSettings.autoIngest || false,
      theme: oldSettings.theme || 'dark',
      sortPreference: oldSettings.sortBy || 'date-desc',
      defaultCameraIp: oldSettings.cameraIp || '10.98.32.1',
      defaultCameraPath: oldSettings.cameraPath || '/DCIM/',
    }

    const settingsFile = path.join(newAppPath, 'settings.json')
    await fs.writeJson(settingsFile, newSettings, { spaces: 2 })

    success(`Settings migrated successfully`)
    return true
  } catch (error) {
    error(`Failed to migrate settings: ${error.message}`)
    return false
  }
}

// Migrate thumbnails
async function migrateThumbnails(oldThumbnailsPath, newAppPath) {
  if (!oldThumbnailsPath) {
    warning('No thumbnail cache found to migrate')
    return false
  }

  try {
    const newThumbnailsPath = path.join(newAppPath, 'thumbnails')
    await fs.ensureDir(newThumbnailsPath)
    await fs.copy(oldThumbnailsPath, newThumbnailsPath)

    const files = await fs.readdir(newThumbnailsPath)
    success(`Migrated ${files.length} thumbnails`)
    return true
  } catch (error) {
    error(`Failed to migrate thumbnails: ${error.message}`)
    return false
  }
}

// Migrate download history
async function migrateDownloadHistory(oldHistoryPath, newAppPath) {
  if (!oldHistoryPath) {
    warning('No download history found to migrate')
    return false
  }

  try {
    const oldHistory = await fs.readJson(oldHistoryPath)
    
    const newHistory = {
      version: '2.0.0',
      migratedAt: new Date().toISOString(),
      downloads: Array.isArray(oldHistory) ? oldHistory.map(download => ({
        id: `${download.fileName}-${download.timestamp}`,
        fileName: download.fileName,
        destination: download.downloadPath,
        size: download.size,
        timestamp: download.timestamp,
        status: 'completed',
        migrated: true,
      })) : [],
    }

    const historyFile = path.join(newAppPath, 'download-history.json')
    await fs.writeJson(historyFile, newHistory, { spaces: 2 })

    success(`Migrated ${newHistory.downloads.length} download records`)
    return true
  } catch (error) {
    error(`Failed to migrate download history: ${error.message}`)
    return false
  }
}

// Validate migration
async function validateMigration(newAppPath) {
  const issues = []

  // Check settings file
  const settingsFile = path.join(newAppPath, 'settings.json')
  if (!(await fs.pathExists(settingsFile))) {
    issues.push('Settings file not found')
  } else {
    try {
      const settings = await fs.readJson(settingsFile)
      if (!settings.version || settings.version !== '2.0.0') {
        issues.push('Invalid settings version')
      }
    } catch (error) {
      issues.push('Settings file is corrupted')
    }
  }

  // Check migration marker
  const migrationMarker = path.join(newAppPath, '.migration-complete')
  if (!(await fs.pathExists(migrationMarker))) {
    issues.push('Migration marker not found')
  }

  return issues
}

// Main migration function
async function performMigration(dryRun = false) {
  log('\n🚀 ZCAM Gallery Plus - Manual Migration Tool', 'cyan')
  log('============================================', 'cyan')

  try {
    // Detect old app data
    info('Detecting old app data...')
    const oldAppPath = await detectOldAppData()
    
    if (!oldAppPath) {
      warning('No old app data found. Nothing to migrate.')
      return
    }

    // Analyze old app data
    info('Analyzing old app data...')
    const analysis = await analyzeOldAppData(oldAppPath)
    
    log('\n📊 Migration Analysis:', 'magenta')
    log(`Old app data path: ${oldAppPath}`)
    log(`Total size: ${(analysis.totalSize / 1024 / 1024).toFixed(1)} MB`)
    log(`File count: ${analysis.fileCount}`)
    log(`Settings: ${analysis.settings ? 'Found' : 'Not found'}`)
    log(`Thumbnails: ${analysis.thumbnails ? 'Found' : 'Not found'}`)
    log(`Download history: ${analysis.downloadHistory ? 'Found' : 'Not found'}`)

    if (dryRun) {
      log('\n🔍 Dry run complete. No changes made.', 'yellow')
      return
    }

    // Get new app paths
    const paths = getAppDataPaths()
    await fs.ensureDir(paths.newApp)

    // Create backup
    info('\nCreating backup...')
    const backupPath = await createBackup(oldAppPath, paths.backup)

    // Perform migration
    info('\nMigrating data...')
    let migratedItems = 0

    if (await migrateSettings(analysis.settings, paths.newApp)) {
      migratedItems++
    }

    if (await migrateThumbnails(analysis.thumbnails, paths.newApp)) {
      migratedItems++
    }

    if (await migrateDownloadHistory(analysis.downloadHistory, paths.newApp)) {
      migratedItems++
    }

    // Create migration marker
    const migrationMarker = {
      version: '2.0.0',
      migratedAt: new Date().toISOString(),
      sourcePath: oldAppPath,
      backupPath: backupPath,
      migratedItems: migratedItems,
    }

    const markerFile = path.join(paths.newApp, '.migration-complete')
    await fs.writeJson(markerFile, migrationMarker, { spaces: 2 })

    // Validate migration
    info('\nValidating migration...')
    const issues = await validateMigration(paths.newApp)
    
    if (issues.length === 0) {
      success(`Migration completed successfully! Migrated ${migratedItems} data types.`)
      log(`Backup location: ${backupPath}`)
      log('\n🎉 You can now launch ZCAM Gallery Plus!', 'green')
    } else {
      error('Migration validation failed:')
      issues.forEach(issue => error(`  • ${issue}`))
    }

  } catch (error) {
    error(`Migration failed: ${error.message}`)
    process.exit(1)
  }
}

// Show help
function showHelp() {
  log('ZCAM Gallery Plus - Manual Migration Tool', 'cyan')
  log('=========================================', 'cyan')
  log('')
  log('Usage: node scripts/migrate.js [options]', 'bright')
  log('')
  log('Options:', 'bright')
  log('  --help, -h          Show this help message', 'yellow')
  log('  --dry-run          Show what would be migrated without making changes', 'yellow')
  log('  --backup-only      Create backup without migrating', 'yellow')
  log('  --validate-only    Validate existing migration', 'yellow')
  log('  --rollback         Rollback to previous version', 'yellow')
  log('  --cleanup          Clean up old data after successful migration', 'yellow')
  log('')
  log('Examples:', 'bright')
  log('  node scripts/migrate.js', 'green')
  log('  node scripts/migrate.js --dry-run', 'green')
  log('  node scripts/migrate.js --validate-only', 'green')
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    return
  }
  
  if (args.includes('--dry-run')) {
    await performMigration(true)
    return
  }
  
  if (args.includes('--validate-only')) {
    // TODO: Implement validation-only mode
    log('Validation-only mode not yet implemented', 'yellow')
    return
  }
  
  if (args.includes('--rollback')) {
    // TODO: Implement rollback mode
    log('Rollback mode not yet implemented', 'yellow')
    return
  }
  
  if (args.includes('--cleanup')) {
    // TODO: Implement cleanup mode
    log('Cleanup mode not yet implemented', 'yellow')
    return
  }
  
  // Run full migration
  await performMigration()
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  error(`Uncaught Exception: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  error(`Unhandled Rejection: ${reason}`)
  process.exit(1)
})

// Run the main function
main().catch(error => {
  error(`Script failed: ${error.message}`)
  process.exit(1)
})
