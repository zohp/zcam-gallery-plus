import React, { ReactNode } from 'react'
import { Toolbar } from './Toolbar'
import { ConnectionStatus } from '../feedback/ConnectionStatus'
import { TransferProgress } from '../feedback/TransferProgress'
import styles from './AppShell.module.css'

/**
 * AppShell - Main application layout
 * Provides the overall structure with toolbar, content area, and status indicators
 */

interface AppShellProps {
  children: ReactNode
  className?: string
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={`${styles.appShell} ${className || ''}`}>
      <Toolbar />
      
      <main className={styles.mainContent}>
        <div className={styles.contentArea}>
          {children}
        </div>
      </main>
      
      <ConnectionStatus />
      <TransferProgress />
    </div>
  )
}

// Export individual components for testing
export { Toolbar } from './Toolbar'
