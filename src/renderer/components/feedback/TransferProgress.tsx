import React, { useState } from 'react'
import { useTransferProgress } from '../../stores/TransferContext'
import styles from './TransferProgress.module.css'

/**
 * TransferProgress - Global transfer progress indicator
 * Shows download progress and queue status
 */
export function TransferProgress() {
  const { activeTransfers, completedTransfers, queuedTransfers } = useTransferProgress()
  const [isExpanded, setIsExpanded] = useState(false)

  const totalActive = activeTransfers.length
  const totalQueued = queuedTransfers.length
  const totalCompleted = completedTransfers.length

  // Don't show if no transfers
  if (totalActive === 0 && totalQueued === 0) {
    return null
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={styles.transferProgress}>
      <button
        className={`${styles.progressButton} ${isExpanded ? styles.expanded : ''}`}
        onClick={handleToggle}
        aria-label="View transfer progress"
        aria-expanded={isExpanded}
      >
        <span className={styles.icon}>📥</span>
        <span className={styles.summary}>
          {totalActive > 0 && `${totalActive} downloading`}
          {totalActive > 0 && totalQueued > 0 && ', '}
          {totalQueued > 0 && `${totalQueued} queued`}
        </span>
        <span className={styles.expandIcon}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className={styles.progressDetails}>
          {activeTransfers.map((transfer) => (
            <div key={transfer.fileId} className={styles.transferItem}>
              <div className={styles.transferInfo}>
                <span className={styles.fileName}>{transfer.fileName}</span>
                <span className={styles.transferStatus}>{transfer.status}</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${transfer.progress}%` }}
                />
              </div>
              <div className={styles.transferStats}>
                <span>{transfer.progress}%</span>
                <span>{formatBytes(transfer.bytesReceived)} / {formatBytes(transfer.totalBytes)}</span>
                {transfer.speed > 0 && (
                  <span>{formatBytes(transfer.speed)}/s</span>
                )}
              </div>
            </div>
          ))}
          
          {queuedTransfers.length > 0 && (
            <div className={styles.queuedSection}>
              <div className={styles.queuedHeader}>
                Queued ({queuedTransfers.length})
              </div>
              {queuedTransfers.slice(0, 3).map((fileId) => (
                <div key={fileId} className={styles.queuedItem}>
                  {fileId.split('/').pop()}
                </div>
              ))}
              {queuedTransfers.length > 3 && (
                <div className={styles.moreFiles}>
                  +{queuedTransfers.length - 3} more files
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
