import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRenderPerformance, useMemoryMonitor } from '../../hooks/usePerformance'
import { GalleryItem } from '@/shared/types'
import styles from './OptimizedGalleryItem.module.css'

interface OptimizedGalleryItemProps {
  item: GalleryItem
  onNavigate: (path: string) => void
  onPreview: (item: GalleryItem) => void
  getThumbnail: (filePath: string) => string | null
  startDownload: (item: GalleryItem, destinationPath: string) => void
  getTransferProgress: (fileId: string) => any
  ingestPath: string
  isVisible?: boolean
}

/**
 * Highly optimized gallery item component with performance monitoring
 * 
 * Performance optimizations:
 * - React.memo with custom comparison
 * - Memoized calculations and callbacks
 * - Lazy thumbnail loading with intersection observer
 * - Optimized event handlers
 * - Memory usage tracking
 * - Render performance monitoring
 */
export const OptimizedGalleryItem = memo<OptimizedGalleryItemProps>(({
  item,
  onNavigate,
  onPreview,
  getThumbnail,
  startDownload,
  getTransferProgress,
  ingestPath,
  isVisible = true,
}) => {
  const { renderCount, trackRender } = useRenderPerformance('OptimizedGalleryItem')
  const { getCurrentMemory } = useMemoryMonitor('OptimizedGalleryItem')
  const thumbnailRef = useRef<HTMLImageElement>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)

  // Memoized thumbnail URL
  const thumbnailUrl = useMemo(() => {
    trackRender('thumbnail-calculation')
    if (!isVisible || item.type !== 'file') return null
    return getThumbnail(item.path)
  }, [item.path, item.type, isVisible, getThumbnail, trackRender])

  // Memoized file size formatting
  const formattedSize = useMemo(() => {
    trackRender('size-calculation')
    if (!item.size || item.type === 'folder') return null
    return formatBytes(item.size)
  }, [item.size, item.type, trackRender])

  // Memoized transfer progress
  const transferProgress = useMemo(() => {
    trackRender('transfer-progress-calculation')
    return getTransferProgress(item.id)
  }, [item.id, getTransferProgress, trackRender])

  // Memoized file type icon
  const fileIcon = useMemo(() => {
    trackRender('icon-calculation')
    if (item.type === 'folder') return '📁'
    if (item.fileType === 'video') return '📹'
    if (item.fileType === 'image') return '📸'
    return '📄'
  }, [item.type, item.fileType, trackRender])

  // Optimized event handlers with useCallback
  const handleClick = useCallback((e: React.MouseEvent) => {
    trackRender('click-handler')
    e.preventDefault()
    e.stopPropagation()
    
    if (item.type === 'folder') {
      onNavigate(item.path)
    } else {
      onPreview(item)
    }
  }, [item, onNavigate, onPreview, trackRender])

  const handleDownload = useCallback((e: React.MouseEvent) => {
    trackRender('download-handler')
    e.preventDefault()
    e.stopPropagation()
    startDownload(item, ingestPath)
  }, [item, startDownload, ingestPath, trackRender])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    trackRender('keyboard-handler')
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e as any)
    }
  }, [handleClick, trackRender])

  // Intersection observer for lazy thumbnail loading
  useEffect(() => {
    if (!thumbnailRef.current || !isVisible) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && thumbnailUrl && thumbnailRef.current) {
            thumbnailRef.current.src = thumbnailUrl
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '50px' }
    )

    intersectionObserverRef.current = observer
    observer.observe(thumbnailRef.current)

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect()
      }
    }
  }, [isVisible, thumbnailUrl])

  // Performance monitoring
  useEffect(() => {
    if (renderCount % 50 === 0) { // Log every 50 renders
      console.log(`OptimizedGalleryItem ${item.name}: render ${renderCount}, memory: ${getCurrentMemory().toFixed(1)}MB`)
    }
  }, [renderCount, item.name, getCurrentMemory])

  // Don't render if not visible (for virtual scrolling)
  if (!isVisible) {
    return <div className={styles.placeholder} />
  }

  return (
    <div 
      className={`${styles.galleryItem} ${item.type === 'folder' ? styles.folder : styles.file}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${item.type === 'folder' ? 'Open folder' : 'Preview file'}: ${item.name}`}
    >
      {/* Thumbnail */}
      <div className={styles.thumbnailContainer}>
        {item.type === 'file' && (
          <img
            ref={thumbnailRef}
            className={styles.thumbnail}
            alt={`Thumbnail for ${item.name}`}
            loading="lazy"
            onError={(e) => {
              // Fallback to icon if thumbnail fails to load
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              target.parentElement?.querySelector('.fallback-icon')?.classList.remove(styles.hidden)
            }}
          />
        )}
        <div className={`${styles.fallbackIcon} ${thumbnailUrl ? styles.hidden : ''}`}>
          {fileIcon}
        </div>
        
        {/* Download progress overlay */}
        {transferProgress && transferProgress.status === 'downloading' && (
          <div className={styles.progressOverlay}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${transferProgress.progress}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {transferProgress.progress}%
            </span>
          </div>
        )}
        
        {/* Download button */}
        {item.type === 'file' && !transferProgress && (
          <button
            className={styles.downloadButton}
            onClick={handleDownload}
            aria-label={`Download ${item.name}`}
            title={`Download to ${ingestPath}`}
          >
            📥
          </button>
        )}
      </div>

      {/* File info */}
      <div className={styles.fileInfo}>
        <h3 className={styles.fileName} title={item.name}>
          {item.name}
        </h3>
        <div className={styles.fileDetails}>
          {formattedSize && (
            <span className={styles.fileSize}>{formattedSize}</span>
          )}
          {item.date && (
            <span className={styles.fileDate}>
              {new Date(item.date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Status indicators */}
      <div className={styles.statusIndicators}>
        {transferProgress?.status === 'completed' && (
          <span className={styles.completedIndicator} title="Download completed">
            ✅
          </span>
        )}
        {transferProgress?.status === 'failed' && (
          <span className={styles.errorIndicator} title={`Download failed: ${transferProgress.error}`}>
            ❌
          </span>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.size === nextProps.item.size &&
    prevProps.item.date === nextProps.item.date &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.ingestPath === nextProps.ingestPath &&
    // Deep compare transfer progress
    JSON.stringify(prevProps.getTransferProgress(prevProps.item.id)) === 
    JSON.stringify(nextProps.getTransferProgress(nextProps.item.id))
  )
})

OptimizedGalleryItem.displayName = 'OptimizedGalleryItem'

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
