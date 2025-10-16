# ZCAM Gallery Plus - Migration Guide

## Overview

This guide explains how to migrate from the old ZCAM Gallery application to the new ZCAM Gallery Plus with zero data loss.

## What Gets Migrated

### Settings & Preferences
- **Ingest Path**: Your configured download folder
- **Auto-Ingest**: Whether automatic downloading was enabled
- **Theme**: Light or dark mode preference
- **Sort Preference**: How files were sorted in the gallery
- **Camera IP**: Default camera connection settings
- **Thumbnail Cache Path**: Location of cached thumbnails

### Data Files
- **Thumbnail Cache**: All generated thumbnails are preserved
- **Download History**: Records of previously downloaded files
- **Cache Data**: Any cached camera information

### File Structure
- **Old App Data**: Located in various possible directories
- **New App Data**: Migrated to the new application data folder
- **Backup**: Complete backup created before migration

## Migration Process

### Automatic Detection
The new app automatically detects if you have existing data from the previous version when you first launch it.

### Migration Wizard
If old data is found, you'll see a migration wizard that guides you through:

1. **Data Detection**: Scans for existing settings and data
2. **Backup Creation**: Creates a complete backup for safety
3. **Migration**: Transfers your data to the new format
4. **Validation**: Verifies that everything was migrated correctly
5. **Completion**: Confirms successful migration

### Manual Migration (Advanced)

If automatic migration doesn't work, you can manually migrate:

#### 1. Export Settings from Old App
```bash
# Find your old app data directory
# Common locations:
# - macOS: ~/Library/Application Support/ZCAM Gallery
# - Windows: %APPDATA%/ZCAM Gallery
# - Linux: ~/.config/zcam-gallery

# Copy settings file
cp "old-app-data/settings.json" "new-app-data/settings.json"
```

#### 2. Migrate Thumbnail Cache
```bash
# Copy thumbnail cache
cp -r "old-app-data/thumbnails" "new-app-data/thumbnails"
```

#### 3. Update Settings Format
The new app uses a different settings format. Update your settings file:

```json
{
  "version": "2.0.0",
  "ingestPath": "/path/to/your/downloads",
  "autoIngest": true,
  "theme": "dark",
  "sortPreference": "date-desc",
  "defaultCameraIp": "10.98.32.1",
  "defaultCameraPath": "/DCIM/"
}
```

## Troubleshooting

### Migration Failed
If migration fails:

1. **Check Logs**: Look in the app's console for error messages
2. **Try Rollback**: Use the rollback option in the migration wizard
3. **Manual Migration**: Follow the manual migration steps above
4. **Fresh Start**: Skip migration and start with default settings

### Missing Data
If some data appears to be missing after migration:

1. **Check Backup**: Look in the backup directory created during migration
2. **Verify Paths**: Ensure file paths in settings are correct
3. **Re-import**: Manually copy missing files from the backup

### Performance Issues
If the app runs slowly after migration:

1. **Clear Cache**: Use the clear cache option in settings
2. **Restart App**: Close and reopen the application
3. **Check Storage**: Ensure you have enough disk space

## Backup and Recovery

### Automatic Backups
- Migration creates automatic backups before making changes
- Backups are stored in: `~/Library/Application Support/ZCAM Gallery Plus/migration-backup/`
- Each backup is timestamped for easy identification

### Manual Backup
Before starting migration, manually backup your data:

```bash
# Create backup directory
mkdir -p ~/Desktop/zcam-gallery-backup

# Copy old app data
cp -r "old-app-data" ~/Desktop/zcam-gallery-backup/
```

### Recovery from Backup
To restore from a backup:

1. **Stop New App**: Close ZCAM Gallery Plus
2. **Restore Data**: Copy backup files back to original locations
3. **Restart Old App**: Launch the previous version
4. **Retry Migration**: Try the migration process again

## Data Locations

### macOS
- **Old App**: `~/Library/Application Support/ZCAM Gallery`
- **New App**: `~/Library/Application Support/ZCAM Gallery Plus`
- **Backup**: `~/Library/Application Support/ZCAM Gallery Plus/migration-backup`

### Windows
- **Old App**: `%APPDATA%/ZCAM Gallery`
- **New App**: `%APPDATA%/ZCAM Gallery Plus`
- **Backup**: `%APPDATA%/ZCAM Gallery Plus/migration-backup`

### Linux
- **Old App**: `~/.config/zcam-gallery`
- **New App**: `~/.config/zcam-gallery-plus`
- **Backup**: `~/.config/zcam-gallery-plus/migration-backup`

## Post-Migration

### First Launch
After successful migration:

1. **Welcome Screen**: You'll see a welcome message
2. **Settings Check**: Verify your settings are correct
3. **Camera Connection**: Test connecting to your camera
4. **File Browser**: Check that your file browsing works
5. **Download Test**: Try downloading a file to verify ingest path

### Cleanup
After confirming everything works:

1. **Old Data**: The app can automatically clean up old data
2. **Backups**: Keep backups for a few weeks as a safety measure
3. **Old App**: You can uninstall the previous version

## Support

If you encounter issues during migration:

1. **Check Documentation**: Review this guide and other app documentation
2. **Console Logs**: Check browser/Electron console for error messages
3. **File Permissions**: Ensure the app has read/write permissions
4. **Disk Space**: Verify sufficient free disk space for migration
5. **Contact Support**: Reach out with specific error messages and system info

## Migration Checklist

- [ ] Old app data detected automatically
- [ ] Migration wizard launched successfully
- [ ] Backup created before migration
- [ ] Settings migrated correctly
- [ ] Thumbnail cache preserved
- [ ] Download history maintained
- [ ] Migration validation passed
- [ ] New app launches correctly
- [ ] Camera connection works
- [ ] File browsing functional
- [ ] Download/injest path correct
- [ ] Theme preference applied
- [ ] Old data cleaned up (optional)
- [ ] Backup retained for safety

## Version History

- **v1.0.0**: Initial migration support
- **v2.0.0**: Enhanced migration with validation and rollback
- **v2.1.0**: Added automatic cleanup and improved error handling

---

**Note**: This migration process is designed to be safe and reversible. Always keep backups of your data before making any changes.

