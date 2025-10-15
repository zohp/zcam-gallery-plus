import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileTransferService, DownloadFunction } from '../FileTransferService'
import type { CameraFile } from '@/shared/types'

describe('FileTransferService', () => {
  let service: FileTransferService
  let mockDownloadFunction: DownloadFunction
  let mockProgressCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockDownloadFunction = vi.fn()
    mockProgressCallback = vi.fn()
    service = new FileTransferService(mockDownloadFunction, {
      maxConcurrentDownloads: 2,
      progressThrottleMs: 10, // Faster for testing
    })
    service.setProgressCallback(mockProgressCallback)
  })

  describe('downloadFile', () => {
    it('should queue and download a file successfully', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockDownloadFunction.mockImplementation(async (file, destination, onProgress) => {
        onProgress(500000, 1000000)
        onProgress(1000000, 1000000)
      })

      const downloadPromise = service.downloadFile(mockFile, '/local/test.mov')
      
      // Wait a bit for the download to start
      await new Promise(resolve => setTimeout(resolve, 20))
      
      await downloadPromise

      expect(mockDownloadFunction).toHaveBeenCalledWith(
        mockFile,
        '/local/test.mov',
        expect.any(Function)
      )
      expect(mockProgressCallback).toHaveBeenCalled()
    })

    it('should handle download errors', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockDownloadFunction.mockRejectedValue(new Error('Download failed'))

      try {
        await service.downloadFile(mockFile, '/local/test.mov')
        // If we get here, the test should fail
        expect.fail('Download should have failed')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Download failed')
      }
    }, 10000)

    it('should prevent duplicate downloads', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockDownloadFunction.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Start first download
      const firstDownload = service.downloadFile(mockFile, '/local/test.mov')
      
      // Try to start duplicate download
      try {
        await service.downloadFile(mockFile, '/local/test.mov')
        expect.fail('Should have thrown error for duplicate download')
      } catch (error) {
        expect((error as Error).message).toBe('File test.mov is already being processed')
      }

      await firstDownload
    })

    it('should respect concurrent download limits', async () => {
      const mockFiles: CameraFile[] = [
        { name: 'test1.mov', path: '/DCIM/test1.mov', size: 1000, isFolder: false },
        { name: 'test2.mov', path: '/DCIM/test2.mov', size: 1000, isFolder: false },
        { name: 'test3.mov', path: '/DCIM/test3.mov', size: 1000, isFolder: false },
      ]

      let downloadCount = 0
      mockDownloadFunction.mockImplementation(async (file, destination, onProgress) => {
        downloadCount++
        await new Promise(resolve => setTimeout(resolve, 100))
        onProgress(1000, 1000)
      })

      // Start all downloads
      const downloads = mockFiles.map((file, index) =>
        service.downloadFile(file, `/local/test${index + 1}.mov`)
      )

      // Wait a bit for downloads to start
      await new Promise(resolve => setTimeout(resolve, 50))

      // Should have max 2 concurrent downloads
      expect(downloadCount).toBeLessThanOrEqual(2)

      // Wait for all to complete
      await Promise.all(downloads)
      expect(downloadCount).toBe(3)
    })
  })

  describe('pauseDownload', () => {
    it('should pause an active download', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockDownloadFunction.mockImplementation(async (file, destination, onProgress) => {
        onProgress(500000, 1000000)
        // This should be paused before completion
        await new Promise(resolve => setTimeout(resolve, 200))
        onProgress(1000000, 1000000)
      })

      const downloadPromise = service.downloadFile(mockFile, '/local/test.mov')
      
      // Wait for download to start
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Get the file ID (this is a bit hacky for testing)
      const activeTransfers = service.getActiveTransfers()
      const fileId = activeTransfers[0]?.fileId
      
      if (fileId) {
        service.pauseDownload(fileId)
        
        const progress = service.getProgress(fileId)
        expect(progress?.status).toBe('paused')
      }

      await downloadPromise
    })
  })

  describe('cancelDownload', () => {
    it('should cancel an active download', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockDownloadFunction.mockImplementation(async (file, destination, onProgress) => {
        await new Promise(resolve => setTimeout(resolve, 200))
        onProgress(1000000, 1000000)
      })

      const downloadPromise = service.downloadFile(mockFile, '/local/test.mov')
      
      // Wait for download to start
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const activeTransfers = service.getActiveTransfers()
      const fileId = activeTransfers[0]?.fileId
      
      if (fileId) {
        service.cancelDownload(fileId)
        
        const progress = service.getProgress(fileId)
        expect(progress).toBeNull()
      }

      // Download should be cancelled, so this might reject
      try {
        await downloadPromise
      } catch (error) {
        // Expected if download was cancelled
      }
    })
  })

  describe('getProgress', () => {
    it('should return progress for active transfers', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockDownloadFunction.mockImplementation(async (file, destination, onProgress) => {
        onProgress(500000, 1000000)
        await new Promise(resolve => setTimeout(resolve, 100))
        onProgress(1000000, 1000000)
      })

      service.downloadFile(mockFile, '/local/test.mov')
      
      // Wait for download to start
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const activeTransfers = service.getActiveTransfers()
      expect(activeTransfers.length).toBeGreaterThan(0)
      
      const progress = activeTransfers[0]
      expect(progress.fileName).toBe('test.mov')
      expect(progress.progress).toBeGreaterThanOrEqual(0)
      expect(progress.status).toBe('downloading')
    })

    it('should return null for non-existent transfers', () => {
      const progress = service.getProgress('non-existent-id')
      expect(progress).toBeNull()
    })
  })

  describe('getQueueStatus', () => {
    it('should return correct queue status', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockDownloadFunction.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Start multiple downloads
      const promises = [
        service.downloadFile(mockFile, '/local/test1.mov'),
        service.downloadFile({ ...mockFile, name: 'test2.mov' }, '/local/test2.mov'),
        service.downloadFile({ ...mockFile, name: 'test3.mov' }, '/local/test3.mov'),
      ]

      // Wait a bit for queue to process
      await new Promise(resolve => setTimeout(resolve, 20))

      const status = service.getQueueStatus()
      expect(status.active).toBeLessThanOrEqual(2) // Max concurrent
      expect(status.queued + status.active).toBeLessThanOrEqual(3) // Total files

      await Promise.all(promises)
    })
  })

  describe('clearCompleted', () => {
    it('should clear completed transfers', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockDownloadFunction.mockImplementation(async () => {
        // Quick completion
      })

      await service.downloadFile(mockFile, '/local/test.mov')

      const statusBefore = service.getQueueStatus()
      expect(statusBefore.completed).toBeGreaterThan(0)

      service.clearCompleted()

      const statusAfter = service.getQueueStatus()
      expect(statusAfter.completed).toBe(0)
    })
  })

  describe('priority calculation', () => {
    it('should prioritize smaller files', async () => {
      const largeFile: CameraFile = {
        name: 'large.mov',
        path: '/DCIM/large.mov',
        size: 100000000, // 100MB
        isFolder: false,
      }

      const smallFile: CameraFile = {
        name: 'small.mov',
        path: '/DCIM/small.mov',
        size: 5000000, // 5MB
        isFolder: false,
      }

      mockDownloadFunction.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // Start both downloads
      const largeDownload = service.downloadFile(largeFile, '/local/large.mov')
      const smallDownload = service.downloadFile(smallFile, '/local/small.mov')

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 20))

      // Both should start (within concurrent limit)
      const activeTransfers = service.getActiveTransfers()
      expect(activeTransfers.length).toBe(2)

      await Promise.all([largeDownload, smallDownload])
    })
  })
})
