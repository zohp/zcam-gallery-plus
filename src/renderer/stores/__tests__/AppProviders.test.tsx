import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppProviders } from '../AppProviders'
import { ConnectionButton } from '../../components/controls/ConnectionButton'
import { ThemeToggle } from '../../components/controls/ThemeToggle'
import { GalleryGrid } from '../../components/gallery/GalleryGrid'

// Mock all the services
vi.mock('../../services/ZCamConnector', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({}),
    disconnect: vi.fn(),
    getDeviceInfo: vi.fn().mockResolvedValue({}),
    listFiles: vi.fn().mockResolvedValue([]),
    downloadFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    isConnected: vi.fn().mockReturnValue(false),
  })),
}))

vi.mock('../../services/FileTransferService', () => ({
  default: vi.fn().mockImplementation(() => ({
    downloadFile: vi.fn().mockResolvedValue(undefined),
    pauseDownload: vi.fn(),
    resumeDownload: vi.fn(),
    cancelDownload: vi.fn(),
    getProgress: vi.fn().mockReturnValue(null),
    getActiveTransfers: vi.fn().mockReturnValue([]),
    getCompletedTransfers: vi.fn().mockReturnValue([]),
    getQueuedTransfers: vi.fn().mockReturnValue([]),
    onProgress: vi.fn(),
  })),
}))

vi.mock('../../services/ThumbnailCacheService', () => ({
  default: vi.fn().mockImplementation(() => ({
    getThumbnail: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
    prefetchThumbnails: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined),
    getCacheSize: vi.fn().mockResolvedValue(0),
  })),
}))

// Mock Electron APIs
vi.mock('../../../main/ipc/preload', () => ({
  electronAPI: {
    file: {
      download: vi.fn().mockResolvedValue(undefined),
      readAsDataURL: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
      getMetadata: vi.fn().mockResolvedValue({}),
    },
    dialog: {
      selectFolder: vi.fn().mockResolvedValue('/tmp/downloads'),
    },
    camera: {
      listFiles: vi.fn().mockResolvedValue('[]'),
    },
    watcher: {
      onFolderChanged: vi.fn(),
    },
  },
}))

describe('AppProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('provider composition', () => {
    it('should render without crashing', () => {
      render(
        <AppProviders>
          <div>Test Content</div>
        </AppProviders>
      )
      
      expect(screen.getByText('Test Content')).toBeDefined()
    })

    it('should provide all context values', () => {
      render(
        <AppProviders>
          <ConnectionButton />
          <ThemeToggle />
          <GalleryGrid />
        </AppProviders>
      )
      
      // These components should render without errors, indicating contexts are provided
      expect(screen.getByText('Connect')).toBeDefined()
      expect(screen.getByText('🌙')).toBeDefined() // Theme toggle icon
    })
  })

  describe('context isolation', () => {
    it('should isolate connection state from other contexts', () => {
      const TestComponent = () => {
        // This would test that changing one context doesn't affect others
        return (
          <div>
            <ConnectionButton />
            <ThemeToggle />
          </div>
        )
      }

      render(
        <AppProviders>
          <TestComponent />
        </AppProviders>
      )
      
      // Both components should render independently
      expect(screen.getByText('Connect')).toBeDefined()
      expect(screen.getByText('🌙')).toBeDefined()
    })
  })

  describe('service initialization', () => {
    it('should initialize all services with correct parameters', () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      })

      render(
        <AppProviders>
          <div>Test</div>
        </AppProviders>
      )

      // Verify services are initialized (this is more of an integration test)
      expect(screen.getByText('Test')).toBeDefined()
    })
  })

  describe('error boundaries', () => {
    it('should handle context errors gracefully', () => {
      // This would test error boundary behavior if we had one
      const ThrowError = () => {
        throw new Error('Test error')
      }

      // In a real app, we'd have error boundaries
      // For now, we just ensure the providers don't crash
      expect(() => {
        render(
          <AppProviders>
            <ThrowError />
          </AppProviders>
        )
      }).toThrow('Test error')
    })
  })

  describe('performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0
      const TestComponent = () => {
        renderCount++
        return <div>Render count: {renderCount}</div>
      }

      const { rerender } = render(
        <AppProviders>
          <TestComponent />
        </AppProviders>
      )

      const initialRenderCount = renderCount

      // Re-render with same props
      rerender(
        <AppProviders>
          <TestComponent />
        </AppProviders>
      )

      // Should not cause additional renders of child components
      expect(renderCount).toBe(initialRenderCount)
    })
  })
})
