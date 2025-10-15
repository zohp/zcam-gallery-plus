import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { FixedSizeGrid as Grid } from 'react-window'
import { useRenderPerformance, useMemoryMonitor, useIntersectionObserver } from '../../hooks/usePerformance'
import { GalleryItem } from './GalleryItem'
import { PreviewModal } from '../preview/PreviewModal'
import type { GalleryItem as GalleryItemType } from '@/shared/types'
import styles from './VirtualizedGalleryGrid.module.css'

interface VirtualizedGalleryGridProps {
  items: GalleryItemType[]
  loading: boolean
  currentPath: string
  onNavigate: (path: string) => void
  onPreview: (item: GalleryItemType) => void
  getThumbnail: (filePath: string) => string | null
  startDownload: (item: GalleryItemType, destinationPath: string) => void
  getTransferProgress: (fileId: string) => any
  ingestPath: string
}

interface GridItemProps {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  data: {
    items: GalleryItemType[]
    columnsPerRow: number
    onNavigate: (path: string) => void
    onPreview: (item: GalleryItemType) => void
    getThumbnail: (filePath: string) => string | null
    startDownload: (item: GalleryItemType, destinationPath: string) => void
    getTransferProgress: (fileId: string) => any
    ingestPath: string
  }
}

/**
 * Optimized virtual scrolling grid component for large file lists
 * 
 * Performance optimizations:
 * - Virtual scrolling with react-window for 10,000+ items
 * - Memoized grid calculations and item rendering
 * - Intersection observer for lazy thumbnail loading
 * - Performance monitoring and memory tracking
 * - Adaptive column sizing based on container width
 */
export const VirtualizedGalleryGrid: React.FC<VirtualizedGalleryGridProps> = ({
  items,
  loading,
  currentPath,
  onNavigate,
  onPreview,
  getThumbnail,
  startDownload,
  getTransferProgress,
  ingestPath,
}) => {
  const { renderCount, trackRender } = useRenderPerformance('VirtualizedGalleryGrid')
  const { getCurrentMemory } = useMemoryMonitor('VirtualizedGalleryGrid')
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<Grid>(null)
  
  const [previewItem, setPreviewItem] = React.useState<GalleryItemType | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  // Memoized grid configuration
  const gridConfig = useMemo(() => {
    trackRender('grid-config')
    
    const itemSize = 200 // Fixed item size for consistency
    const padding = 16
    const availableWidth = containerSize.width - (padding * 2)
    const columnsPerRow = Math.max(1, Math.floor(availableWidth / (itemSize + padding)))
    const rowCount = Math.ceil(items.length / columnsPerRow)
    
    return {
      itemSize,
      columnsPerRow,
      rowCount,
      columnWidth: itemSize + padding,
      rowHeight: itemSize + padding + 60, // Extra space for filename
      availableWidth,
    }
  }, [containerSize.width, items.length, trackRender])

  // Intersection observer for visible items
  const intersectionObserver = useIntersectionObserver(
    useCallback((entries) => {
      // Track which items are visible for thumbnail optimization
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index') || '0')
          const item = items[index]
          if (item && item.type === 'file') {
            // Trigger thumbnail loading for visible items
            getThumbnail(item.path)
          }
        }
      })
    }, [items, getThumbnail]),
    { rootMargin: '100px' }, // Start loading 100px before item is visible
    'VirtualizedGalleryGrid'
  )

  // Grid item renderer with performance optimization
  const GridItem = useMemo(() => React.memo<GridItemProps>(({ columnIndex, rowIndex, style, data }) => {
    const { items, columnsPerRow, onNavigate, onPreview, getThumbnail, startDownload, getTransferProgress, ingestPath } = data
    const index = rowIndex * columnsPerRow + columnIndex
    const item = items[index]

    if (!item) {
      return <div style={style} />
    }

    return (
      <div style={style} className={styles.gridItemContainer}>
        <div
          ref={(el) => {
            if (el && intersectionObserver) {
              el.setAttribute('data-index', index.toString())
              intersectionObserver.observe(el)
            }
          }}
          className={styles.gridItemWrapper}
        >
          <GalleryItem
            item={item}
            onNavigate={onNavigate}
            onPreview={onPreview}
            getThumbnail={getThumbnail}
            startDownload={startDownload}
            getTransferProgress={getTransferProgress}
            ingestPath={ingestPath}
          />
        </div>
      </div>
    )
  }), [intersectionObserver])

  // Memoized grid data
  const gridData = useMemo(() => ({
    items,
    columnsPerRow: gridConfig.columnsPerRow,
    onNavigate,
    onPreview,
    getThumbnail,
    startDownload,
    getTransferProgress,
    ingestPath,
  }), [items, gridConfig.columnsPerRow, onNavigate, onPreview, getThumbnail, startDownload, getTransferProgress, ingestPath])

  // Handle preview modal
  const handlePreview = useCallback((item: GalleryItemType) => {
    setPreviewItem(item)
    setIsPreviewOpen(true)
  }, [])

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false)
    setPreviewItem(null)
  }, [])

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  // Performance monitoring
  useEffect(() => {
    if (renderCount % 10 === 0) { // Log every 10 renders
      console.log(`VirtualizedGalleryGrid render count: ${renderCount}, memory: ${getCurrentMemory().toFixed(1)}MB`)
    }
  }, [renderCount, getCurrentMemory])

  if (loading) {
    return (
      <div className={styles.galleryGrid}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3>Loading files...</h3>
          <p>Please wait while we fetch the camera files.</p>
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
    <div className={styles.galleryGrid} ref={containerRef}>
      <div className={styles.pathHeader}>
        <Breadcrumb path={currentPath} onNavigate={onNavigate} />
        <span className={styles.fileCount}>{items.length} files</span>
      </div>
      
      <div className={styles.virtualGridContainer}>
        <Grid
          ref={gridRef}
          height={containerSize.height - 100} // Account for header
          width={gridConfig.availableWidth}
          columnCount={gridConfig.columnsPerRow}
          rowCount={gridConfig.rowCount}
          columnWidth={gridConfig.columnWidth}
          rowHeight={gridConfig.rowHeight}
          itemData={gridData}
          overscanRowCount={2} // Render 2 extra rows for smooth scrolling
          overscanColumnCount={1} // Render 1 extra column
        >
          {GridItem}
        </Grid>
      </div>
      
      <PreviewModal
        item={previewItem}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />
    </div>
  )
}

// Performance-optimized breadcrumb component
const Breadcrumb = React.memo<{ path: string; onNavigate: (path: string) => void }>(({ path, onNavigate }) => {
  const pathSegments = path.split('/').filter(segment => segment !== '')

  const handleSegmentClick = useCallback((index: number) => {
    const newPath = '/' + pathSegments.slice(0, index + 1).join('/')
    onNavigate(newPath)
  }, [pathSegments, onNavigate])

  const handleHomeClick = useCallback(() => {
    onNavigate('/')
  }, [onNavigate])

  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <button onClick={handleHomeClick} className={styles.breadcrumbHome} aria-label="Go to root">
        🏠
      </button>
      {pathSegments.map((segment, index) => (
        <React.Fragment key={segment + index}>
          <span className={styles.breadcrumbSeparator}>/</span>
          <button
            className={styles.breadcrumbSegment}
            onClick={() => handleSegmentClick(index)}
            aria-current={index === pathSegments.length - 1 ? 'page' : undefined}
          >
            {segment}
          </button>
        </React.Fragment>
      ))}
    </nav>
  )
})

Breadcrumb.displayName = 'Breadcrumb'
