import React, { useEffect, useRef } from 'react'
import { useTransfer } from '../../stores/TransferContext'
import type { GalleryItem } from '@/shared/types'
import styles from './PreviewModal.module.css'

/**
 * PreviewModal - Full-screen media preview
 * Displays videos, images, and other media files
 */
interface PreviewModalProps {
  item: GalleryItem | null
  isOpen: boolean
  onClose: () => void
}

export function PreviewModal({ item, isOpen, onClose }: PreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { downloadFile } = useTransfer()

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle click outside to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === modalRef.current) {
      onClose()
    }
  }

  // Handle download
  const handleDownload = async () => {
    if (!item) return

    try {
      const fileName = item.name
      const destination = `/tmp/downloads/${fileName}` // In real app, use settings
      await downloadFile(item, destination)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  if (!isOpen || !item) {
    return null
  }

  const renderMediaContent = () => {
    if (item.type === 'video') {
      return (
        <video
          className={styles.mediaContent}
          controls
          autoPlay
          muted
          playsInline
        >
          <source src={`http://10.98.32.1${item.path}`} type="video/mp4" />
          <p>Your browser doesn't support video playback.</p>
        </video>
      )
    }

    if (item.type === 'image') {
      return (
        <img
          className={styles.mediaContent}
          src={`http://10.98.32.1${item.path}`}
          alt={item.name}
          onError={(e) => {
            // Fallback to download if direct preview fails
            console.warn('Direct preview failed, downloading...')
            handleDownload()
          }}
        />
      )
    }

    // For other file types, show file info
    return (
      <div className={styles.fileInfo}>
        <div className={styles.fileIcon}>
          {item.type === 'folder' ? '📁' : '📄'}
        </div>
        <h3>{item.name}</h3>
        <p>File type: {item.type}</p>
        <p>Size: {formatFileSize(item.size)}</p>
        <button className={styles.downloadButton} onClick={handleDownload}>
          Download File
        </button>
      </div>
    )
  }

  return (
    <div
      ref={modalRef}
      className={styles.modal}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 id="preview-title" className={styles.modalTitle}>
            {item.name}
          </h2>
          <div className={styles.modalActions}>
            <button
              className={styles.actionButton}
              onClick={handleDownload}
              title="Download file"
            >
              📥
            </button>
            <button
              className={styles.actionButton}
              onClick={onClose}
              title="Close preview"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className={styles.modalBody}>
          {renderMediaContent()}
        </div>
      </div>
    </div>
  )
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
