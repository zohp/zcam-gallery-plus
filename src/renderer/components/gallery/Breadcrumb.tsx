import React from 'react'
import styles from './Breadcrumb.module.css'

/**
 * Breadcrumb - Path navigation component
 * Shows current path with clickable segments for navigation
 */
interface BreadcrumbProps {
  path: string
  onNavigate: (path: string) => void
  className?: string
}

export function Breadcrumb({ path, onNavigate, className }: BreadcrumbProps) {
  // Parse path into segments
  const segments = path.split('/').filter(Boolean)
  
  // Build breadcrumb items
  const breadcrumbItems = segments.map((segment, index) => {
    const segmentPath = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    
    return {
      name: segment,
      path: segmentPath,
      isLast,
    }
  })

  const handleSegmentClick = (segmentPath: string) => {
    onNavigate(segmentPath)
  }

  const handleRootClick = () => {
    onNavigate('/')
  }

  return (
    <nav className={`${styles.breadcrumb} ${className || ''}`} aria-label="Breadcrumb">
      <ol className={styles.breadcrumbList}>
        <li className={styles.breadcrumbItem}>
          <button
            className={styles.breadcrumbLink}
            onClick={handleRootClick}
            aria-label="Go to root directory"
          >
            🏠
          </button>
        </li>
        
        {breadcrumbItems.map((item, index) => (
          <li key={item.path} className={styles.breadcrumbItem}>
            <span className={styles.separator}>/</span>
            {item.isLast ? (
              <span className={styles.currentSegment} aria-current="page">
                {item.name}
              </span>
            ) : (
              <button
                className={styles.breadcrumbLink}
                onClick={() => handleSegmentClick(item.path)}
                aria-label={`Go to ${item.name}`}
              >
                {item.name}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
