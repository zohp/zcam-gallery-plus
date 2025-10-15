import React, { useState, useEffect } from 'react'
import { MigrationWizard } from './MigrationWizard'
import styles from './MigrationGate.module.css'

interface MigrationGateProps {
  children: React.ReactNode
}

/**
 * Migration gate component that handles the migration flow
 * 
 * This component:
 * - Checks if migration is needed on app startup
 * - Shows migration wizard if old data is found
 * - Allows skipping migration for new users
 * - Handles post-migration cleanup
 */
export const MigrationGate: React.FC<MigrationGateProps> = ({ children }) => {
  const [migrationState, setMigrationState] = useState<{
    status: 'checking' | 'needed' | 'completed' | 'skipped' | 'error'
    error?: string
  }>({ status: 'checking' })

  useEffect(() => {
    checkMigrationStatus()
  }, [])

  const checkMigrationStatus = async () => {
    try {
      // Check if migration is needed
      const neededResult = await window.electronAPI.migration.isNeeded()
      
      if (!neededResult.success) {
        setMigrationState({ status: 'error', error: neededResult.error })
        return
      }

      if (neededResult.needed) {
        setMigrationState({ status: 'needed' })
      } else {
        // Check if this is first run after migration
        const firstRunResult = await window.electronAPI.migration.isFirstRunAfterMigration()
        
        if (firstRunResult.success && firstRunResult.isFirstRun) {
          // Show welcome message for first run after migration
          setMigrationState({ status: 'completed' })
          
          // Clean up old data after successful migration
          setTimeout(async () => {
            try {
              await window.electronAPI.migration.cleanup()
            } catch (error) {
              console.warn('Failed to cleanup old data:', error)
            }
          }, 5000) // Clean up after 5 seconds
        } else {
          setMigrationState({ status: 'skipped' })
        }
      }
    } catch (error) {
      console.error('Failed to check migration status:', error)
      setMigrationState({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  const handleMigrationComplete = async () => {
    try {
      // Validate migration was successful
      const validation = await window.electronAPI.migration.validate()
      
      if (validation.success && validation.validation?.valid) {
        setMigrationState({ status: 'completed' })
        
        // Clean up old data after successful migration
        setTimeout(async () => {
          try {
            await window.electronAPI.migration.cleanup()
          } catch (error) {
            console.warn('Failed to cleanup old data:', error)
          }
        }, 5000)
      } else {
        setMigrationState({ 
          status: 'error', 
          error: validation.validation?.issues?.join(', ') || 'Migration validation failed' 
        })
      }
    } catch (error) {
      console.error('Migration completion failed:', error)
      setMigrationState({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  const handleMigrationSkip = () => {
    setMigrationState({ status: 'skipped' })
  }

  const handleRetry = () => {
    setMigrationState({ status: 'checking' })
    checkMigrationStatus()
  }

  // Show loading state while checking
  if (migrationState.status === 'checking') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Checking for existing data...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (migrationState.status === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Migration Error</h2>
          <p>{migrationState.error}</p>
          <div className={styles.errorActions}>
            <button className={styles.retryButton} onClick={handleRetry}>
              Retry
            </button>
            <button className={styles.skipButton} onClick={handleMigrationSkip}>
              Skip Migration
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show migration wizard if needed
  if (migrationState.status === 'needed') {
    return (
      <div className={styles.container}>
        <MigrationWizard
          onComplete={handleMigrationComplete}
          onSkip={handleMigrationSkip}
        />
      </div>
    )
  }

  // Show welcome message for first run after migration
  if (migrationState.status === 'completed') {
    return (
      <div className={styles.container}>
        <div className={styles.welcome}>
          <h2>🎉 Welcome to ZCAM Gallery Plus!</h2>
          <p>Your data has been successfully migrated from the previous version.</p>
          <p>You can now enjoy all the new features and improvements!</p>
          <button 
            className={styles.continueButton}
            onClick={() => setMigrationState({ status: 'skipped' })}
          >
            Continue to App
          </button>
        </div>
      </div>
    )
  }

  // Show the main app (migration skipped or not needed)
  return <>{children}</>
}
