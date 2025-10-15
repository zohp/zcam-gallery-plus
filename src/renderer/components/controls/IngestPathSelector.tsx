import React from 'react'
import { useIngestSettings } from '../../stores/SettingsContext'
import styles from './IngestPathSelector.module.css'

/**
 * IngestPathSelector - Folder picker for ingest directory
 * Allows users to select where downloaded files should be saved
 */
export function IngestPathSelector() {
  const { ingestPath, setIngestPath } = useIngestSettings()

  const handleSelectPath = async () => {
    try {
      // Use Electron dialog to select folder
      if (window.electronAPI?.dialog?.showOpenDialog) {
        const selectedPath = await window.electronAPI.dialog.showOpenDialog({
          title: 'Select Ingest Folder',
          buttonLabel: 'Select Folder',
        })
        
        if (selectedPath) {
          setIngestPath(selectedPath)
        }
      } else {
        // Fallback for development
        const path = prompt('Enter ingest path:')
        if (path) {
          setIngestPath(path)
        }
      }
    } catch (error) {
      console.error('Failed to select ingest path:', error)
    }
  }

  return (
    <button
      className={styles.ingestPathSelector}
      onClick={handleSelectPath}
      title={ingestPath || 'Select ingest folder'}
      aria-label="Select ingest folder"
    >
      <span className={styles.icon}>📁</span>
      <span className={styles.text}>
        {ingestPath ? 'Ingest: ' + ingestPath.split('/').pop() : 'Select Folder'}
      </span>
    </button>
  )
}
