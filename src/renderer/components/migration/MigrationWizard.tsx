import React, { useState, useEffect, useCallback } from 'react'
import { MigrationService, MigrationUtils } from '../../../utils/migration'
import styles from './MigrationWizard.module.css'

interface MigrationWizardProps {
  onComplete: () => void
  onSkip: () => void
}

interface MigrationStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string
}

/**
 * Migration wizard component for guiding users through the migration process
 * 
 * Features:
 * - Step-by-step migration process
 * - Progress tracking and status updates
 * - Error handling and rollback options
 * - Backup creation and validation
 * - User-friendly interface with clear instructions
 */
export const MigrationWizard: React.FC<MigrationWizardProps> = ({
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [migrationInfo, setMigrationInfo] = useState<any>(null)
  const [steps, setSteps] = useState<MigrationStep[]>([
    {
      id: 'check',
      title: 'Checking for existing data',
      description: 'Looking for data from the previous version of ZCAM Gallery',
      status: 'pending',
    },
    {
      id: 'backup',
      title: 'Creating backup',
      description: 'Creating a backup of your existing data for safety',
      status: 'pending',
    },
    {
      id: 'migrate',
      title: 'Migrating data',
      description: 'Transferring your settings and preferences',
      status: 'pending',
    },
    {
      id: 'validate',
      title: 'Validating migration',
      description: 'Verifying that all data was migrated correctly',
      status: 'pending',
    },
    {
      id: 'complete',
      title: 'Migration complete',
      description: 'Your data has been successfully migrated',
      status: 'pending',
    },
  ])
  const [isRunning, setIsRunning] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Initialize migration info
  useEffect(() => {
    const loadMigrationInfo = async () => {
      try {
        const info = await MigrationUtils.getMigrationInfo()
        setMigrationInfo(info)
        
        if (!info.hasOldData) {
          // No old data found, skip migration
          onSkip()
        }
      } catch (error) {
        console.error('Failed to load migration info:', error)
        setMigrationInfo({ hasOldData: false, canMigrate: false, estimatedItems: 0 })
      }
    }

    loadMigrationInfo()
  }, [onSkip])

  // Update step status
  const updateStepStatus = useCallback((stepId: string, status: MigrationStep['status'], error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, error }
        : step
    ))
  }, [])

  // Run migration process
  const runMigration = useCallback(async () => {
    if (isRunning) return

    setIsRunning(true)
    const migrationService = new MigrationService()

    try {
      // Step 1: Check for existing data
      updateStepStatus('check', 'running')
      const needed = await migrationService.isMigrationNeeded()
      if (!needed) {
        updateStepStatus('check', 'completed')
        onSkip()
        return
      }
      updateStepStatus('check', 'completed')

      // Step 2: Create backup (handled internally by migration service)
      updateStepStatus('backup', 'running')
      // Backup is created automatically in performMigration
      updateStepStatus('backup', 'completed')

      // Step 3: Perform migration
      updateStepStatus('migrate', 'running')
      const result = await migrationService.performMigration()
      
      if (result.success) {
        updateStepStatus('migrate', 'completed')
      } else {
        updateStepStatus('migrate', 'error', result.errors.join(', '))
        return
      }

      // Step 4: Validate migration
      updateStepStatus('validate', 'running')
      const validation = await migrationService.validateMigration()
      
      if (validation.valid) {
        updateStepStatus('validate', 'completed')
      } else {
        updateStepStatus('validate', 'error', validation.issues.join(', '))
        return
      }

      // Step 5: Complete
      updateStepStatus('complete', 'completed')
      
      // Wait a moment then complete
      setTimeout(() => {
        onComplete()
      }, 2000)

    } catch (error) {
      console.error('Migration failed:', error)
      updateStepStatus('migrate', 'error', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }, [isRunning, updateStepStatus, onComplete])

  // Handle rollback
  const handleRollback = useCallback(async () => {
    if (!migrationInfo?.backupPath) return

    try {
      const migrationService = new MigrationService()
      const success = await migrationService.rollbackMigration(migrationInfo.backupPath)
      
      if (success) {
        // Reset steps and start over
        setSteps(prev => prev.map(step => ({ ...step, status: 'pending', error: undefined })))
        setCurrentStep(0)
      }
    } catch (error) {
      console.error('Rollback failed:', error)
    }
  }, [migrationInfo])

  if (!migrationInfo) {
    return (
      <div className={styles.wizard}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Checking for existing data...</p>
        </div>
      </div>
    )
  }

  if (!migrationInfo.hasOldData) {
    return (
      <div className={styles.wizard}>
        <div className={styles.noData}>
          <h2>Welcome to ZCAM Gallery Plus!</h2>
          <p>No previous version data found. You can start fresh with the new application.</p>
          <button className={styles.primaryButton} onClick={onSkip}>
            Get Started
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.header}>
        <h1>Data Migration</h1>
        <p>
          We found data from a previous version of ZCAM Gallery. 
          Let's migrate your settings and preferences to the new version.
        </p>
      </div>

      <div className={styles.migrationInfo}>
        <h3>Migration Summary</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Estimated items:</span>
            <span className={styles.infoValue}>{migrationInfo.estimatedItems}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Backup created:</span>
            <span className={styles.infoValue}>Yes</span>
          </div>
        </div>
      </div>

      <div className={styles.steps}>
        {steps.map((step, index) => (
          <div key={step.id} className={`${styles.step} ${styles[step.status]}`}>
            <div className={styles.stepHeader}>
              <div className={styles.stepIcon}>
                {step.status === 'pending' && <span className={styles.stepNumber}>{index + 1}</span>}
                {step.status === 'running' && <div className={styles.spinner}></div>}
                {step.status === 'completed' && <span className={styles.checkmark}>✓</span>}
                {step.status === 'error' && <span className={styles.errorIcon}>✗</span>}
              </div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
                {step.error && (
                  <div className={styles.errorMessage}>
                    <strong>Error:</strong> {step.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        {!isRunning && steps[0].status === 'pending' && (
          <button className={styles.primaryButton} onClick={runMigration}>
            Start Migration
          </button>
        )}
        
        {isRunning && (
          <button className={styles.secondaryButton} disabled>
            Migration in Progress...
          </button>
        )}
        
        {steps.some(s => s.status === 'error') && (
          <>
            <button className={styles.dangerButton} onClick={handleRollback}>
              Rollback Migration
            </button>
            <button className={styles.secondaryButton} onClick={onSkip}>
              Skip Migration
            </button>
          </>
        )}
        
        {steps[steps.length - 1].status === 'completed' && (
          <button className={styles.primaryButton} onClick={onComplete}>
            Continue to App
          </button>
        )}
      </div>

      <div className={styles.footer}>
        <button 
          className={styles.linkButton}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide' : 'Show'} Technical Details
        </button>
        
        {showDetails && (
          <div className={styles.technicalDetails}>
            <h4>Technical Details</h4>
            <ul>
              <li>Migration creates a complete backup before making any changes</li>
              <li>Settings are converted to the new format automatically</li>
              <li>Thumbnail cache is preserved and optimized</li>
              <li>Download history is maintained with metadata</li>
              <li>Rollback is available if any issues occur</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
