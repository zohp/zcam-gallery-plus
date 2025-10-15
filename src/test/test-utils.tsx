import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import { AppProviders } from '../renderer/stores/AppProviders'
import type { GalleryItem, CameraInfo, TransferProgress } from '@/shared/types'

// Mock Electron APIs
export const mockElectronAPI = {
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
}

// Mock ZCamConnector
export const mockZCamConnector = {
  connect: vi.fn().mockResolvedValue({}),
  disconnect: vi.fn(),
  getDeviceInfo: vi.fn().mockResolvedValue({}),
  listFiles: vi.fn().mockResolvedValue([]),
  downloadFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  isConnected: vi.fn().mockReturnValue(false),
}

// Mock FileTransferService
export const mockFileTransferService = {
  downloadFile: vi.fn().mockResolvedValue(undefined),
  pauseDownload: vi.fn(),
  resumeDownload: vi.fn(),
  cancelDownload: vi.fn(),
  getProgress: vi.fn().mockReturnValue(null),
  getActiveTransfers: vi.fn().mockReturnValue([]),
  getCompletedTransfers: vi.fn().mockReturnValue([]),
  getQueuedTransfers: vi.fn().mockReturnValue([]),
  onProgress: vi.fn(),
}

// Mock ThumbnailCacheService
export const mockThumbnailCacheService = {
  getThumbnail: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
  prefetchThumbnails: vi.fn().mockResolvedValue(undefined),
  clearCache: vi.fn().mockResolvedValue(undefined),
  getCacheSize: vi.fn().mockResolvedValue(0),
}

// Mock localStorage
export const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Setup mocks
export const setupMocks = () => {
  // Mock window.electronAPI
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
  })

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })

  // Mock fetch for HTTP requests
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(new Blob()),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  })

  // Mock console methods to avoid noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

// Clean up mocks
export const cleanupMocks = () => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
}

// Test data factories
export const createMockCameraInfo = (overrides: Partial<CameraInfo> = {}): CameraInfo => ({
  ip: '10.98.32.1',
  model: 'Z CAM E2-M4',
  serialNumber: 'ZCAM123456789',
  firmware: '1.0.0',
  batteryLevel: 85,
  storageInfo: {
    totalSpace: 128 * 1024 * 1024 * 1024, // 128GB
    freeSpace: 64 * 1024 * 1024 * 1024,   // 64GB
    usedSpace: 64 * 1024 * 1024 * 1024,   // 64GB
  },
  ...overrides,
})

export const createMockGalleryItem = (overrides: Partial<GalleryItem> = {}): GalleryItem => ({
  id: '1',
  name: 'test.mov',
  path: '/DCIM/test.mov',
  size: 1024 * 1024 * 1024, // 1GB
  isFolder: false,
  isIngested: false,
  type: 'video',
  modifiedTime: '2024-01-15T10:30:00Z',
  ...overrides,
})

export const createMockTransferProgress = (overrides: Partial<TransferProgress> = {}): TransferProgress => ({
  fileId: 'test.mov',
  fileName: 'test.mov',
  progress: 50,
  bytesReceived: 512 * 1024 * 1024, // 512MB
  totalBytes: 1024 * 1024 * 1024,   // 1GB
  speed: 10 * 1024 * 1024,          // 10MB/s
  estimatedTimeRemaining: 50,       // 50 seconds
  status: 'downloading',
  ...overrides,
})

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string
  mockServices?: {
    zcamConnector?: typeof mockZCamConnector
    fileTransferService?: typeof mockFileTransferService
    thumbnailCacheService?: typeof mockThumbnailCacheService
  }
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { mockServices = {}, ...renderOptions } = options

  // Apply service mocks if provided
  if (mockServices.zcamConnector) {
    vi.mocked(mockZCamConnector).mockImplementation(() => mockServices.zcamConnector!)
  }
  if (mockServices.fileTransferService) {
    vi.mocked(mockFileTransferService).mockImplementation(() => mockServices.fileTransferService!)
  }
  if (mockServices.thumbnailCacheService) {
    vi.mocked(mockThumbnailCacheService).mockImplementation(() => mockServices.thumbnailCacheService!)
  }

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <AppProviders>{children}</AppProviders>
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock HTTP responses
export const mockHttpResponse = (url: string, response: any, status = 200) => {
  const mockFetch = vi.mocked(fetch)
  mockFetch.mockImplementation((input) => {
    if (typeof input === 'string' && input.includes(url)) {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(typeof response === 'string' ? response : JSON.stringify(response)),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      } as Response)
    }
    return mockFetch.getMockImplementation()!(input)
  })
}

// Mock file download
export const mockFileDownload = (url: string, progressCallback?: (progress: number) => void) => {
  const mockFetch = vi.mocked(fetch)
  mockFetch.mockImplementation((input) => {
    if (typeof input === 'string' && input.includes(url)) {
      // Simulate progress if callback provided
      if (progressCallback) {
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          progressCallback(progress)
          if (progress >= 100) {
            clearInterval(interval)
          }
        }, 100)
      }
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      } as Response)
    }
    return mockFetch.getMockImplementation()!(input)
  })
}

// Test assertions helpers
export const expectToBeAccessible = (element: HTMLElement) => {
  expect(element).toHaveAttribute('role')
  expect(element).toHaveAttribute('aria-label')
}

export const expectToBeVisible = (element: HTMLElement) => {
  expect(element).toBeVisible()
  expect(element).not.toHaveAttribute('aria-hidden', 'true')
}

// Performance testing helpers
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now()
  renderFn()
  await waitForAsync()
  const end = performance.now()
  return end - start
}

export const expectRenderTimeToBeLessThan = (renderTime: number, maxTime: number) => {
  expect(renderTime).toBeLessThan(maxTime)
}

// Export everything as default for convenience
export default {
  setupMocks,
  cleanupMocks,
  renderWithProviders,
  createMockCameraInfo,
  createMockGalleryItem,
  createMockTransferProgress,
  mockHttpResponse,
  mockFileDownload,
  waitForAsync,
  expectToBeAccessible,
  expectToBeVisible,
  measureRenderTime,
  expectRenderTimeToBeLessThan,
  mocks: {
    electronAPI: mockElectronAPI,
    zcamConnector: mockZCamConnector,
    fileTransferService: mockFileTransferService,
    thumbnailCacheService: mockThumbnailCacheService,
    localStorage: mockLocalStorage,
  },
}
