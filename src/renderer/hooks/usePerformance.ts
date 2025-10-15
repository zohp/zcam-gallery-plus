import { useEffect, useRef, useCallback } from 'react'
import { PerformanceProfiler, MemoryProfiler, FrameRateMonitor, PERFORMANCE_TARGETS } from '../../utils/performance'

/**
 * Hook for tracking component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(performance.now())

  useEffect(() => {
    renderCountRef.current++
    const currentTime = performance.now()
    const timeSinceLastRender = currentTime - lastRenderTimeRef.current
    lastRenderTimeRef.current = currentTime

    // Log slow renders
    if (timeSinceLastRender > PERFORMANCE_TARGETS.FRAME_TIME_MS) {
      console.warn(`Slow render in ${componentName}: ${timeSinceLastRender.toFixed(2)}ms`)
    }
  })

  return {
    renderCount: renderCountRef.current,
    trackRender: useCallback((operation: string) => {
      PerformanceProfiler.start(`${componentName}-${operation}`)
      return () => PerformanceProfiler.end(`${componentName}-${operation}`)
    }, [componentName]),
  }
}

/**
 * Hook for monitoring memory usage
 */
export function useMemoryMonitor(componentName: string, intervalMs = 5000) {
  const memoryRef = useRef<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const memory = MemoryProfiler.getMemoryUsage()
      if (memory) {
        const currentMemory = memory.usedJSHeapSize / 1024 / 1024
        const memoryDiff = currentMemory - memoryRef.current
        
        // Log significant memory changes
        if (Math.abs(memoryDiff) > 10) {
          console.log(`${componentName} memory change: ${memoryDiff > 0 ? '+' : ''}${memoryDiff.toFixed(1)}MB`)
        }
        
        memoryRef.current = currentMemory
        
        // Warning for high memory usage
        if (currentMemory > PERFORMANCE_TARGETS.MEMORY_WARNING_MB) {
          console.warn(`${componentName} high memory usage: ${currentMemory.toFixed(1)}MB`)
        }
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [componentName, intervalMs])

  return {
    getCurrentMemory: useCallback(() => {
      const memory = MemoryProfiler.getMemoryUsage()
      return memory ? memory.usedJSHeapSize / 1024 / 1024 : 0
    }, []),
  }
}

/**
 * Hook for monitoring frame rate
 */
export function useFrameRateMonitor(componentName: string) {
  const fpsRef = useRef<number>(0)

  useEffect(() => {
    FrameRateMonitor.start((fps) => {
      fpsRef.current = fps
      
      // Log low frame rate
      if (fps < 60) {
        console.warn(`${componentName} low frame rate: ${fps}fps`)
      }
    })

    return () => FrameRateMonitor.stop()
  }, [componentName])

  return {
    fps: fpsRef.current,
    isSmooth: fpsRef.current >= 60,
  }
}

/**
 * Hook for tracking async operations
 */
export function useAsyncPerformance(componentName: string) {
  const trackAsync = useCallback(async <T>(
    operation: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    PerformanceProfiler.start(`${componentName}-${operation}`)
    try {
      const result = await asyncFn()
      return result
    } finally {
      PerformanceProfiler.end(`${componentName}-${operation}`)
    }
  }, [componentName])

  return { trackAsync }
}

/**
 * Hook for optimizing expensive computations
 */
export function useOptimizedComputation<T>(
  computeFn: () => T,
  deps: React.DependencyList,
  componentName: string
): T {
  const computeWithPerformance = useCallback(() => {
    PerformanceProfiler.start(`${componentName}-computation`)
    const result = computeFn()
    PerformanceProfiler.end(`${componentName}-computation`)
    return result
  }, deps)

  return computeWithPerformance()
}

/**
 * Hook for debouncing expensive operations
 */
export function useDebounce<T>(
  value: T,
  delay: number,
  componentName: string
): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  useEffect(() => {
    PerformanceProfiler.start(`${componentName}-debounce`)
    
    const handler = setTimeout(() => {
      setDebouncedValue(value)
      PerformanceProfiler.end(`${componentName}-debounce`)
    }, delay)

    return () => {
      clearTimeout(handler)
      PerformanceProfiler.end(`${componentName}-debounce`)
    }
  }, [value, delay, componentName])

  return debouncedValue
}

/**
 * Hook for throttling expensive operations
 */
export function useThrottle<T>(
  value: T,
  limit: number,
  componentName: string
): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value)
  const lastRan = useRef<number>(Date.now())

  useEffect(() => {
    PerformanceProfiler.start(`${componentName}-throttle`)
    
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
      PerformanceProfiler.end(`${componentName}-throttle`)
    }, limit - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
      PerformanceProfiler.end(`${componentName}-throttle`)
    }
  }, [value, limit, componentName])

  return throttledValue
}

/**
 * Hook for intersection observer optimization
 */
export function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {},
  componentName: string
) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    PerformanceProfiler.start(`${componentName}-intersection-observer`)
    
    observerRef.current = new IntersectionObserver((entries, observer) => {
      PerformanceProfiler.start(`${componentName}-intersection-callback`)
      callback(entries, observer)
      PerformanceProfiler.end(`${componentName}-intersection-callback`)
    }, options)

    PerformanceProfiler.end(`${componentName}-intersection-observer`)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [callback, options, componentName])

  return observerRef.current
}

/**
 * Hook for measuring component mount/unmount times
 */
export function useMountPerformance(componentName: string) {
  const mountTimeRef = useRef<number>(0)

  useEffect(() => {
    mountTimeRef.current = performance.now()
    PerformanceProfiler.start(`${componentName}-mount`)

    return () => {
      const unmountTime = performance.now()
      const totalTime = unmountTime - mountTimeRef.current
      PerformanceProfiler.end(`${componentName}-mount`)
      
      console.log(`${componentName} total lifecycle time: ${totalTime.toFixed(2)}ms`)
    }
  }, [componentName])

  return {
    getMountTime: () => performance.now() - mountTimeRef.current,
  }
}

