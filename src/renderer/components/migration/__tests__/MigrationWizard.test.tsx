/**
 * Migration wizard component tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MigrationWizard } from '../MigrationWizard'

// Mock the migration utilities
vi.mock('../../../../utils/migration', () => ({
  MigrationService: vi.fn().mockImplementation(() => ({
    isMigrationNeeded: vi.fn(),
    performMigration: vi.fn(),
    validateMigration: vi.fn(),
    getMigrationStatus: vi.fn(),
    rollbackMigration: vi.fn(),
  })),
  MigrationUtils: {
    getMigrationInfo: vi.fn(),
    cleanupOldData: vi.fn(),
    isFirstRunAfterMigration: vi.fn(),
  },
}))

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

describe('MigrationWizard', () => {
  const mockOnComplete = vi.fn()
  const mockOnSkip = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('No old data scenario', () => {
    it('should show welcome message when no old data found', async () => {
      mockElectronAPI.migration.getInfo.mockResolvedValue({
        success: true,
        info: { hasOldData: false, canMigrate: false, estimatedItems: 0 },
      })

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome to ZCAM Gallery Plus!')).toBeInTheDocument()
        expect(screen.getByText('No previous version data found. You can start fresh with the new application.')).toBeInTheDocument()
      })

      expect(mockOnSkip).toHaveBeenCalled()
    })
  })

  describe('Migration needed scenario', () => {
    it('should show migration wizard when old data found', async () => {
      mockElectronAPI.migration.getInfo.mockResolvedValue({
        success: true,
        info: { hasOldData: true, canMigrate: true, estimatedItems: 5 },
      })

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      await waitFor(() => {
        expect(screen.getByText('Data Migration')).toBeInTheDocument()
        expect(screen.getByText('We found data from a previous version of ZCAM Gallery.')).toBeInTheDocument()
        expect(screen.getByText('Estimated items: 5')).toBeInTheDocument()
      })
    })

    it('should show migration steps correctly', async () => {
      mockElectronAPI.migration.getInfo.mockResolvedValue({
        success: true,
        info: { hasOldData: true, canMigrate: true, estimatedItems: 3 },
      })

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      await waitFor(() => {
        expect(screen.getByText('Checking for existing data')).toBeInTheDocument()
        expect(screen.getByText('Creating backup')).toBeInTheDocument()
        expect(screen.getByText('Migrating data')).toBeInTheDocument()
        expect(screen.getByText('Validating migration')).toBeInTheDocument()
        expect(screen.getByText('Migration complete')).toBeInTheDocument()
      })
    })

    it('should start migration when button clicked', async () => {
      mockElectronAPI.migration.getInfo.mockResolvedValue({
        success: true,
        info: { hasOldData: true, canMigrate: true, estimatedItems: 3 },
      })

      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: true,
      })

      mockElectronAPI.migration.perform.mockResolvedValue({
        success: true,
        result: {
          success: true,
          migratedItems: 3,
          errors: [],
          warnings: [],
          backupPath: '/backup/path',
        },
      })

      mockElectronAPI.migration.validate.mockResolvedValue({
        success: true,
        validation: { valid: true, issues: [] },
      })

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Start Migration'))

      await waitFor(() => {
        expect(mockElectronAPI.migration.isNeeded).toHaveBeenCalled()
        expect(mockElectronAPI.migration.perform).toHaveBeenCalled()
        expect(mockElectronAPI.migration.validate).toHaveBeenCalled()
      })
    })

    it('should handle migration errors', async () => {
      mockElectronAPI.migration.getInfo.mockResolvedValue({
        success: true,
        info: { hasOldData: true, canMigrate: true, estimatedItems: 3 },
      })

      mockElectronAPI.migration.isNeeded.mockResolvedValue({
        success: true,
        needed: true,
      })

      mockElectronAPI.migration.perform.mockResolvedValue({
        success: false,
        error: 'Migration failed: Permission denied',
        result: {
          success: false,
          migratedItems: 0,
          errors: ['Permission denied'],
          warnings: [],
        },
      })

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Start Migration'))

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument()
        expect(screen.getByText('Rollback Migration')).toBeInTheDocument()
        expect(screen.getByText('Skip Migration')).toBeInTheDocument()
      })
    })

    it('should handle rollback', async () => {
      mockElectronAPI.migration.getInfo.mockResolvedValue({
        success: true,
        info: { hasOldData: true, canMigrate: true, estimatedItems: 3 },
      })

      mockElectronAPI.migration.perform.mockResolvedValue({
        success: false,
        result: {
          success: false,
          migratedItems: 0,
          errors: ['Test error'],
          warnings: [],
          backupPath: '/backup/path',
        },
      })

      mockElectronAPI.migration.rollback.mockResolvedValue({
        success: true,
      })

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      // Start migration (will fail)
      await waitFor(() => {
        expect(screen.getByText('Start Migration')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Start Migration'))

      // Wait for error and click rollback
      await waitFor(() => {
        expect(screen.getByText('Rollback Migration')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Rollback Migration'))

      await waitFor(() => {
        expect(mockElectronAPI.migration.rollback).toHaveBeenCalledWith('/backup/path')
      })
    })
  })

  describe('Technical details', () => {
    it('should show technical details when toggled', async () => {
      mockElectronAPI.migration.getInfo.mockResolvedValue({
        success: true,
        info: { hasOldData: true, canMigrate: true, estimatedItems: 3 },
      })

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      await waitFor(() => {
        expect(screen.getByText('Show Technical Details')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Show Technical Details'))

      await waitFor(() => {
        expect(screen.getByText('Technical Details')).toBeInTheDocument()
        expect(screen.getByText('Migration creates a complete backup before making any changes')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Hide Technical Details'))

      await waitFor(() => {
        expect(screen.queryByText('Technical Details')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading states', () => {
    it('should show loading state initially', () => {
      mockElectronAPI.migration.getInfo.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      expect(screen.getByText('Checking for existing data...')).toBeInTheDocument()
    })

    it('should handle migration info loading error', async () => {
      mockElectronAPI.migration.getInfo.mockResolvedValue({
        success: false,
        error: 'Failed to load migration info',
      })

      render(<MigrationWizard onComplete={mockOnComplete} onSkip={mockOnSkip} />)

      await waitFor(() => {
        expect(screen.getByText('Welcome to ZCAM Gallery Plus!')).toBeInTheDocument()
      })

      expect(mockOnSkip).toHaveBeenCalled()
    })
  })
})
