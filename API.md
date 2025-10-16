# API Documentation

This document provides comprehensive API documentation for ZCAM Gallery Plus, including service interfaces, IPC communication, and type definitions.

## Table of Contents

- [Service APIs](#service-apis)
- [IPC APIs](#ipc-apis)
- [Type Definitions](#type-definitions)
- [Performance APIs](#performance-apis)
- [Migration APIs](#migration-apis)

## Service APIs

### ZCamConnector

Handles all HTTP communication with Z CAM cameras.

```typescript
class ZCamConnector {
  // Connection management
  connect(ip: string): Promise<ConnectionResult>
  disconnect(): void
  isConnected(): boolean
  
  // Device information
  getDeviceInfo(): Promise<CameraInfo>
  
  // File operations
  listFiles(path: string): Promise<CameraFile[]>
  downloadFile(url: string, onProgress?: ProgressCallback): Promise<ArrayBuffer>
  
  // Configuration
  setTimeout(timeout: number): void
  setRetryAttempts(attempts: number): void
}
```

**ConnectionResult**:
```typescript
interface ConnectionResult {
  success: boolean
  cameraInfo?: CameraInfo
  error?: string
}
```

**CameraInfo**:
```typescript
interface CameraInfo {
  model: string
  firmware: string
  battery: number
  storage: {
    total: number
    free: number
  }
  network: {
    ip: string
    ssid: string
  }
}
```

**CameraFile**:
```typescript
interface CameraFile {
  id: string
  name: string
  path: string
  size: number
  type: 'file' | 'folder'
  modified: string
  thumbnail?: string
  duration?: number // for video files
}
```

### FileTransferService

Manages file downloads with queue management and progress tracking.

```typescript
class FileTransferService {
  // Download management
  downloadFile(file: CameraFile, destination: string, options?: FileTransferOptions): Promise<void>
  pauseDownload(fileId: string): void
  resumeDownload(fileId: string): void
  cancelDownload(fileId: string): void
  
  // Queue management
  getQueue(): TransferItem[]
  clearQueue(): void
  reorderQueue(fileIds: string[]): void
  
  // Progress tracking
  getProgress(fileId: string): TransferProgress
  getActiveTransfers(): TransferProgress[]
  
  // Configuration
  setMaxConcurrency(concurrency: number): void
  setBandwidthLimit(limit: number): void
}
```

**FileTransferOptions**:
```typescript
interface FileTransferOptions {
  priority?: 'low' | 'normal' | 'high'
  retryAttempts?: number
  chunkSize?: number
  adaptiveConcurrency?: boolean
}
```

**TransferProgress**:
```typescript
interface TransferProgress {
  fileId: string
  fileName: string
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed'
  progress: number // 0-100
  downloadedBytes: number
  totalBytes: number
  speed: number // bytes per second
  eta: number // estimated time remaining in seconds
  error?: string
}
```

### ThumbnailCacheService

Efficient thumbnail caching and generation with LRU eviction.

```typescript
class ThumbnailCacheService {
  // Cache management
  getThumbnail(fileId: string): Promise<string | null>
  setThumbnail(fileId: string, thumbnailData: string): Promise<void>
  removeThumbnail(fileId: string): void
  clearCache(): void
  
  // Prefetching
  prefetchThumbnails(fileIds: string[]): Promise<void>
  prefetchVisibleThumbnails(visibleIds: string[]): Promise<void>
  
  // Cache statistics
  getCacheStats(): CacheStats
  getMemoryUsage(): number
  
  // Configuration
  setMaxCacheSize(size: number): void
  setPrefetchEnabled(enabled: boolean): void
}
```

**CacheStats**:
```typescript
interface CacheStats {
  size: number
  maxSize: number
  hitCount: number
  missCount: number
  hitRate: number
  averageGenerationTimeMs: number
  prefetchQueueSize: number
  activePrefetchOperations: number
}
```

## IPC APIs

### File Operations

```typescript
// File system operations
electronAPI.file.download(url: string, destination: string, onProgress?: ProgressCallback): Promise<void>
electronAPI.file.readAsDataURL(path: string): Promise<string>
electronAPI.file.getMetadata(path: string): Promise<FileMetadata>
electronAPI.file.delete(path: string): Promise<void>
electronAPI.file.ensureDirExists(path: string): Promise<void>
electronAPI.file.pathExists(path: string): Promise<boolean>
```

### Dialog Operations

```typescript
// System dialogs
electronAPI.dialog.showOpenDialog(options?: OpenDialogOptions): Promise<string | null>
electronAPI.dialog.showSaveDialog(options?: SaveDialogOptions): Promise<string | null>
electronAPI.dialog.showErrorBox(title: string, content: string): Promise<void>
```

### Camera Operations

```typescript
// Camera communication
electronAPI.camera.listFiles(ip: string, path: string): Promise<CameraFile[]>
electronAPI.camera.downloadFile(url: string, onProgress?: ProgressCallback): Promise<ArrayBuffer>
electronAPI.camera.getDeviceInfo(ip: string): Promise<CameraInfo>
```

### File System Watching

```typescript
// Folder watching
electronAPI.watcher.onFolderChanged(callback: (event: WatchEvent) => void): void
electronAPI.watcher.offFolderChanged(callback: (event: WatchEvent) => void): void
electronAPI.watcher.startWatching(path: string): Promise<void>
electronAPI.watcher.stopWatching(): Promise<void>
```

**WatchEvent**:
```typescript
interface WatchEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  path: string
  stats?: FileStats
}
```

### Application Operations

```typescript
// App information
electronAPI.app.getDataPath(): string
electronAPI.app.getVersion(): string
electronAPI.app.getPlatform(): string

// Window management
electronAPI.app.quit(): void
electronAPI.app.minimize(): void
electronAPI.app.maximize(): void
electronAPI.app.close(): void
```

### Store Operations

```typescript
// Persistent storage
electronAPI.store.get(key: string): any
electronAPI.store.set(key: string, value: any): void
electronAPI.store.delete(key: string): void
electronAPI.store.onDidChange(callback: (key: string, value: any) => void): () => void
```

## Type Definitions

### Core Types

```typescript
// Gallery item types
interface GalleryItem {
  id: string
  name: string
  path: string
  size: number
  type: 'file' | 'folder'
  modified: string
  thumbnail?: string
  duration?: number
  selected?: boolean
}

// Sort criteria
type SortCriteria = 
  | 'name-asc' | 'name-desc'
  | 'date-asc' | 'date-desc'
  | 'size-asc' | 'size-desc'
  | 'type-asc' | 'type-desc'

// Filter criteria
interface FilterCriteria {
  types?: ('image' | 'video' | 'folder')[]
  dateRange?: {
    start: Date
    end: Date
  }
  sizeRange?: {
    min: number
    max: number
  }
  search?: string
}
```

### State Types

```typescript
// Connection state
interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  cameraInfo: CameraInfo | null
  error: string | null
  isConnecting: boolean
}

// Gallery state
interface GalleryState {
  items: GalleryItem[]
  loading: boolean
  currentPath: string
  sortBy: SortCriteria
  filterBy: FilterCriteria
  selectedItems: Set<string>
}

// Transfer state
interface TransferState {
  activeTransfers: Map<string, TransferProgress>
  completedTransfers: Set<string>
  queuedTransfers: string[]
  totalProgress: number
}

// Settings state
interface SettingsState {
  ingestPath: string
  autoIngest: boolean
  theme: 'light' | 'dark' | 'system'
  sortPreference: SortCriteria
  defaultCameraIp: string
  defaultCameraPath: string
  maxConcurrentDownloads: number
  thumbnailCacheSize: number
}
```

## Performance APIs

### Performance Monitoring

```typescript
// Performance profiling
class PerformanceProfiler {
  startTiming(name: string): void
  endTiming(name: string): number
  getMetrics(): PerformanceMetrics
  reset(): void
}

// Memory monitoring
class MemoryProfiler {
  getMemoryUsage(): MemoryInfo
  isMemoryPressureHigh(): boolean
  startMonitoring(): void
  stopMonitoring(): void
}
```

**PerformanceMetrics**:
```typescript
interface PerformanceMetrics {
  renderTime: number
  frameRate: number
  memoryUsage: number
  cacheHitRate: number
  networkLatency: number
}
```

**MemoryInfo**:
```typescript
interface MemoryInfo {
  used: number
  total: number
  percentage: number
  pressure: 'low' | 'medium' | 'high'
}
```

### Performance Hooks

```typescript
// React performance hooks
function useRenderPerformance(componentName: string): void
function useMemoryMonitor(componentName: string): MemoryInfo
function useIntersectionObserver(options: IntersectionObserverOptions): IntersectionObserverAPI
```

## Migration APIs

### Migration Service

```typescript
class MigrationService {
  // Migration detection
  isMigrationNeeded(): Promise<boolean>
  getMigrationInfo(): Promise<MigrationInfo>
  
  // Migration execution
  performMigration(): Promise<MigrationResult>
  validateMigration(): Promise<MigrationValidation>
  
  // Migration status
  getMigrationStatus(): Promise<MigrationStatus>
  rollbackMigration(backupPath: string): Promise<boolean>
  cleanupOldData(): Promise<boolean>
}
```

**MigrationInfo**:
```typescript
interface MigrationInfo {
  hasOldData: boolean
  canMigrate: boolean
  estimatedItems: number
  oldDataPath?: string
  backupPath?: string
}
```

**MigrationResult**:
```typescript
interface MigrationResult {
  success: boolean
  migratedItems: number
  errors: string[]
  warnings: string[]
  backupPath?: string
  duration: number
}
```

**MigrationValidation**:
```typescript
interface MigrationValidation {
  valid: boolean
  issues: string[]
  warnings: string[]
  dataIntegrity: boolean
}
```

**MigrationStatus**:
```typescript
interface MigrationStatus {
  needed: boolean
  completed: boolean
  oldDataPath?: string
  backupPath?: string
  migratedAt?: string
  version?: string
}
```

### Migration IPC

```typescript
// Migration operations via IPC
electronAPI.migration.isNeeded(): Promise<{ success: boolean; needed?: boolean; error?: string }>
electronAPI.migration.getInfo(): Promise<{ success: boolean; info?: MigrationInfo; error?: string }>
electronAPI.migration.perform(): Promise<{ success: boolean; result?: MigrationResult; error?: string }>
electronAPI.migration.validate(): Promise<{ success: boolean; validation?: MigrationValidation; error?: string }>
electronAPI.migration.getStatus(): Promise<{ success: boolean; status?: MigrationStatus; error?: string }>
electronAPI.migration.rollback(backupPath: string): Promise<{ success: boolean; error?: string }>
electronAPI.migration.cleanup(): Promise<{ success: boolean; error?: string }>
electronAPI.migration.isFirstRunAfterMigration(): Promise<{ success: boolean; isFirstRun?: boolean; error?: string }>
```

## Error Handling

### Error Types

```typescript
// Custom error classes
class ConnectionError extends Error {
  constructor(message: string, public code: string, public retryable: boolean)
}

class TransferError extends Error {
  constructor(message: string, public fileId: string, public retryable: boolean)
}

class CacheError extends Error {
  constructor(message: string, public operation: string)
}

class MigrationError extends Error {
  constructor(message: string, public phase: string, public recoverable: boolean)
}
```

### Error Recovery

```typescript
// Retry mechanisms
interface RetryOptions {
  maxAttempts: number
  delay: number
  backoff: 'linear' | 'exponential'
  retryable: (error: Error) => boolean
}

// Error boundaries
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error): ErrorState
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void
}
```

## Utility Functions

### Formatting

```typescript
// File size formatting
function formatBytes(bytes: number): string

// Duration formatting
function formatDuration(seconds: number): string

// Date formatting
function formatDate(date: Date): string
function formatRelativeTime(date: Date): string
```

### Validation

```typescript
// Input validation
function validateIpAddress(ip: string): boolean
function validatePath(path: string): boolean
function validateFileName(name: string): boolean

// Data validation
function validateCameraInfo(data: any): data is CameraInfo
function validateGalleryItem(data: any): data is GalleryItem
```

### Performance Utilities

```typescript
// Debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void

// Throttling
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void

// Batch processing
function batch<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>
): Promise<void>
```

---

This API documentation covers all the major interfaces and types used throughout ZCAM Gallery Plus. For implementation details, see the source code in the `src/` directory.
