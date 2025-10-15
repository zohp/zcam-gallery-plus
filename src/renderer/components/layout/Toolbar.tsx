import React from 'react'
import { ConnectionButton } from '../controls/ConnectionButton'
import { ThemeToggle } from '../controls/ThemeToggle'
import { IngestPathSelector } from '../controls/IngestPathSelector'
import { AutoIngestToggle } from '../controls/AutoIngestToggle'
import { SortControls } from '../controls/SortControls'
import { SearchBar } from '../controls/SearchBar'
import styles from './Toolbar.module.css'

/**
 * Toolbar - Top navigation and controls
 * Contains connection, settings, and search controls
 */
export function Toolbar() {
  return (
    <header className={styles.toolbar} role="banner">
      <div className={styles.toolbarLeft}>
        <div className={styles.logo}>
          <h1>ZCAM Gallery Plus</h1>
        </div>
        
        <div className={styles.connectionSection}>
          <ConnectionButton />
        </div>
      </div>
      
      <div className={styles.toolbarCenter}>
        <SearchBar />
        <SortControls />
      </div>
      
      <div className={styles.toolbarRight}>
        <div className={styles.settingsGroup}>
          <IngestPathSelector />
          <AutoIngestToggle />
        </div>
        
        <ThemeToggle />
      </div>
    </header>
  )
}
