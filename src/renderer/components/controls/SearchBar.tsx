import React, { useState } from 'react'
import { useGalleryFiltering } from '../../stores/GalleryContext'
import styles from './SearchBar.module.css'

/**
 * SearchBar - Search functionality for gallery files
 * Provides real-time search with debounced input
 */
export function SearchBar() {
  const { filterBy, setFilterCriteria } = useGalleryFiltering()
  const [searchQuery, setSearchQuery] = useState(filterBy.searchQuery || '')

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value
    setSearchQuery(query)
    
    // Update filter criteria with debounced search
    setFilterCriteria({
      ...filterBy,
      searchQuery: query || undefined,
    })
  }

  const clearSearch = () => {
    setSearchQuery('')
    setFilterCriteria({
      ...filterBy,
      searchQuery: undefined,
    })
  }

  return (
    <div className={styles.searchBar}>
      <span className={styles.searchIcon}>🔍</span>
      <input
        type="text"
        placeholder="Search files..."
        value={searchQuery}
        onChange={handleSearchChange}
        className={styles.searchInput}
        aria-label="Search files"
      />
      {searchQuery && (
        <button
          onClick={clearSearch}
          className={styles.clearButton}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
