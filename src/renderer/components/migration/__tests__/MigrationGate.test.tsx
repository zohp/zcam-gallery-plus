/**
 * Migration gate component tests
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MigrationGate } from '../MigrationGate'

// Mock Electron API
const mockElectronAPI = {
  migration: {
    isNeeded: vi.fn(),
    getInfo: vi.fn(),
    perform: vi.fn(),
    validate: vi.fn(),
    getStatus: vi.fn(),
    rollback: vi.fn(),
    cleanup: vi.fn(),
    isFirstRunAfterMigration: vi.fn(),
  },
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

// Mock MigrationWizard component
vi.mock('../MigrationWizard', () => ({
  MigrationWizard: ({ onComplete, onSkip }: any) => (
    <div data-testid="migration-wizard">
      <button onClick={onComplete}>Complete Migration</button>
      <button onClick={onSkip}>Skip Migration</button>
    </div>
  ),
}))

describe('MigrationGate', () => {
  const mockChildren = <div data-testid="main-app">Main App Content</div>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading state', () => {
    it('should show loading while checking migration status', () => {
      mockElectronAPI.migration.isNeeded.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      expect(screen.getByText('Checking for existing data...')).toBeInTheDocument()
      expect(screen.queryByTestId('main-app')).not.toBeInTheDocument()
    })
  })

  describe('No migration needed', () => {
    it('should show main app when no migration needed', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: false,
      })

      mockElectronAPI.migration.isFirstRunAfterMigration.mockResolvedValue({
        success: true,
        isFirstRun: false,
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByTestId('main-app')).toBeInTheDocument()
      })

      expect(screen.queryByText('Checking for existing data...')).not.toBeInTheDocument()
    })
  })

  describe('Migration needed', () => {
    it('should show migration wizard when migration needed', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: true,
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByTestId('migration-wizard')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('main-app')).not.toBeInTheDocument()
    })

    it('should show main app after successful migration', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: true,
      })

      mockElectronAPI.migration.validate.mockResolvedValue({
        success: true,
        validation: { valid: true, issues: [] },
      })

      mockElectronAPI.migration.cleanup.mockResolvedValue({
        success: true,
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByTestId('migration-wizard')).toBeInTheDocument()
      })

      // Complete migration
      fireEvent.click(screen.getByText('Complete Migration'))

      await waitFor(() => {
        expect(mockElectronAPI.migration.validate).toHaveBeenCalled()
      })

      // Wait for cleanup and transition to main app
      await waitFor(() => {
        expect(screen.getByTestId('main-app')).toBeInTheDocument()
      }, { timeout: 6000 }) // Allow time for cleanup delay

      expect(mockElectronAPI.migration.cleanup).toHaveBeenCalled()
    })

    it('should show main app when migration skipped', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: true,
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByTestId('migration-wizard')).toBeInTheDocument()
      })

      // Skip migration
      fireEvent.click(screen.getByText('Skip Migration'))

      await waitFor(() => {
        expect(screen.getByTestId('main-app')).toBeInTheDocument()
      })
    })
  })

  describe('First run after migration', () => {
    it('should show welcome message for first run after migration', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: false,
      })

      mockElectronAPI.migration.isFirstRunAfterMigration.mockResolvedValue({
        success: true,
        isFirstRun: true,
      })

      mockElectronAPI.migration.cleanup.mockResolvedValue({
        success: true,
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByText('🎉 Welcome to ZCAM Gallery Plus!')).toBeInTheDocument()
        expect(screen.getByText('Your data has been successfully migrated from the previous version.')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('main-app')).not.toBeInTheDocument()
    })

    it('should show main app after clicking continue on welcome screen', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: false,
      })

      mockElectronAPI.migration.isFirstRunAfterMigration.mockResolvedValue({
        success: true,
        isFirstRun: true,
      })

      mockElectronAPI.migration.cleanup.mockResolvedValue({
        success: true,
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByText('Continue to App')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Continue to App'))

      await waitFor(() => {
        expect(screen.getByTestId('main-app')).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    it('should show error state when migration check fails', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: false,
        error: 'Failed to check migration status',
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByText('Migration Error')).toBeInTheDocument()
        expect(screen.getByText('Failed to check migration status')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('main-app')).not.toBeInTheDocument()
    })

    it('should allow retry when migration check fails', async () => {
      mockElectronAPI.migration.isNeeded
        .mockResolvedValueOnce({
          success: false,
          error: 'Failed to check migration status',
        })
        .mockResolvedValueOnce({
          success: true,
          needed: false,
        })

      mockElectronAPI.migration.isFirstRunAfterMigration.mockResolvedValue({
        success: true,
        isFirstRun: false,
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Retry'))

      await waitFor(() => {
        expect(screen.getByTestId('main-app')).toBeInTheDocument()
      })
    })

    it('should allow skip when migration check fails', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: false,
        error: 'Failed to check migration status',
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByText('Skip Migration')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Skip Migration'))

      await waitFor(() => {
        expect(screen.getByTestId('main-app')).toBeInTheDocument()
      })
    })

    it('should handle migration validation failure', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: true,
      })

      mockElectronAPI.migration.validate.mockResolvedValue({
        success: true,
        validation: { valid: false, issues: ['Settings file is invalid'] },
      })

      render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByTestId('migration-wizard')).toBeInTheDocument()
      })

      // Complete migration (will fail validation)
      fireEvent.click(screen.getByText('Complete Migration'))

      await waitFor(() => {
        expect(screen.getByText('Migration Error')).toBeInTheDocument()
        expect(screen.getByText('Settings file is invalid')).toBeInTheDocument()
      })
    })
  })

  describe('Cleanup on unmount', () => {
    it('should cleanup migration service on unmount', async () => {
      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: true,
      })

      const { unmount } = render(<MigrationGate>{mockChildren}</MigrationGate>)

      await waitFor(() => {
        expect(screen.getByTestId('migration-wizard')).toBeInTheDocument()
      })

      unmount()

      // Migration service should be cleaned up (this would be tested in integration)
      // For now, we just ensure no errors occur
    })
  })
})
