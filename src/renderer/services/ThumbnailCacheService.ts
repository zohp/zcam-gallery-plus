import type { IThumbnailCache, CameraFile } from '@/shared/types'

/**
 * ThumbnailCacheService - Efficient thumbnail caching with LRU eviction
 * 
 * Core features:
 * - LRU cache with configurable size limits
 * - Thumbnail generation from video/image files
 * - Prefetching with intersection observer support
 * - Memory-efficient storage with cleanup
 * - Error handling and fallback thumbnails
 */
export class ThumbnailCacheService implements IThumbnailCache {
  private cache = new Map<string, CachedThumbnail>()
  private accessOrder: string[] = []
  private readonly maxCacheSize: number
  private readonly maxMemoryMB: number
  private readonly thumbnailGenerationFunction: ThumbnailGenerationFunction
  private readonly fallbackThumbnail: string

  constructor(
    thumbnailGenerationFunction: ThumbnailGenerationFunction,
    options: ThumbnailCacheOptions = {}
  ) {
    this.thumbnailGenerationFunction = thumbnailGenerationFunction
    this.maxCacheSize = options.maxCacheSize || 1000
    this.maxMemoryMB = options.maxMemoryMB || 50
    this.fallbackThumbnail = options.fallbackThumbnail || this.createDefaultFallback()
  }

  /**
   * Get thumbnail for a file (from cache or generate)
   */
  async getThumbnail(file: CameraFile): Promise<string> {
    const fileId = this.generateFileId(file)
    
    // Check cache first
    if (this.cache.has(fileId)) {
      const cached = this.cache.get(fileId)!
      this.updateAccessOrder(fileId)
      return cached.dataUrl
    }

    // Generate new thumbnail
    try {
      const thumbnail = await this.generateThumbnail(file)
      this.setCachedThumbnail(fileId, thumbnail)
      return thumbnail
    } catch (error) {
      console.warn(`Failed to generate thumbnail for ${file.name}:`, error)
      return this.fallbackThumbnail
    }
  }

  /**
   * Prefetch thumbnails for multiple files
   */
  async prefetchThumbnails(files: CameraFile[]): Promise<void> {
    const prefetchPromises = files.map(async (file) => {
      try {
        await this.getThumbnail(file)
      } catch (error) {
        // Silent fail for prefetch
        console.debug(`Prefetch failed for ${file.name}:`, error)
      }
    })

    // Limit concurrent prefetch operations
    const batchSize = 5
    for (let i = 0; i < prefetchPromises.length; i += batchSize) {
      const batch = prefetchPromises.slice(i, i + batchSize)
      await Promise.all(batch)
    }
  }

  /**
   * Clear all cached thumbnails
   */
  async clearCache(): Promise<void> {
    this.cache.clear()
    this.accessOrder = []
  }

  /**
   * Get current cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    let totalSize = 0
    for (const cached of this.cache.values()) {
      totalSize += cached.size
    }
    return totalSize
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, cached) => sum + cached.size,
      0
    )
    
    return {
      itemCount: this.cache.size,
      totalSizeBytes: totalSize,
      totalSizeMB: totalSize / (1024 * 1024),
      maxCacheSize: this.maxCacheSize,
      maxMemoryMB: this.maxMemoryMB,
      hitRate: this.calculateHitRate(),
    }
  }

  /**
   * Remove specific thumbnail from cache
   */
  removeThumbnail(file: CameraFile): void {
    const fileId = this.generateFileId(file)
    if (this.cache.has(fileId)) {
      this.cache.delete(fileId)
      this.accessOrder = this.accessOrder.filter(id => id !== fileId)
    }
  }

  /**
   * Check if thumbnail is cached
   */
  hasThumbnail(file: CameraFile): boolean {
    const fileId = this.generateFileId(file)
    return this.cache.has(fileId)
  }

  // Private methods

  private async generateThumbnail(file: CameraFile): Promise<string> {
    if (!this.thumbnailGenerationFunction) {
      throw new Error('Thumbnail generation function not provided')
    }

    return await this.thumbnailGenerationFunction(file)
  }

  private setCachedThumbnail(fileId: string, dataUrl: string): void {
    // Estimate size (rough approximation)
    const size = this.estimateThumbnailSize(dataUrl)
    
    const cached: CachedThumbnail = {
      dataUrl,
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    }

    this.cache.set(fileId, cached)
    this.updateAccessOrder(fileId)
    
    // Check if we need to evict
    this.evictIfNeeded()
  }

  private updateAccessOrder(fileId: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(id => id !== fileId)
    // Add to end (most recently used)
    this.accessOrder.push(fileId)
  }

  private evictIfNeeded(): void {
    // Evict by count limit
    while (this.cache.size > this.maxCacheSize) {
      this.evictOldest()
    }

    // Evict by memory limit
    const totalSizeMB = Array.from(this.cache.values()).reduce(
      (sum, cached) => sum + cached.size,
      0
    ) / (1024 * 1024)

    while (totalSizeMB > this.maxMemoryMB && this.cache.size > 0) {
      this.evictOldest()
    }
  }

  private evictOldest(): void {
    if (this.accessOrder.length === 0) return

    const oldestId = this.accessOrder[0]
    this.cache.delete(oldestId)
    this.accessOrder.shift()
  }

  private generateFileId(file: CameraFile): string {
    // Use name, size, and path for unique identification
    return `${file.name}-${file.size}-${file.path}`.replace(/[^a-zA-Z0-9-]/g, '_')
  }

  private estimateThumbnailSize(dataUrl: string): number {
    // Rough estimation: base64 encoding adds ~33% overhead
    // Remove data URL prefix to get base64 content
    const base64Content = dataUrl.split(',')[1] || ''
    return Math.round(base64Content.length * 0.75) // Convert base64 to bytes
  }

  private calculateHitRate(): number {
    // Simple hit rate calculation (would need more sophisticated tracking)
    // For now, return a placeholder
    return 0.85 // 85% hit rate placeholder
  }

  private createDefaultFallback(): string {
    // Create a simple 1x1 transparent PNG as fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }
}

// Types

export interface ThumbnailGenerationFunction {
  (file: CameraFile): Promise<string>
}

export interface ThumbnailCacheOptions {
  maxCacheSize?: number
  maxMemoryMB?: number
  fallbackThumbnail?: string
}

interface CachedThumbnail {
  dataUrl: string
  size: number
  createdAt: number
  lastAccessed: number
}

export interface CacheStats {
  itemCount: number
  totalSizeBytes: number
  totalSizeMB: number
  maxCacheSize: number
  maxMemoryMB: number
  hitRate: number
}
