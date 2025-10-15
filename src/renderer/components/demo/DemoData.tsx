import type { GalleryItem, CameraInfo } from '@/shared/types'

/**
 * DemoData - Mock data for showcasing features
 * Provides realistic camera files and device info for development
 */

export const mockCameraInfo: CameraInfo = {
  ip: '10.98.32.1',
  model: 'Z CAM E2-M4',
  serialNumber: 'ZCAM123456789',
  firmware: '1.0.0',
  batteryLevel: 85,
  storageInfo: {
    totalSpace: 128 * 1024 * 1024 * 1024, // 128GB
    freeSpace: 64 * 1024 * 1024 * 1024,   // 64GB
    usedSpace: 64 * 1024 * 1024 * 1024,   // 64GB
  },
}

export const mockGalleryItems: GalleryItem[] = [
  {
    id: '1',
    name: 'DCIM',
    path: '/DCIM',
    size: 0,
    isFolder: true,
    isIngested: false,
    type: 'folder',
    modifiedTime: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: '100ZCAM',
    path: '/DCIM/100ZCAM',
    size: 0,
    isFolder: true,
    isIngested: false,
    type: 'folder',
    modifiedTime: '2024-01-15T10:30:00Z',
  },
  {
    id: '3',
    name: 'Z_CAM_001.MOV',
    path: '/DCIM/100ZCAM/Z_CAM_001.MOV',
    size: 2.1 * 1024 * 1024 * 1024, // 2.1GB
    isFolder: false,
    isIngested: false,
    type: 'video',
    modifiedTime: '2024-01-15T14:25:00Z',
    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2IiByeD0iOCIvPgo8cGF0aCBkPSJNMjAgMThoMjRjMS4xIDAgMiAuOSAyIDJ2MjRjMCAxLjEtLjkgMi0yIDJIMjBjLTEuMSAwLTItLjktMi0yVjIwYzAtMS4xLjktMiAyLTJ6IiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0yNiAyNGwxMiA4LTEyIDhWMjR6IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=',
  },
  {
    id: '4',
    name: 'Z_CAM_002.MOV',
    path: '/DCIM/100ZCAM/Z_CAM_002.MOV',
    size: 1.8 * 1024 * 1024 * 1024, // 1.8GB
    isFolder: false,
    isIngested: false,
    type: 'video',
    modifiedTime: '2024-01-15T15:45:00Z',
    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2IiByeD0iOCIvPgo8cGF0aCBkPSJNMjAgMThoMjRjMS4xIDAgMiAuOSAyIDJ2MjRjMCAxLjEtLjkgMi0yIDJIMjBjLTEuMSAwLTItLjktMi0yVjIwYzAtMS4xLjktMiAyLTJ6IiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0yNiAyNGwxMiA4LTEyIDhWMjR6IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=',
  },
  {
    id: '5',
    name: 'Z_CAM_003.MOV',
    path: '/DCIM/100ZCAM/Z_CAM_003.MOV',
    size: 3.2 * 1024 * 1024 * 1024, // 3.2GB
    isFolder: false,
    isIngested: true,
    type: 'video',
    modifiedTime: '2024-01-15T16:10:00Z',
    localPath: '/Users/user/Downloads/Z_CAM_003.MOV',
    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2IiByeD0iOCIvPgo8cGF0aCBkPSJNMjAgMThoMjRjMS4xIDAgMiAuOSAyIDJ2MjRjMCAxLjEtLjkgMi0yIDJIMjBjLTEuMSAwLTItLjktMi0yVjIwYzAtMS4xLjktMiAyLTJ6IiBmaWxsPSIjMjhhNzQ1Ii8+CjxwYXRoIGQ9Ik0yNiAyNGwxMiA4LTEyIDhWMjR6IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=',
  },
  {
    id: '6',
    name: 'Z_CAM_004.MOV',
    path: '/DCIM/100ZCAM/Z_CAM_004.MOV',
    size: 2.5 * 1024 * 1024 * 1024, // 2.5GB
    isFolder: false,
    isIngested: false,
    type: 'video',
    modifiedTime: '2024-01-15T17:20:00Z',
    downloadProgress: 45,
    isDownloading: true,
    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2IiByeD0iOCIvPgo8cGF0aCBkPSJNMjAgMThoMjRjMS4xIDAgMiAuOSAyIDJ2MjRjMCAxLjEtLjkgMi0yIDJIMjBjLTEuMSAwLTItLjktMi0yVjIwYzAtMS4xLjktMiAyLTJ6IiBmaWxsPSIjZmZjMTA3Ii8+CjxwYXRoIGQ9Ik0yNiAyNGwxMiA4LTEyIDhWMjR6IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=',
  },
  {
    id: '7',
    name: 'Z_CAM_005.MOV',
    path: '/DCIM/100ZCAM/Z_CAM_005.MOV',
    size: 1.9 * 1024 * 1024 * 1024, // 1.9GB
    isFolder: false,
    isIngested: false,
    type: 'video',
    modifiedTime: '2024-01-15T18:05:00Z',
    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2IiByeD0iOCIvPgo8cGF0aCBkPSJNMjAgMThoMjRjMS4xIDAgMiAuOSAyIDJ2MjRjMCAxLjEtLjkgMi0yIDJIMjBjLTEuMSAwLTItLjktMi0yVjIwYzAtMS4xLjktMiAyLTJ6IiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0yNiAyNGwxMiA4LTEyIDhWMjR6IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=',
  },
  {
    id: '8',
    name: 'Z_CAM_006.MOV',
    path: '/DCIM/100ZCAM/Z_CAM_006.MOV',
    size: 2.8 * 1024 * 1024 * 1024, // 2.8GB
    isFolder: false,
    isIngested: false,
    type: 'video',
    modifiedTime: '2024-01-15T19:15:00Z',
    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2IiByeD0iOCIvPgo8cGF0aCBkPSJNMjAgMThoMjRjMS4xIDAgMiAuOSAyIDJ2MjRjMCAxLjEtLjkgMi0yIDJIMjBjLTEuMSAwLTItLjktMi0yVjIwYzAtMS4xLjktMiAyLTJ6IiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0yNiAyNGwxMiA4LTEyIDhWMjR6IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=',
  },
  {
    id: '9',
    name: 'Z_CAM_007.MOV',
    path: '/DCIM/100ZCAM/Z_CAM_007.MOV',
    size: 2.3 * 1024 * 1024 * 1024, // 2.3GB
    isFolder: false,
    isIngested: false,
    type: 'video',
    modifiedTime: '2024-01-15T20:30:00Z',
    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2IiByeD0iOCIvPgo8cGF0aCBkPSJNMjAgMThoMjRjMS4xIDAgMiAuOSAyIDJ2MjRjMCAxLjEtLjkgMi0yIDJIMjBjLTEuMSAwLTItLjktMi0yVjIwYzAtMS4xLjktMiAyLTJ6IiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0yNiAyNGwxMiA4LTEyIDhWMjR6IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=',
  },
  {
    id: '10',
    name: 'Z_CAM_008.MOV',
    path: '/DCIM/100ZCAM/Z_CAM_008.MOV',
    size: 1.7 * 1024 * 1024 * 1024, // 1.7GB
    isFolder: false,
    isIngested: false,
    type: 'video',
    modifiedTime: '2024-01-15T21:45:00Z',
    thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2IiByeD0iOCIvPgo8cGF0aCBkPSJNMjAgMThoMjRjMS4xIDAgMiAuOSAyIDJ2MjRjMCAxLjEtLjkgMi0yIDJIMjBjLTEuMSAwLTItLjktMi0yVjIwYzAtMS4xLjktMiAyLTJ6IiBmaWxsPSIjOWNhM2FmIi8+CjxwYXRoIGQ9Ik0yNiAyNGwxMiA4LTEyIDhWMjR6IiBmaWxsPSIjZmZmZmZmIi8+Cjwvc3ZnPgo=',
  },
]

// Mock transfer progress data
export const mockTransferProgress = {
  'Z_CAM_004.MOV': {
    fileId: 'Z_CAM_004.MOV',
    fileName: 'Z_CAM_004.MOV',
    progress: 45,
    bytesReceived: 1125000000, // 1.125GB
    totalBytes: 2500000000,    // 2.5GB
    speed: 12500000,           // 12.5MB/s
    estimatedTimeRemaining: 110, // ~2 minutes
    status: 'downloading' as const,
  },
  'Z_CAM_005.MOV': {
    fileId: 'Z_CAM_005.MOV',
    fileName: 'Z_CAM_005.MOV',
    progress: 0,
    bytesReceived: 0,
    totalBytes: 1900000000,
    speed: 0,
    estimatedTimeRemaining: Infinity,
    status: 'queued' as const,
  },
}
