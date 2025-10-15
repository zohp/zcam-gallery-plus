import React from 'react'
import { useConnection } from '../../stores/ConnectionContext'
import styles from './ConnectionStatus.module.css'

/**
 * ConnectionStatus - Global connection status indicator
 * Shows camera connection state in a non-intrusive way
 */
export function ConnectionStatus() {
  const { status, cameraInfo, error } = useConnection()

  // Don't show status if disconnected and no error
  if (status === 'disconnected' && !error) {
    return null
  }

  const getStatusMessage = () => {
    if (status === 'connected' && cameraInfo) {
      return `Connected to ${cameraInfo.model}`
    }
    if (status === 'connecting') {
      return 'Connecting to camera...'
    }
    if (status === 'error') {
      return error || 'Connection failed'
    }
    return null
  }

  const getStatusType = () => {
    if (status === 'connected') return 'success'
    if (status === 'connecting') return 'info'
    if (status === 'error') return 'error'
    return 'info'
  }

  const message = getStatusMessage()
  if (!message) return null

  return (
    <div className={`${styles.connectionStatus} ${styles[getStatusType()]}`} role="status">
      <span className={styles.icon}>
        {status === 'connected' ? '🟢' : status === 'error' ? '🔴' : '⏳'}
      </span>
      <span className={styles.message}>{message}</span>
    </div>
  )
}
