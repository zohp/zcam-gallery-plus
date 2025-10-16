# Testing Guide

This document provides comprehensive guidance on testing ZCAM Gallery Plus, including unit tests, integration tests, E2E tests, and performance testing.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Performance Testing](#performance-testing)
- [Mocking](#mocking)
- [CI/CD](#cicd)

## Testing Strategy

ZCAM Gallery Plus uses a comprehensive three-tier testing strategy:

### 1. Unit Tests (Vitest)
- **Target**: Individual functions, classes, and components
- **Coverage Goal**: >90% for services, >80% for components
- **Focus**: Logic correctness, edge cases, error handling

### 2. Integration Tests (React Testing Library)
- **Target**: Component interactions, state management, service integration
- **Coverage Goal**: >80% for user workflows
- **Focus**: Data flow, context providers, IPC communication

### 3. E2E Tests (Playwright)
- **Target**: Complete user workflows, critical paths
- **Coverage Goal**: 100% of critical user journeys
- **Focus**: Real browser behavior, full app integration

## Running Tests

### All Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Unit Tests
```bash
# Run unit tests only
npm run test:unit

# Run specific test file
npm test src/services/__tests__/ZCamConnector.test.ts

# Run tests matching pattern
npm test -- --grep "ZCamConnector"
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run component tests
npm test src/renderer/components/__tests__/

# Run state management tests
npm test src/renderer/stores/__tests__/
```

### E2E Tests
```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e -- --headed

# Run specific E2E test
npm run test:e2e tests/e2e/camera-connection.spec.ts
```

### Performance Tests
```bash
# Run performance benchmarks
node scripts/performance-test.js

# Quick performance check
node scripts/performance-test.js --quick

# Show performance targets
node scripts/performance-test.js --targets
```

## Writing Tests

### Unit Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ZCamConnector } from '../ZCamConnector'

describe('ZCamConnector', () => {
  let connector: ZCamConnector

  beforeEach(() => {
    connector = new ZCamConnector()
  })

  afterEach(() => {
    connector.disconnect()
    vi.restoreAllMocks()
  })

  describe('connect', () => {
    it('should connect successfully with valid IP', async () => {
      // Arrange
      const mockResponse = { success: true, cameraInfo: mockCameraInfo }
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      // Act
      const result = await connector.connect('192.168.1.100')

      // Assert
      expect(result.success).toBe(true)
      expect(connector.isConnected()).toBe(true)
    })

    it('should handle connection errors', async () => {
      // Arrange
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

      // Act
      const result = await connector.connect('192.168.1.100')

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })
})
```

### Integration Test Structure

```typescript
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppProviders } from '@/stores/AppProviders'
import { ConnectionButton } from '../ConnectionButton'

describe('ConnectionButton Integration', () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(<AppProviders>{component}</AppProviders>)
  }

  it('should connect to camera when clicked', async () => {
    // Arrange
    renderWithProviders(<ConnectionButton />)
    const connectButton = screen.getByRole('button', { name: /connect/i })

    // Act
    fireEvent.click(connectButton)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/connecting/i)).toBeInTheDocument()
    })
  })
})
```

### E2E Test Structure

```typescript
import { test, expect } from '@playwright/test'

test.describe('Camera Connection Flow', () => {
  test('should connect to camera and display files', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173')

    // Connect to camera
    await page.click('[data-testid="connection-button"]')
    await page.fill('[data-testid="camera-ip-input"]', '192.168.1.100')
    await page.click('[data-testid="connect-button"]')

    // Wait for connection
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected')

    // Verify files are displayed
    await expect(page.locator('[data-testid="gallery-grid"]')).toBeVisible()
    await expect(page.locator('[data-testid="gallery-item"]')).toHaveCount.greaterThan(0)
  })
})
```

## Test Utilities

### Custom Render Function

```typescript
// src/test/test-utils.tsx
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AppProviders } from '@/stores/AppProviders'

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AppProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

### Mock Utilities

