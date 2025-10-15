import React from 'react'
import { useIngestSettings } from '../../stores/SettingsContext'
import styles from './AutoIngestToggle.module.css'

/**
 * AutoIngestToggle - Toggle auto-ingest functionality
 * Allows users to enable/disable automatic file downloading
 */
export function AutoIngestToggle() {
  const { autoIngest, setAutoIngest } = useIngestSettings()

  const toggleAutoIngest = () => {
    setAutoIngest(!autoIngest)
  }

  return (
    <button
      className={`${styles.autoIngestToggle} ${autoIngest ? styles.active : ''}`}
      onClick={toggleAutoIngest}
      aria-label={`${autoIngest ? 'Disable' : 'Enable'} auto-ingest`}
      title={`${autoIngest ? 'Disable' : 'Enable'} auto-ingest`}
    >
      <span className={styles.icon}>⚡</span>
      <span className={styles.text}>Auto</span>
    </button>
  )
}
