import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IPCCoordinator } from '../../index'

// Mock all the handler classes
vi.mock('../fileHandlers', () => ({
  FileHandlers: vi.fn().mockImplementation(() => ({
    registerHandlers: vi.fn(),
  })),
}))

vi.mock('../dialogHandlers', () => ({
  DialogHandlers: vi.fn().mockImplementation(() => ({
    registerHandlers: vi.fn(),
  })),
}))

vi.mock('../cameraHandlers', () => ({
  CameraHandlers: vi.fn().mockImplementation(() => ({
    registerHandlers: vi.fn(),
  })),
}))

vi.mock('../watcherHandlers', () => ({
  WatcherHandlers: vi.fn().mockImplementation(() => ({
    registerHandlers: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('IPCCoordinator', () => {
  let ipcCoordinator: IPCCoordinator

  beforeEach(() => {
    vi.clearAllMocks()
    ipcCoordinator = new IPCCoordinator()
  })

  describe('registerAllHandlers', () => {
    it('should register all handler types', () => {
      ipcCoordinator.registerAllHandlers()

      // Verify that all handlers are instantiated and registered
      const handlers = ipcCoordinator.getHandlers()
      
      expect(handlers.fileHandlers).toBeDefined()
      expect(handlers.dialogHandlers).toBeDefined()
      expect(handlers.cameraHandlers).toBeDefined()
      expect(handlers.watcherHandlers).toBeDefined()
    })
  })

  describe('cleanup', () => {
    it('should cleanup watchers', async () => {
      await ipcCoordinator.cleanup()

      const handlers = ipcCoordinator.getHandlers()
      expect(handlers.watcherHandlers.cleanup).toHaveBeenCalled()
    })
  })

  describe('getHandlers', () => {
    it('should return all handler instances', () => {
      const handlers = ipcCoordinator.getHandlers()
      
      expect(handlers).toHaveProperty('fileHandlers')
      expect(handlers).toHaveProperty('dialogHandlers')
      expect(handlers).toHaveProperty('cameraHandlers')
      expect(handlers).toHaveProperty('watcherHandlers')
    })
  })
})
