import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ThumbnailCacheService, ThumbnailGenerationFunction } from '../ThumbnailCacheService'
import type { CameraFile } from '@/shared/types'

describe('ThumbnailCacheService', () => {
  let service: ThumbnailCacheService
  let mockGenerationFunction: ThumbnailGenerationFunction

  beforeEach(() => {
    mockGenerationFunction = vi.fn()
    service = new ThumbnailCacheService(mockGenerationFunction, {
      maxCacheSize: 3,
      maxMemoryMB: 1,
    })
  })

  describe('getThumbnail', () => {
    it('should generate and cache thumbnail on first request', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      const result = await service.getThumbnail(mockFile)

      expect(result).toBe(mockThumbnail)
      expect(mockGenerationFunction).toHaveBeenCalledWith(mockFile)
      expect(service.hasThumbnail(mockFile)).toBe(true)
    })

    it('should return cached thumbnail on subsequent requests', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      // First call
      await service.getThumbnail(mockFile)
      
      // Second call should use cache
      const result = await service.getThumbnail(mockFile)

      expect(result).toBe(mockThumbnail)
      expect(mockGenerationFunction).toHaveBeenCalledTimes(1)
    })

    it('should return fallback thumbnail on generation error', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      mockGenerationFunction.mockRejectedValue(new Error('Generation failed'))

      const result = await service.getThumbnail(mockFile)

      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(mockGenerationFunction).toHaveBeenCalledWith(mockFile)
    })

    it('should handle different file types', async () => {
      const videoFile: CameraFile = {
        name: 'video.mov',
        path: '/DCIM/video.mov',
        size: 5000000,
        isFolder: false,
      }

      const imageFile: CameraFile = {
        name: 'image.jpg',
        path: '/DCIM/image.jpg',
        size: 500000,
        isFolder: false,
      }

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      await service.getThumbnail(videoFile)
      await service.getThumbnail(imageFile)

      expect(mockGenerationFunction).toHaveBeenCalledTimes(2)
      expect(mockGenerationFunction).toHaveBeenCalledWith(videoFile)
      expect(mockGenerationFunction).toHaveBeenCalledWith(imageFile)
    })
  })

  describe('prefetchThumbnails', () => {
    it('should prefetch multiple thumbnails', async () => {
      const mockFiles: CameraFile[] = [
        { name: 'file1.mov', path: '/DCIM/file1.mov', size: 1000, isFolder: false },
        { name: 'file2.mov', path: '/DCIM/file2.mov', size: 2000, isFolder: false },
        { name: 'file3.mov', path: '/DCIM/file3.mov', size: 3000, isFolder: false },
      ]

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      await service.prefetchThumbnails(mockFiles)

      expect(mockGenerationFunction).toHaveBeenCalledTimes(3)
      mockFiles.forEach(file => {
        expect(mockGenerationFunction).toHaveBeenCalledWith(file)
      })
    })

    it('should handle prefetch errors gracefully', async () => {
      const mockFiles: CameraFile[] = [
        { name: 'good.mov', path: '/DCIM/good.mov', size: 1000, isFolder: false },
        { name: 'bad.mov', path: '/DCIM/bad.mov', size: 2000, isFolder: false },
      ]

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction
        .mockResolvedValueOnce(mockThumbnail)
        .mockRejectedValueOnce(new Error('Prefetch failed'))

      // Should not throw
      await expect(service.prefetchThumbnails(mockFiles)).resolves.toBeUndefined()

      expect(mockGenerationFunction).toHaveBeenCalledTimes(2)
    })
  })

  describe('cache management', () => {
    it('should evict oldest items when cache size limit reached', async () => {
      const mockFiles: CameraFile[] = [
        { name: 'file1.mov', path: '/DCIM/file1.mov', size: 1000, isFolder: false },
        { name: 'file2.mov', path: '/DCIM/file2.mov', size: 2000, isFolder: false },
        { name: 'file3.mov', path: '/DCIM/file3.mov', size: 3000, isFolder: false },
        { name: 'file4.mov', path: '/DCIM/file4.mov', size: 4000, isFolder: false },
      ]

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      // Fill cache to limit
      await service.getThumbnail(mockFiles[0])
      await service.getThumbnail(mockFiles[1])
      await service.getThumbnail(mockFiles[2])

      // This should evict file1.mov (oldest)
      await service.getThumbnail(mockFiles[3])

      const stats = service.getCacheStats()
      expect(stats.itemCount).toBe(3)
      expect(service.hasThumbnail(mockFiles[0])).toBe(false) // Should be evicted
      expect(service.hasThumbnail(mockFiles[3])).toBe(true) // Should be cached
    })

    it('should clear cache completely', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      await service.getThumbnail(mockFile)
      expect(service.hasThumbnail(mockFile)).toBe(true)

      await service.clearCache()

      expect(service.hasThumbnail(mockFile)).toBe(false)
      const stats = service.getCacheStats()
      expect(stats.itemCount).toBe(0)
    })

    it('should remove specific thumbnail', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      await service.getThumbnail(mockFile)
      expect(service.hasThumbnail(mockFile)).toBe(true)

      service.removeThumbnail(mockFile)
      expect(service.hasThumbnail(mockFile)).toBe(false)
    })
  })

  describe('getCacheSize', () => {
    it('should return total cache size in bytes', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      await service.getThumbnail(mockFile)

      const cacheSize = await service.getCacheSize()
      expect(cacheSize).toBeGreaterThan(0)
    })

    it('should return zero for empty cache', async () => {
      const cacheSize = await service.getCacheSize()
      expect(cacheSize).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('should return comprehensive cache statistics', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      await service.getThumbnail(mockFile)

      const stats = service.getCacheStats()
      
      expect(stats).toHaveProperty('itemCount')
      expect(stats).toHaveProperty('totalSizeBytes')
      expect(stats).toHaveProperty('totalSizeMB')
      expect(stats).toHaveProperty('maxCacheSize')
      expect(stats).toHaveProperty('maxMemoryMB')
      expect(stats).toHaveProperty('hitRate')

      expect(stats.itemCount).toBe(1)
      expect(stats.maxCacheSize).toBe(3)
      expect(stats.maxMemoryMB).toBe(1)
      expect(stats.totalSizeBytes).toBeGreaterThan(0)
      expect(stats.totalSizeMB).toBeGreaterThan(0)
    })
  })

  describe('hasThumbnail', () => {
    it('should return false for uncached files', () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      expect(service.hasThumbnail(mockFile)).toBe(false)
    })

    it('should return true for cached files', async () => {
      const mockFile: CameraFile = {
        name: 'test.mov',
        path: '/DCIM/test.mov',
        size: 1000000,
        isFolder: false,
      }

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      expect(service.hasThumbnail(mockFile)).toBe(false)

      await service.getThumbnail(mockFile)

      expect(service.hasThumbnail(mockFile)).toBe(true)
    })
  })

  describe('LRU behavior', () => {
    it('should update access order on repeated access', async () => {
      const mockFiles: CameraFile[] = [
        { name: 'file1.mov', path: '/DCIM/file1.mov', size: 1000, isFolder: false },
        { name: 'file2.mov', path: '/DCIM/file2.mov', size: 2000, isFolder: false },
        { name: 'file3.mov', path: '/DCIM/file3.mov', size: 3000, isFolder: false },
        { name: 'file4.mov', path: '/DCIM/file4.mov', size: 4000, isFolder: false },
      ]

      const mockThumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
      mockGenerationFunction.mockResolvedValue(mockThumbnail)

      // Fill cache
      await service.getThumbnail(mockFiles[0])
      await service.getThumbnail(mockFiles[1])
      await service.getThumbnail(mockFiles[2])

      // Access file1 again to make it most recently used
      await service.getThumbnail(mockFiles[0])

      // Add file4, should evict file2 (least recently used)
      await service.getThumbnail(mockFiles[3])

      expect(service.hasThumbnail(mockFiles[0])).toBe(true) // Should still be cached
      expect(service.hasThumbnail(mockFiles[1])).toBe(false) // Should be evicted
      expect(service.hasThumbnail(mockFiles[2])).toBe(true) // Should still be cached
      expect(service.hasThumbnail(mockFiles[3])).toBe(true) // Should be cached
    })
  })
})
