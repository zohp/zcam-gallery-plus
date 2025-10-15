import React, { useState } from 'react'
import { useTransfer } from '../../stores/TransferContext'
import { useThumbnailCache } from '../../stores/GalleryContext'
import type { GalleryItem as GalleryItemType } from '@/shared/types'
import styles from './GalleryItem.module.css'

/**
 * GalleryItem - Individual file/folder display with actions
 * Handles thumbnail loading, download actions, and navigation
 */
interface GalleryItemProps {
  item: GalleryItemType
  onNavigate?: (path: string) => void
  onPreview?: (item: GalleryItemType) => void
}

export function GalleryItem({ item, onNavigate, onPreview }: GalleryItemProps) {
  const { downloadFile, getTransferProgress } = useTransfer()
  const { getThumbnail } = useThumbnailCache()
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [thumbnailLoading, setThumbnailLoading] = useState(false)

  const transferProgress = getTransferProgress(item.id)

  // Load thumbnail when component mounts
  React.useEffect(() => {
    if (item.type !== 'folder') {
      setThumbnailLoading(true)
      getThumbnail(item)
        .then(setThumbnail)
        .catch((error) => {
          console.warn('Failed to load thumbnail:', error)
          setThumbnail(null)
        })
        .finally(() => setThumbnailLoading(false))
    }
  }, [item, getThumbnail])

  const handleClick = () => {
    if (item.type === 'folder') {
      onNavigate?.(item.path)
    } else {
      onPreview?.(item)
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Generate destination path based on ingest settings
      const fileName = item.name
      const destination = `/tmp/downloads/${fileName}` // In real app, use settings
      
      await downloadFile(item, destination)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const getFileIcon = () => {
    if (item.type === 'folder') return '📁'
    if (item.type === 'video') return '🎥'
    if (item.type === 'image') return '🖼️'
    return '📄'
  }

  const getFileSize = () => {
    if (item.type === 'folder') return null
    
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }
    
    return formatBytes(item.size)
  }

  const getDownloadButtonText = () => {
    if (transferProgress) {
      switch (transferProgress.status) {
        case 'downloading':
          return `${transferProgress.progress}%`
        case 'completed':
          return '✓'
        case 'failed':
          return '⚠️'
        case 'paused':
          return '⏸️'
        default:
          return 'Download'
      }
    }
    return 'Download'
  }

  return (
    <div className={styles.galleryItem} onClick={handleClick}>
      <div className={styles.thumbnail}>
        {item.type === 'folder' ? (
          <div className={styles.folderThumbnail}>
            <span className={styles.fileIcon}>{getFileIcon()}</span>
          </div>
        ) : (
          <div className={styles.mediaThumbnail}>
            {thumbnailLoading ? (
              <div className={styles.loadingSpinner}>⏳</div>
            ) : thumbnail ? (
              <img 
                src={thumbnail} 
                alt={item.name}
                className={styles.thumbnailImage}
                onError={() => setThumbnail(null)}
              />
            ) : (
              <div className={styles.fallbackThumbnail}>
                <span className={styles.fileIcon}>{getFileIcon()}</span>
              </div>
            )}
            
            {transferProgress && (
              <div className={styles.progressOverlay}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${transferProgress.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.itemInfo}>
        <div className={styles.fileName} title={item.name}>
          {item.name}
        </div>
        <div className={styles.fileMeta}>
          {getFileSize() && (
            <span className={styles.fileSize}>{getFileSize()}</span>
          )}
          {item.isIngested && (
            <span className={styles.ingestedBadge}>✓ Ingested</span>
          )}
        </div>
      </div>
      
      {item.type !== 'folder' && (
        <button
          className={styles.downloadButton}
          onClick={handleDownload}
          disabled={transferProgress?.status === 'downloading'}
          title="Download file"
        >
          {getDownloadButtonText()}
        </button>
      )}
    </div>
  )
}
