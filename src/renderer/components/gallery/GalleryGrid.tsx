import React, { useEffect, useState } from 'react'
import { useGallery } from '../../stores/GalleryContext'
import { useConnection } from '../../stores/ConnectionContext'
import { GalleryItem } from './GalleryItem'
import { Breadcrumb } from './Breadcrumb'
import { PreviewModal } from '../preview/PreviewModal'
import type { GalleryItem as GalleryItemType } from '@/shared/types'
import styles from './GalleryGrid.module.css'

/**
 * GalleryGrid - Main gallery display with virtual scrolling
 * Shows camera files in a responsive grid layout
 */
export function GalleryGrid() {
  const { items, loading, currentPath, loadFiles, navigateToPath } = useGallery()
  const { status, isConnected } = useConnection()
  const [previewItem, setPreviewItem] = useState<GalleryItemType | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Auto-load files when connected
  useEffect(() => {
    if (isConnected && currentPath) {
      loadFiles(currentPath)
    }
  }, [isConnected, currentPath, loadFiles])

  const handleNavigate = (path: string) => {
    navigateToPath(path)
  }

  const handlePreview = (item: GalleryItemType) => {
    setPreviewItem(item)
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
    setPreviewItem(null)
  }

  if (loading) {
    return (
      <div className={styles.galleryGrid}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}>⏳</div>
          <p>Loading files...</p>
        </div>
      </div>
    )
  }

  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <div className={styles.galleryGrid}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📷</div>
          <h3>Connect to Camera</h3>
          <p>Click the Connect button in the toolbar to browse camera files</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={styles.galleryGrid}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📁</div>
          <h3>No files found</h3>
          <p>This folder appears to be empty</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.galleryGrid}>
      <div className={styles.pathHeader}>
        <Breadcrumb path={currentPath} onNavigate={handleNavigate} />
        <span className={styles.fileCount}>{items.length} files</span>
      </div>
      
      <div className={styles.grid}>
        {items.map((item) => (
          <GalleryItem
            key={item.id}
            item={item}
            onNavigate={handleNavigate}
            onPreview={handlePreview}
          />
        ))}
      </div>
      
      <PreviewModal
        item={previewItem}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />
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
