#!/usr/bin/env node

/**
 * Performance testing script for ZCAM Gallery Plus
 * 
 * This script runs comprehensive performance tests to validate
 * our optimization efforts in Phase 8.
 */

import { performanceBenchmarks, quickPerformanceCheck } from '../src/utils/benchmark.js'
import { PerformanceReporter } from '../src/utils/performance.js'

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function runPerformanceTests() {
  log('\n🚀 ZCAM Gallery Plus - Performance Testing Suite', 'cyan')
  log('================================================', 'cyan')
  
  try {
    // Generate initial performance report
    log('\n📊 Generating initial performance report...', 'blue')
    PerformanceReporter.logReport()
    
    // Run quick performance check first
    log('\n🔍 Running quick performance check...', 'yellow')
    await quickPerformanceCheck()
    
    // Run comprehensive benchmarks
    log('\n🏃 Running comprehensive performance benchmarks...', 'green')
    const suites = await performanceBenchmarks.runAllBenchmarks()
    
    // Generate final performance report
    log('\n📈 Generating final performance report...', 'blue')
    PerformanceReporter.logReport()
    
    // Summary
    const totalTests = suites.reduce((sum, suite) => sum + suite.summary.totalTests, 0)
    const totalPassed = suites.reduce((sum, suite) => sum + suite.summary.passed, 0)
    const passRate = ((totalPassed / totalTests) * 100).toFixed(1)
    
    log('\n🎯 Performance Test Summary', 'magenta')
    log('============================', 'magenta')
    log(`Total Tests: ${totalTests}`, 'bright')
    log(`Passed: ${totalPassed}`, 'green')
    log(`Failed: ${totalTests - totalPassed}`, totalTests - totalPassed > 0 ? 'red' : 'green')
    log(`Success Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red')
    
    if (passRate >= 90) {
      log('\n✅ Excellent! Performance targets achieved!', 'green')
    } else if (passRate >= 70) {
      log('\n⚠️  Good performance, but some optimizations needed', 'yellow')
    } else {
      log('\n❌ Performance issues detected. Optimization required!', 'red')
    }
    
    log('\n🏁 Performance testing complete!', 'cyan')
    
  } catch (error) {
    log(`\n❌ Performance testing failed: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  }
}

// Performance targets validation
function validatePerformanceTargets() {
  log('\n🎯 Validating Performance Targets', 'cyan')
  log('==================================', 'cyan')
  
  const targets = [
    { name: 'Frame Time', target: '16.67ms', current: 'TBD', status: 'pending' },
    { name: 'Memory Usage', target: '<200MB', current: 'TBD', status: 'pending' },
    { name: 'Thumbnail Load', target: '<500ms', current: 'TBD', status: 'pending' },
    { name: 'Startup Time', target: '<2s', current: 'TBD', status: 'pending' },
    { name: 'Download Speed', target: '>10MB/s', current: 'TBD', status: 'pending' },
  ]
  
  targets.forEach(target => {
    const status = target.status === 'pending' ? '⏳' : target.status === 'pass' ? '✅' : '❌'
    log(`${status} ${target.name}: ${target.target} (Current: ${target.current})`)
  })
  
  log('\n📋 Performance Targets Status:', 'blue')
  log('• Virtual scrolling: 60fps with 10,000 items', 'yellow')
  log('• Thumbnail loading: <100ms per thumbnail', 'yellow')
  log('• UI interactions: <16ms response time', 'yellow')
  log('• Memory: <200MB with 1000 files loaded', 'yellow')
  log('• Startup: <2s to interactive', 'yellow')
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    log('ZCAM Gallery Plus Performance Testing', 'cyan')
    log('=====================================', 'cyan')
    log('Usage: node scripts/performance-test.js [options]', 'bright')
    log('')
    log('Options:', 'bright')
    log('  --quick        Run quick performance check only', 'yellow')
    log('  --targets      Show performance targets only', 'yellow')
    log('  --help, -h     Show this help message', 'yellow')
    log('')
    log('Examples:', 'bright')
    log('  node scripts/performance-test.js', 'green')
    log('  node scripts/performance-test.js --quick', 'green')
    log('  node scripts/performance-test.js --targets', 'green')
    return
  }
  
  if (args.includes('--targets')) {
    validatePerformanceTargets()
    return
  }
  
  if (args.includes('--quick')) {
    log('🔍 Running quick performance check...', 'yellow')
    await quickPerformanceCheck()
    log('✅ Quick check complete!', 'green')
    return
  }
  
  // Run full performance test suite
  await runPerformanceTests()
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`\n❌ Uncaught Exception: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log(`\n❌ Unhandled Rejection: ${reason}`, 'red')
  console.error(reason)
  process.exit(1)
})

// Run the main function
main().catch(error => {
  log(`\n❌ Script failed: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})
