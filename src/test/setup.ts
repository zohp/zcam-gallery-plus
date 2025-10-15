import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Type declarations are now in vitest.d.ts

// Mock Electron APIs
const mockElectronAPI = {
  file: {
    download: vi.fn(),
    readAsDataURL: vi.fn(),
    getMetadata: vi.fn(),
  },
  dialog: {
    selectFolder: vi.fn(),
  },
  camera: {
    listFiles: vi.fn(),
  },
  watcher: {
    onFolderChanged: vi.fn(),
  },
}

// Make mockElectronAPI available globally
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Global test utilities
;(global as any).mockElectronAPI = mockElectronAPI

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
