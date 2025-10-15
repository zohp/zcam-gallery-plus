import React, { useEffect, useState, useCallback } from 'react'
import { 
  PerformanceProfiler, 
  MemoryProfiler, 
  FrameRateMonitor, 
  PerformanceReporter,
  PERFORMANCE_TARGETS 
} from '../../../utils/performance'
import { useRenderPerformance, useMemoryMonitor, useFrameRateMonitor } from '../../hooks/usePerformance'
import styles from './PerformanceMonitor.module.css'

interface PerformanceMonitorProps {
  enabled?: boolean
  showDashboard?: boolean
  onPerformanceIssue?: (issue: string) => void
}

/**
 * Performance monitoring component that tracks and reports performance issues
 * 
 * Features:
 * - Real-time performance monitoring
 * - Automatic issue detection and reporting
 * - Performance dashboard integration
 * - Memory leak detection
 * - Frame rate monitoring
 * - Automatic optimization suggestions
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = true,
  showDashboard = false,
  onPerformanceIssue,
}) => {
  const { renderCount } = useRenderPerformance('PerformanceMonitor')
  const { getCurrentMemory } = useMemoryMonitor('PerformanceMonitor', 2000)
  const { fps, isSmooth } = useFrameRateMonitor('PerformanceMonitor')
  
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [performanceIssues, setPerformanceIssues] = useState<string[]>([])
  const [lastReport, setLastReport] = useState<any>(null)
  const [showMiniDashboard, setShowMiniDashboard] = useState(false)

  // Performance thresholds
  const thresholds = {
    fps: 55, // Minimum acceptable FPS
    memory: 150, // MB - Warning threshold
    memoryCritical: 200, // MB - Critical threshold
    renderTime: 20, // ms - Maximum render time
    memoryGrowth: 10, // MB - Memory growth per check
  }

  // Check for performance issues
  const checkPerformanceIssues = useCallback(() => {
    const issues: string[] = []
    
    // Check FPS
    if (fps > 0 && fps < thresholds.fps) {
      issues.push(`Low frame rate: ${fps}fps (target: 60fps)`)
    }
    
    // Check memory usage
    const currentMemory = getCurrentMemory()
    if (currentMemory > thresholds.memoryCritical) {
      issues.push(`Critical memory usage: ${currentMemory.toFixed(1)}MB (limit: ${thresholds.memoryCritical}MB)`)
    } else if (currentMemory > thresholds.memory) {
      issues.push(`High memory usage: ${currentMemory.toFixed(1)}MB (warning: ${thresholds.memory}MB)`)
    }
    
    // Check render performance
    const renderStats = PerformanceProfiler.getStats('render-PerformanceMonitor')
    if (renderStats && renderStats.average > thresholds.renderTime) {
      issues.push(`Slow render performance: ${renderStats.average.toFixed(2)}ms average`)
    }
    
    // Check for memory leaks (simplified detection)
    if (lastReport?.memory && currentMemory > lastReport.memory + thresholds.memoryGrowth) {
      issues.push(`Potential memory leak: ${(currentMemory - lastReport.memory).toFixed(1)}MB growth`)
    }
    
    setPerformanceIssues(issues)
    
    // Report issues to parent component
    if (issues.length > 0 && onPerformanceIssue) {
      issues.forEach(issue => onPerformanceIssue(issue))
    }
  }, [fps, getCurrentMemory, lastReport, onPerformanceIssue, thresholds])

  // Generate performance report
  const generateReport = useCallback(() => {
    const report = PerformanceReporter.generateReport()
    setLastReport(report)
    return report
  }, [])

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      FrameRateMonitor.stop()
      PerformanceProfiler.clear()
      setIsMonitoring(false)
    } else {
      FrameRateMonitor.start()
      PerformanceProfiler.clear()
      setIsMonitoring(true)
    }
  }, [isMonitoring])

  // Monitor performance when enabled
  useEffect(() => {
    if (!enabled) return

    // Start monitoring
    if (!isMonitoring) {
      toggleMonitoring()
    }

    // Check for issues every 5 seconds
    const issueCheckInterval = setInterval(checkPerformanceIssues, 5000)
    
    // Generate reports every 30 seconds
    const reportInterval = setInterval(generateReport, 30000)

    return () => {
      clearInterval(issueCheckInterval)
      clearInterval(reportInterval)
    }
  }, [enabled, isMonitoring, toggleMonitoring, checkPerformanceIssues, generateReport])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        FrameRateMonitor.stop()
      }
    }
  }, [isMonitoring])

  // Don't render anything if monitoring is disabled
  if (!enabled) return null

  // Mini dashboard for development
  if (showMiniDashboard) {
    return (
      <div className={styles.miniDashboard}>
        <div className={styles.miniHeader}>
          <span className={styles.miniTitle}>Performance</span>
          <button 
            className={styles.miniToggle}
            onClick={() => setShowMiniDashboard(false)}
            title="Close performance monitor"
          >
            ×
          </button>
        </div>
        
        <div className={styles.miniMetrics}>
          <div className={`${styles.miniMetric} ${isSmooth ? styles.good : styles.warning}`}>
            <span className={styles.miniLabel}>FPS</span>
            <span className={styles.miniValue}>{fps}</span>
          </div>
          
          <div className={`${styles.miniMetric} ${getCurrentMemory() > thresholds.memory ? styles.warning : styles.good}`}>
            <span className={styles.miniLabel}>Memory</span>
            <span className={styles.miniValue}>{getCurrentMemory().toFixed(0)}MB</span>
          </div>
          
          <div className={styles.miniMetric}>
            <span className={styles.miniLabel}>Renders</span>
            <span className={styles.miniValue}>{renderCount}</span>
          </div>
        </div>
        
        {performanceIssues.length > 0 && (
          <div className={styles.miniIssues}>
            <span className={styles.miniIssuesTitle}>⚠️ Issues: {performanceIssues.length}</span>
          </div>
        )}
      </div>
    )
  }

  // Show dashboard button if enabled
  if (showDashboard) {
    return (
      <div className={styles.dashboardButton}>
        <button 
          className={styles.monitorButton}
          onClick={() => setShowMiniDashboard(true)}
          title="Open performance monitor"
        >
          📊
          {performanceIssues.length > 0 && (
            <span className={styles.issueBadge}>{performanceIssues.length}</span>
          )}
        </button>
      </div>
    )
  }

  // Hidden monitoring component
  return null
}

// Performance issue detector hook
export function usePerformanceIssues() {
  const [issues, setIssues] = useState<string[]>([])
  
  const reportIssue = useCallback((issue: string) => {
    setIssues(prev => [...prev, issue])
  }, [])
  
  const clearIssues = useCallback(() => {
    setIssues([])
  }, [])
  
  return {
    issues,
    reportIssue,
    clearIssues,
    hasIssues: issues.length > 0,
  }
}

// Performance optimization suggestions
export const PerformanceSuggestions = {
  lowFps: [
    'Reduce component complexity',
    'Use React.memo for expensive components',
    'Implement virtual scrolling',
    'Optimize image loading',
    'Reduce DOM elements',
  ],
  highMemory: [
    'Clear unused caches',
    'Implement LRU cache eviction',
    'Use lazy loading',
    'Optimize thumbnail generation',
    'Clean up event listeners',
  ],
  slowRenders: [
    'Memoize expensive calculations',
    'Use useCallback for event handlers',
    'Split large components',
    'Optimize state updates',
    'Use React DevTools Profiler',
  ],
  memoryLeaks: [
    'Check for uncleaned timers',
    'Remove event listeners on unmount',
    'Clear references to DOM elements',
    'Use WeakMap for object references',
    'Implement proper cleanup in useEffect',
  ],
}
