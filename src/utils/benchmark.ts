/**
 * Performance benchmarking utilities for measuring application performance
 */

import { PerformanceProfiler, MemoryProfiler, FrameRateMonitor, PERFORMANCE_TARGETS } from './performance'

export interface BenchmarkResult {
  name: string
  duration: number
  memoryBefore: number
  memoryAfter: number
  memoryDelta: number
  passed: boolean
  target: number
  details?: string
}

export interface BenchmarkSuite {
  name: string
  results: BenchmarkResult[]
  summary: {
    totalTests: number
    passed: number
    failed: number
    averageDuration: number
    totalDuration: number
  }
}

/**
 * Benchmark runner for performance testing
 */
export class BenchmarkRunner {
  private results: BenchmarkResult[] = []
  private currentSuite: string = ''

  /**
   * Start a new benchmark suite
   */
  startSuite(name: string): void {
    this.currentSuite = name
    this.results = []
    console.log(`🚀 Starting benchmark suite: ${name}`)
  }

  /**
   * Run a single benchmark
   */
  async runBenchmark<T>(
    name: string,
    fn: () => Promise<T> | T,
    targetDurationMs: number = 100
  ): Promise<T> {
    const memoryBefore = this.getMemoryUsage()
    const startTime = performance.now()

    try {
      const result = await fn()
      const duration = performance.now() - startTime
      const memoryAfter = this.getMemoryUsage()
      const memoryDelta = memoryAfter - memoryBefore

      const benchmarkResult: BenchmarkResult = {
        name,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        passed: duration <= targetDurationMs,
        target: targetDurationMs,
        details: `Duration: ${duration.toFixed(2)}ms, Memory: ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(1)}MB`,
      }

      this.results.push(benchmarkResult)

      const status = benchmarkResult.passed ? '✅' : '❌'
      console.log(`${status} ${name}: ${benchmarkResult.details}`)

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      const memoryAfter = this.getMemoryUsage()
      const memoryDelta = memoryAfter - memoryBefore

      const benchmarkResult: BenchmarkResult = {
        name,
        duration,
        memoryBefore,
        memoryAfter,
        memoryDelta,
        passed: false,
        target: targetDurationMs,
        details: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }

      this.results.push(benchmarkResult)
      console.log(`❌ ${name}: ${benchmarkResult.details}`)
      throw error
    }
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    const memory = MemoryProfiler.getMemoryUsage()
    return memory ? memory.usedJSHeapSize / 1024 / 1024 : 0
  }

  /**
   * Complete the current benchmark suite
   */
  completeSuite(): BenchmarkSuite {
    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      averageDuration: this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
    }

    const suite: BenchmarkSuite = {
      name: this.currentSuite,
      results: [...this.results],
      summary,
    }

    this.logSuiteResults(suite)
    return suite
  }

  /**
   * Log suite results
   */
  private logSuiteResults(suite: BenchmarkSuite): void {
    console.log(`\n📊 Benchmark Suite Results: ${suite.name}`)
    console.log(`Total Tests: ${suite.summary.totalTests}`)
    console.log(`Passed: ${suite.summary.passed} ✅`)
    console.log(`Failed: ${suite.summary.failed} ❌`)
    console.log(`Average Duration: ${suite.summary.averageDuration.toFixed(2)}ms`)
    console.log(`Total Duration: ${suite.summary.totalDuration.toFixed(2)}ms`)
    console.log(`Success Rate: ${((suite.summary.passed / suite.summary.totalTests) * 100).toFixed(1)}%`)

    if (suite.summary.failed > 0) {
      console.log('\n❌ Failed Benchmarks:')
      suite.results.filter(r => !r.passed).forEach(result => {
        console.log(`  • ${result.name}: ${result.details}`)
      })
    }
  }
}

/**
 * Predefined benchmark suites
 */
export class PerformanceBenchmarks {
  private runner = new BenchmarkRunner()

  /**
   * Benchmark React component rendering performance
   */
  async benchmarkComponentRendering(): Promise<BenchmarkSuite> {
    this.runner.startSuite('Component Rendering Performance')

    // Mock component rendering benchmark
    await this.runner.runBenchmark(
      'Simple Component Render',
      () => {
        // Simulate a simple component render
        const start = performance.now()
        // Mock DOM operations
        for (let i = 0; i < 1000; i++) {
          Math.random() * 1000 // Simulate computation
        }
        return performance.now() - start
      },
      PERFORMANCE_TARGETS.FRAME_TIME_MS
    )

    await this.runner.runBenchmark(
      'Complex Component Render',
      () => {
        // Simulate a complex component render with many elements
        const start = performance.now()
        for (let i = 0; i < 5000; i++) {
          Math.random() * 1000 // Simulate heavy computation
        }
        return performance.now() - start
      },
      PERFORMANCE_TARGETS.FRAME_TIME_MS * 3 // Allow 3x frame time for complex renders
    )

    await this.runner.runBenchmark(
      'Virtual Scrolling Render',
      () => {
        // Simulate virtual scrolling performance
        const start = performance.now()
        // Simulate rendering 100 visible items
        for (let i = 0; i < 100; i++) {
          Math.random() * 100 // Simulate item rendering
        }
        return performance.now() - start
      },
      PERFORMANCE_TARGETS.FRAME_TIME_MS * 2
    )

    return this.runner.completeSuite()
  }

