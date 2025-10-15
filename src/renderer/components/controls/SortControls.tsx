import React from 'react'
import { useGallerySorting } from '../../stores/GalleryContext'
import styles from './SortControls.module.css'

/**
 * SortControls - Sort and filter controls for gallery
 * Provides sorting options for file display
 */
export function SortControls() {
  const { sortBy, setSortCriteria } = useGallerySorting()

  const handleSortChange = (field: 'name' | 'date' | 'size') => {
    const newOrder = sortBy.field === field && sortBy.order === 'asc' ? 'desc' : 'asc'
    setSortCriteria({ field, order: newOrder })
  }

  return (
    <div className={styles.sortControls}>
      <span className={styles.label}>Sort:</span>
      <div className={styles.sortButtons}>
        {(['name', 'date', 'size'] as const).map((field) => (
          <button
            key={field}
            className={`${styles.sortButton} ${sortBy.field === field ? styles.active : ''}`}
            onClick={() => handleSortChange(field)}
            aria-label={`Sort by ${field}`}
          >
            {field.charAt(0).toUpperCase() + field.slice(1)}
            {sortBy.field === field && (
              <span className={styles.order}>
                {sortBy.order === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