```typescript
// src/test/mock-utils.ts
import { vi } from 'vitest'

export const mockElectronAPI = () => {
  const mockAPI = {
    file: {
      download: vi.fn(),
      readAsDataURL: vi.fn(),
      getMetadata: vi.fn(),
    },
    dialog: {
      showOpenDialog: vi.fn(),
    },
    camera: {
      listFiles: vi.fn(),
      getDeviceInfo: vi.fn(),
    },
  }

  Object.defineProperty(window, 'electronAPI', {
    value: mockAPI,
    writable: true,
  })

  return mockAPI
}

export const mockZCamConnector = () => {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(),
    getDeviceInfo: vi.fn(),
    listFiles: vi.fn(),
  }
}
```

### Test Data Factories

```typescript
// src/test/factories.ts
export const createMockCameraFile = (overrides: Partial<CameraFile> = {}): CameraFile => ({
  id: 'test-file-1',
  name: 'test.mov',
  path: '/DCIM/test.mov',
  size: 1000000,
  type: 'file',
  modified: '2023-01-01T00:00:00Z',
  ...overrides,
})

export const createMockCameraInfo = (overrides: Partial<CameraInfo> = {}): CameraInfo => ({
  model: 'Z CAM E2-F6',
  firmware: '1.0.0',
  battery: 85,
  storage: {
    total: 64000000000,
    free: 32000000000,
  },
  network: {
    ip: '192.168.1.100',
    ssid: 'ZCAM-Network',
  },
  ...overrides,
})
```

## Performance Testing

### Performance Test Structure

```typescript
// scripts/performance-test.js
import { performance } from 'perf_hooks'

class PerformanceTest {
  async measureRenderTime(componentName: string, iterations: number = 1000) {
    const times = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      // Render component
      const end = performance.now()
      times.push(end - start)
    }
    
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: this.percentile(times, 0.95),
    }
  }
  
  percentile(arr: number[], p: number): number {
    const sorted = arr.sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * p)
    return sorted[index]
  }
}
```

### Performance Targets

```typescript
const PERFORMANCE_TARGETS = {
  renderTime: 16, // ms (60fps)
  memoryUsage: 200, // MB
  startupTime: 2000, // ms
  thumbnailLoadTime: 100, // ms
  downloadSpeed: 10000000, // bytes/sec (10MB/s)
}
```

## Mocking

### Service Mocking

```typescript
// Mock ZCamConnector
vi.mock('@/services/ZCamConnector', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    getDeviceInfo: vi.fn().mockResolvedValue(mockCameraInfo),
    listFiles: vi.fn().mockResolvedValue(mockFiles),
  })),
}))
```

### Electron API Mocking

```typescript
// Mock Electron APIs
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}))
```

### HTTP Mocking

```typescript
// Mock fetch for camera communication
global.fetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

it('should handle HTTP errors', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
  
  const result = await connector.connect('192.168.1.100')
  
  expect(result.success).toBe(false)
  expect(result.error).toContain('Network error')
})
```

## CI/CD

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
npm run test:coverage -- --reporter=html
open coverage/index.html
```

### Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/services/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
})
```

## Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests focused** on a single behavior
5. **Use beforeEach/afterEach** for setup and cleanup

### Test Data

1. **Use factories** for creating test data
2. **Keep test data minimal** and focused
3. **Use realistic data** that matches production scenarios
4. **Avoid hardcoded values** when possible

### Async Testing

1. **Always await async operations** in tests
2. **Use waitFor** for DOM updates
3. **Set appropriate timeouts** for slow operations
4. **Mock async dependencies** appropriately

### Error Testing

1. **Test both success and failure cases**
2. **Verify error messages** are user-friendly
3. **Test error recovery** mechanisms
4. **Mock network failures** and edge cases

## Debugging Tests

### Debug Mode

```bash
# Run tests in debug mode
npm test -- --reporter=verbose

# Debug specific test
npm test -- --grep "specific test name" --reporter=verbose
```

### VS Code Integration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

This testing guide provides comprehensive coverage of all testing aspects in ZCAM Gallery Plus. For specific test examples, see the test files in the `src/` directory.
