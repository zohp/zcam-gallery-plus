import React, { useState, useEffect, useCallback } from 'react'
import { 
  PerformanceProfiler, 
  MemoryProfiler, 
  FrameRateMonitor, 
  PerformanceReporter,
  PERFORMANCE_TARGETS 
} from '../../../utils/performance'
import { useRenderPerformance, useMemoryMonitor, useFrameRateMonitor } from '../../hooks/usePerformance'
import styles from './PerformanceDashboard.module.css'

interface PerformanceDashboardProps {
  isVisible: boolean
  onClose: () => void
}

interface PerformanceMetrics {
  fps: number
  memory: {
    used: number
    total: number
    limit: number
    usage: number
  } | null
  performance: Record<string, any>
  recommendations: string[]
}

/**
 * Performance monitoring dashboard for development and optimization
 * 
 * Features:
 * - Real-time FPS monitoring
 * - Memory usage tracking
 * - Performance metrics display
 * - Optimization recommendations
 * - Export performance reports
 */
export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible,
  onClose,
}) => {
  const { renderCount } = useRenderPerformance('PerformanceDashboard')
  const { getCurrentMemory } = useMemoryMonitor('PerformanceDashboard', 1000)
  const { fps, isSmooth } = useFrameRateMonitor('PerformanceDashboard')
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: null,
    performance: {},
    recommendations: [],
  })
  
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [reportHistory, setReportHistory] = useState<any[]>([])

  // Update metrics periodically
  const updateMetrics = useCallback(() => {
    const memory = MemoryProfiler.getMemoryUsage()
    const performance = PerformanceProfiler.getAllStats()
    const report = PerformanceReporter.generateReport()
    
    setMetrics({
      fps,
      memory: memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        usage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      } : null,
      performance,
      recommendations: report.recommendations,
    })
  }, [fps])

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

  // Generate and save report
  const generateReport = useCallback(() => {
    const report = PerformanceReporter.generateReport()
    setReportHistory(prev => [report, ...prev.slice(0, 9)]) // Keep last 10 reports
    
    // Log to console
    PerformanceReporter.logReport()
    
    // Could also save to file or send to analytics
    console.log('Performance report generated:', report)
  }, [])

  // Export report as JSON
  const exportReport = useCallback(() => {
    const report = PerformanceReporter.generateReport()
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Force garbage collection
  const forceGC = useCallback(() => {
    MemoryProfiler.forceGC()
    updateMetrics()
  }, [updateMetrics])

  // Update metrics every second
  useEffect(() => {
    const interval = setInterval(updateMetrics, 1000)
    return () => clearInterval(interval)
  }, [updateMetrics])

  // Start monitoring when dashboard opens
  useEffect(() => {
    if (isVisible && !isMonitoring) {
      toggleMonitoring()
    }
  }, [isVisible, isMonitoring, toggleMonitoring])

  if (!isVisible) return null

  return (
    <div className={styles.dashboard} role="dialog" aria-modal="true" aria-labelledby="dashboard-title">
      <div className={styles.header}>
        <h2 id="dashboard-title">Performance Dashboard</h2>
        <button onClick={onClose} className={styles.closeButton} aria-label="Close dashboard">
          ×
        </button>
      </div>

      <div className={styles.content}>
        {/* Control Panel */}
        <div className={styles.controlPanel}>
          <button 
            onClick={toggleMonitoring} 
            className={`${styles.button} ${isMonitoring ? styles.buttonActive : ''}`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button onClick={generateReport} className={styles.button}>
            Generate Report
          </button>
          <button onClick={exportReport} className={styles.button}>
            Export Report
          </button>
          <button onClick={forceGC} className={styles.button}>
            Force GC
          </button>
        </div>

        {/* Real-time Metrics */}
        <div className={styles.metricsGrid}>
          {/* FPS */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Frame Rate</span>
              <span className={`${styles.metricValue} ${isSmooth ? styles.metricGood : styles.metricWarning}`}>
                {fps} fps
              </span>
            </div>
            <div className={styles.metricBar}>
              <div 
                className={`${styles.metricBarFill} ${isSmooth ? styles.metricGood : styles.metricWarning}`}
                style={{ width: `${Math.min((fps / 60) * 100, 100)}%` }}
              />
            </div>
            <div className={styles.metricTarget}>
              Target: {PERFORMANCE_TARGETS.FRAME_TIME_MS}ms ({Math.round(1000 / PERFORMANCE_TARGETS.FRAME_TIME_MS)}fps)
            </div>
          </div>

          {/* Memory */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Memory Usage</span>
              <span className={`${styles.metricValue} ${metrics.memory?.usage && metrics.memory.usage > 80 ? styles.metricWarning : styles.metricGood}`}>
                {metrics.memory ? `${metrics.memory.used}MB` : 'N/A'}
              </span>
            </div>
            {metrics.memory && (
              <>
                <div className={styles.metricBar}>
                  <div 
                    className={`${styles.metricBarFill} ${metrics.memory.usage > 80 ? styles.metricWarning : styles.metricGood}`}
                    style={{ width: `${metrics.memory.usage}%` }}
                  />
                </div>
                <div className={styles.metricDetails}>
                  {metrics.memory.usage}% of {metrics.memory.limit}MB limit
                </div>
              </>
            )}
          </div>

          {/* Render Count */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Render Count</span>
              <span className={styles.metricValue}>{renderCount}</span>
            </div>
            <div className={styles.metricDetails}>
              Current component renders
            </div>
          </div>
        </div>

        {/* Performance Statistics */}
        {Object.keys(metrics.performance).length > 0 && (
          <div className={styles.performanceStats}>
            <h3>Performance Statistics</h3>
            <div className={styles.statsGrid}>
              {Object.entries(metrics.performance).map(([label, stats]) => (
                <div key={label} className={styles.statCard}>
                  <div className={styles.statLabel}>{label}</div>
                  <div className={styles.statValues}>
                    <div>Avg: {stats?.average?.toFixed(2)}ms</div>
                    <div>Min: {stats?.min?.toFixed(2)}ms</div>
                    <div>Max: {stats?.max?.toFixed(2)}ms</div>
                    <div>Count: {stats?.count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {metrics.recommendations.length > 0 && (
          <div className={styles.recommendations}>
            <h3>Optimization Recommendations</h3>
            <ul className={styles.recommendationsList}>
              {metrics.recommendations.map((recommendation, index) => (
                <li key={index} className={styles.recommendation}>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Report History */}
        {reportHistory.length > 0 && (
          <div className={styles.reportHistory}>
            <h3>Recent Reports</h3>
            <div className={styles.reportsList}>
              {reportHistory.map((report, index) => (
                <div key={index} className={styles.reportItem}>
                  <div className={styles.reportTimestamp}>
                    {new Date(report.timestamp).toLocaleTimeString()}
                  </div>
                  <div className={styles.reportSummary}>
                    FPS: {report.fps}, Memory: {report.memory ? `${Math.round(report.memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

