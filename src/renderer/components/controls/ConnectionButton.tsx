import React, { useState } from 'react'
import { useConnection } from '../../stores/ConnectionContext'
import styles from './ConnectionButton.module.css'

/**
 * ConnectionButton - Connect/disconnect camera with status indicator
 * Provides visual feedback and handles connection state
 */
export function ConnectionButton() {
  const { status, cameraInfo, connect, disconnect, error } = useConnection()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const handleConnect = async () => {
    if (status === 'connected' || isConnecting) return

    setIsConnecting(true)
    try {
      // Use default Z CAM IP - in production, this would be configurable
      const defaultIP = '10.98.32.1'
      await connect(defaultIP)
    } catch (err) {
      console.error('Connection failed:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const getButtonText = () => {
    if (isConnecting) return 'Connecting...'
    if (status === 'connected') return 'Disconnect'
    if (status === 'error') return 'Retry Connection'
    return 'Connect'
  }

  const getStatusIcon = () => {
    if (isConnecting) return '⏳'
    if (status === 'connected') return '🟢'
    if (status === 'error') return '🔴'
    return '⚫'
  }

  const getStatusText = () => {
    if (status === 'connected' && cameraInfo) {
      return `${cameraInfo.model} (${cameraInfo.ip})`
    }
    if (status === 'error') {
      return error || 'Connection failed'
    }
    if (status === 'connecting') {
      return 'Connecting to camera...'
    }
    return 'Not connected'
  }

  return (
    <div className={styles.connectionButton}>
      <button
        className={`${styles.button} ${styles[status]}`}
        onClick={status === 'connected' ? handleDisconnect : handleConnect}
        disabled={isConnecting || status === 'connecting'}
        aria-label={`${getButtonText()} camera`}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        <span className={styles.icon}>{getStatusIcon()}</span>
        <span className={styles.text}>{getButtonText()}</span>
      </button>
      
      {showDetails && (
        <div className={styles.statusTooltip} role="tooltip">
          <div className={styles.statusText}>{getStatusText()}</div>
          {cameraInfo && (
            <div className={styles.cameraDetails}>
              <div>Model: {cameraInfo.model}</div>
              <div>Serial: {cameraInfo.serialNumber}</div>
              {cameraInfo.firmware && <div>Firmware: {cameraInfo.firmware}</div>}
              {cameraInfo.batteryLevel !== null && (
                <div>Battery: {cameraInfo.batteryLevel}%</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