  /**
   * Benchmark memory usage patterns
   */
  async benchmarkMemoryUsage(): Promise<BenchmarkSuite> {
    this.runner.startSuite('Memory Usage Performance')

    await this.runner.runBenchmark(
      'Thumbnail Cache Memory',
      () => {
        // Simulate thumbnail cache memory usage
        const thumbnails = []
        for (let i = 0; i < 100; i++) {
          // Simulate 50KB thumbnail
          thumbnails.push(new Array(50 * 1024).fill(Math.random()))
        }
        return thumbnails.length
      },
      50 // 50ms target
    )

    await this.runner.runBenchmark(
      'Large File Processing',
      () => {
        // Simulate processing large files
        const data = []
        for (let i = 0; i < 10; i++) {
          // Simulate 1MB file chunks
          data.push(new Array(1024 * 1024).fill(Math.random()))
        }
        return data.length
      },
      100 // 100ms target
    )

    await this.runner.runBenchmark(
      'Memory Cleanup',
      () => {
        // Simulate memory cleanup
        const largeArray = new Array(1000).fill(new Array(1000).fill(Math.random()))
        // Simulate cleanup
        largeArray.length = 0
        return 0
      },
      10 // 10ms target
    )

    return this.runner.completeSuite()
  }

  /**
   * Benchmark network and I/O operations
   */
  async benchmarkNetworkOperations(): Promise<BenchmarkSuite> {
    this.runner.startSuite('Network & I/O Performance')

    await this.runner.runBenchmark(
      'HTTP Request Simulation',
      async () => {
        // Simulate HTTP request
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'response'
      },
      PERFORMANCE_TARGETS.MAX_DOWNLOAD_TIME_MS / 100 // 1% of max download time
    )

    await this.runner.runBenchmark(
      'File Read Simulation',
      async () => {
        // Simulate file read operation
        await new Promise(resolve => setTimeout(resolve, 25))
        return 'file content'
      },
      50
    )

    await this.runner.runBenchmark(
      'Thumbnail Generation',
      async () => {
        // Simulate thumbnail generation
        await new Promise(resolve => setTimeout(resolve, 200))
        return 'thumbnail data'
      },
      PERFORMANCE_TARGETS.MAX_THUMBNAIL_LOAD_TIME_MS
    )

    return this.runner.completeSuite()
  }

  /**
   * Benchmark state management performance
   */
  async benchmarkStateManagement(): Promise<BenchmarkSuite> {
    this.runner.startSuite('State Management Performance')

    await this.runner.runBenchmark(
      'State Update',
      () => {
        // Simulate state update
        const state = { items: [] }
        for (let i = 0; i < 1000; i++) {
          state.items.push({ id: i, value: Math.random() })
        }
        return state.items.length
      },
      PERFORMANCE_TARGETS.FRAME_TIME_MS
    )

    await this.runner.runBenchmark(
      'Large State Filter',
      () => {
        // Simulate filtering large state
        const items = new Array(10000).fill(null).map((_, i) => ({ id: i, name: `Item ${i}` }))
        const filtered = items.filter(item => item.id % 2 === 0)
        return filtered.length
      },
      PERFORMANCE_TARGETS.FRAME_TIME_MS * 2
    )

    await this.runner.runBenchmark(
      'Context Provider Update',
      () => {
        // Simulate context provider update
        const context = { data: [], loading: false }
        // Simulate context update
        context.data = new Array(100).fill(null).map((_, i) => ({ id: i }))
        context.loading = true
        context.loading = false
        return context.data.length
      },
      PERFORMANCE_TARGETS.FRAME_TIME_MS
    )

    return this.runner.completeSuite()
  }

  /**
   * Run all benchmark suites
   */
  async runAllBenchmarks(): Promise<BenchmarkSuite[]> {
    console.log('🚀 Starting comprehensive performance benchmarks...\n')

    const suites = await Promise.all([
      this.benchmarkComponentRendering(),
      this.benchmarkMemoryUsage(),
      this.benchmarkNetworkOperations(),
      this.benchmarkStateManagement(),
    ])

    this.logOverallResults(suites)
    return suites
  }

  /**
   * Log overall benchmark results
   */
  private logOverallResults(suites: BenchmarkSuite[]): void {
    console.log('\n🎯 Overall Performance Summary')
    console.log('================================')

    const totalTests = suites.reduce((sum, suite) => sum + suite.summary.totalTests, 0)
    const totalPassed = suites.reduce((sum, suite) => sum + suite.summary.passed, 0)
    const totalFailed = suites.reduce((sum, suite) => sum + suite.summary.failed, 0)
    const totalDuration = suites.reduce((sum, suite) => sum + suite.summary.totalDuration, 0)

    console.log(`Total Test Suites: ${suites.length}`)
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Overall Pass Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`)
    console.log(`Total Benchmark Time: ${totalDuration.toFixed(2)}ms`)

    console.log('\n📋 Suite Breakdown:')
    suites.forEach(suite => {
      const passRate = ((suite.summary.passed / suite.summary.totalTests) * 100).toFixed(1)
      console.log(`  ${suite.name}: ${suite.summary.passed}/${suite.summary.totalTests} (${passRate}%)`)
    })

    if (totalFailed > 0) {
      console.log('\n⚠️  Performance Issues Detected:')
      suites.forEach(suite => {
        if (suite.summary.failed > 0) {
          console.log(`\n${suite.name}:`)
          suite.results.filter(r => !r.passed).forEach(result => {
            console.log(`  ❌ ${result.name}: ${result.details}`)
          })
        }
      })
    }

    console.log('\n✅ Performance benchmarking complete!')
  }
}

/**
 * Quick performance check function
 */
export async function quickPerformanceCheck(): Promise<void> {
  const benchmarks = new PerformanceBenchmarks()
  
  console.log('🔍 Running quick performance check...')
  
  // Run a subset of critical benchmarks
  await benchmarks.benchmarkComponentRendering()
  
  console.log('✅ Quick performance check complete!')
}

/**
 * Export benchmark runner instance
 */
export const benchmarkRunner = new BenchmarkRunner()
export const performanceBenchmarks = new PerformanceBenchmarks()
