/**
 * Performance utilities for measuring and optimizing application performance
 */

// Performance measurement utilities
export class PerformanceProfiler {
  private static measurements: Map<string, number[]> = new Map()
  private static timers: Map<string, number> = new Map()

  /**
   * Start timing a performance operation
   */
  static start(label: string): void {
    this.timers.set(label, performance.now())
  }

  /**
   * End timing and record the measurement
   */
  static end(label: string): number {
    const startTime = this.timers.get(label)
    if (!startTime) {
      console.warn(`Performance timer '${label}' was not started`)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(label)

    // Record the measurement
    if (!this.measurements.has(label)) {
      this.measurements.set(label, [])
    }
    this.measurements.get(label)!.push(duration)

    return duration
  }

  /**
   * Get performance statistics for a measurement
   */
  static getStats(label: string): {
    count: number
    average: number
    min: number
    max: number
    p95: number
    p99: number
  } | null {
    const measurements = this.measurements.get(label)
    if (!measurements || measurements.length === 0) {
      return null
    }

    const sorted = [...measurements].sort((a, b) => a - b)
    const count = sorted.length
    const average = sorted.reduce((sum, val) => sum + val, 0) / count
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const p95Index = Math.floor(count * 0.95)
    const p99Index = Math.floor(count * 0.99)

    return {
      count,
      average,
      min,
      max,
      p95: sorted[p95Index],
      p99: sorted[p99Index],
    }
  }

  /**
   * Clear all measurements
   */
  static clear(): void {
    this.measurements.clear()
    this.timers.clear()
  }

  /**
   * Get all performance statistics
   */
  static getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {}
    for (const label of this.measurements.keys()) {
      stats[label] = this.getStats(label)
    }
    return stats
  }
}

// React performance utilities
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    PerformanceProfiler.start(`render-${componentName}`)
    const result = React.createElement(Component, props)
    PerformanceProfiler.end(`render-${componentName}`)
    return result
  })
}

