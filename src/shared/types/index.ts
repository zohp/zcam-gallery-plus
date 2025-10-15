// Core domain types shared between main and renderer processes

export interface CameraInfo {
  ip: string
  model: string
  serialNumber: string
  firmware?: string
  batteryLevel?: number
  storageInfo?: StorageInfo
}

export interface StorageInfo {
  totalSpace: number
  freeSpace: number
  usedSpace: number
}

export interface CameraFile {
  name: string
  path: string
  size: number
  isFolder: boolean
  modifiedTime?: string
  thumbnailUrl?: string
}

export interface GalleryItem extends CameraFile {
  id: string
  isIngested: boolean
  localPath?: string
  localThumbnailPath?: string
  downloadProgress?: number
  isDownloading?: boolean
  type: 'video' | 'image' | 'folder'
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  cameraInfo: CameraInfo | null
  error: string | null
}

export interface TransferProgress {
  fileId: string
  fileName: string
  progress: number // 0-100
  bytesReceived: number
  totalBytes: number
  speed: number // bytes per second
  estimatedTimeRemaining: number // seconds
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed'
}

export interface SortCriteria {
  field: 'name' | 'date' | 'size'
  order: 'asc' | 'desc'
}

export interface FilterCriteria {
  type?: 'video' | 'image' | 'folder'
  dateRange?: {
    start: Date
    end: Date
  }
  searchQuery?: string
}

export interface SettingsState {
  ingestPath: string
  autoIngest: boolean
  theme: 'light' | 'dark'
  sortPreference: SortCriteria
  maxConcurrentDownloads: number
  thumbnailCacheSize: number
}

// Electron API types
export interface ElectronAPI {
  file: {
    download: (
      url: string,
      destination: string,
      onProgress: (progress: number) => void
    ) => Promise<void>
    readAsDataURL: (path: string) => Promise<string>
    getMetadata: (path: string) => Promise<FileMetadata>
  }
  dialog: {
    selectFolder: (options?: DialogOptions) => Promise<string | null>
  }
  camera: {
    listFiles: (ip: string, path: string) => Promise<string>
  }
  watcher: {
    onFolderChanged: (callback: (event: WatchEvent) => void) => void
  }
}

export interface FileMetadata {
  size: number
  mtime: Date
  ctime: Date
  isFile: boolean
  isDirectory: boolean
}

export interface DialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
}

export interface WatchEvent {
  eventType: 'add' | 'change' | 'unlink'
  path: string
}

// Service interfaces
export interface IZCamConnector {
  connect(ip: string): Promise<ConnectionResult>
  disconnect(): void
  getDeviceInfo(): Promise<CameraInfo>
  listFiles(path: string): Promise<CameraFile[]>
  downloadFile(
    url: string,
    onProgress: (progress: number) => void
  ): Promise<ArrayBuffer>
  isConnected(): boolean
}

export interface ConnectionResult {
  success: boolean
  cameraInfo?: CameraInfo
  error?: string
}

export interface IFileTransferService {
  downloadFile(file: CameraFile, destination: string): Promise<void>
  pauseDownload(fileId: string): void
  resumeDownload(fileId: string): void
  cancelDownload(fileId: string): void
  getProgress(fileId: string): TransferProgress | null
  getActiveTransfers(): TransferProgress[]
}

export interface IThumbnailCache {
  getThumbnail(file: CameraFile): Promise<string> // Returns data URL or file path
  prefetchThumbnails(files: CameraFile[]): Promise<void>
  clearCache(): Promise<void>
  getCacheSize(): Promise<number>
}