// Memory usage tracking
export class MemoryProfiler {
  /**
   * Get current memory usage (if available)
   */
  static getMemoryUsage(): {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      }
    }
    return null
  }

  /**
   * Force garbage collection (if available)
   */
  static forceGC(): void {
    if ('gc' in window) {
      (window as any).gc()
    }
  }

  /**
   * Log memory usage with label
   */
  static logMemoryUsage(label: string): void {
    const memory = this.getMemoryUsage()
    if (memory) {
      console.log(`Memory ${label}:`, {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`,
        usage: `${Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)}%`,
      })
    }
  }
}

// Frame rate monitoring
export class FrameRateMonitor {
  private static frameCount = 0
  private static lastTime = 0
  private static fps = 0
  private static isMonitoring = false
  private static callback?: (fps: number) => void

  /**
   * Start monitoring frame rate
   */
  static start(callback?: (fps: number) => void): void {
    this.callback = callback
    this.isMonitoring = true
    this.frameCount = 0
    this.lastTime = performance.now()
    this.tick()
  }

  /**
   * Stop monitoring frame rate
   */
  static stop(): void {
    this.isMonitoring = false
  }

  /**
   * Get current FPS
   */
  static getFPS(): number {
    return this.fps
  }

  private static tick(): void {
    if (!this.isMonitoring) return

    this.frameCount++
    const currentTime = performance.now()
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
      this.frameCount = 0
      this.lastTime = currentTime
      
      if (this.callback) {
        this.callback(this.fps)
      }
    }

    requestAnimationFrame(() => this.tick())
  }
}

// Bundle size analyzer
export class BundleAnalyzer {
  /**
   * Get bundle size information
   */
  static getBundleInfo(): {
    scripts: HTMLScriptElement[]
    stylesheets: HTMLLinkElement[]
    totalScriptSize: number
    totalStyleSize: number
  } {
    const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[]
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[]
    
    let totalScriptSize = 0
    let totalStyleSize = 0

    // Note: This is a simplified version. In a real app, you'd need to fetch and measure actual file sizes
    scripts.forEach(script => {
      // Estimate based on common bundle sizes
      if (script.src.includes('main') || script.src.includes('app')) {
        totalScriptSize += 500000 // ~500KB for main bundle
      } else if (script.src.includes('vendor')) {
        totalScriptSize += 1000000 // ~1MB for vendor bundle
      }
    })

    stylesheets.forEach(link => {
      totalStyleSize += 50000 // ~50KB for stylesheets
    })

    return {
      scripts,
      stylesheets,
      totalScriptSize,
      totalStyleSize,
    }
  }
}

// Performance targets and thresholds
export const PERFORMANCE_TARGETS = {
  // Render performance
  FRAME_TIME_MS: 16.67, // 60fps
  FRAME_TIME_TARGET_MS: 13.33, // 75fps target
  
  // Memory usage
  MAX_MEMORY_MB: 200,
  MEMORY_WARNING_MB: 150,
  
  // Network performance
  MAX_DOWNLOAD_TIME_MS: 30000, // 30 seconds
  IDEAL_DOWNLOAD_SPEED_MBPS: 10,
  
  // Startup time
  MAX_STARTUP_TIME_MS: 2000, // 2 seconds
  IDEAL_STARTUP_TIME_MS: 1000, // 1 second
  
  // Thumbnail loading
  MAX_THUMBNAIL_LOAD_TIME_MS: 500,
  IDEAL_THUMBNAIL_LOAD_TIME_MS: 200,
} as const

// Performance reporter
export class PerformanceReporter {
  /**
   * Generate a comprehensive performance report
   */
  static generateReport(): {
    timestamp: string
    performance: ReturnType<typeof PerformanceProfiler.getAllStats>
    memory: ReturnType<typeof MemoryProfiler.getMemoryUsage>
    fps: number
    bundle: ReturnType<typeof BundleAnalyzer.getBundleInfo>
    recommendations: string[]
  } {
    const performance = PerformanceProfiler.getAllStats()
    const memory = MemoryProfiler.getMemoryUsage()
    const fps = FrameRateMonitor.getFPS()
    const bundle = BundleAnalyzer.getBundleInfo()
    
    const recommendations: string[] = []
    
    // Analyze performance and generate recommendations
    if (memory) {
      const memoryMB = memory.usedJSHeapSize / 1024 / 1024
      if (memoryMB > PERFORMANCE_TARGETS.MEMORY_WARNING_MB) {
        recommendations.push(`High memory usage: ${Math.round(memoryMB)}MB. Consider optimizing thumbnail cache or reducing concurrent operations.`)
      }
    }
    
    if (fps < 60) {
      recommendations.push(`Low frame rate: ${fps}fps. Consider optimizing render performance or reducing component complexity.`)
    }
    
    Object.entries(performance).forEach(([label, stats]) => {
      if (stats && stats.average > PERFORMANCE_TARGETS.MAX_THUMBNAIL_LOAD_TIME_MS && label.includes('thumbnail')) {
        recommendations.push(`Slow thumbnail loading: ${Math.round(stats.average)}ms average for ${label}. Consider optimizing thumbnail generation or caching.`)
      }
    })
    
    return {
      timestamp: new Date().toISOString(),
      performance,
      memory,
      fps,
      bundle,
      recommendations,
    }
  }
  
  /**
   * Log performance report to console
   */
  static logReport(): void {
    const report = this.generateReport()
    console.group('🚀 Performance Report')
    console.log('Timestamp:', report.timestamp)
    console.log('Memory Usage:', report.memory)
    console.log('Frame Rate:', report.fps, 'fps')
    console.log('Bundle Info:', report.bundle)
    console.log('Performance Stats:', report.performance)
    
    if (report.recommendations.length > 0) {
      console.group('📋 Recommendations')
      report.recommendations.forEach(rec => console.log('•', rec))
      console.groupEnd()
    }
    
    console.groupEnd()
  }
}

