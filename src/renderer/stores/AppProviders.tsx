import React from 'react'
import { ConnectionProvider } from './ConnectionContext'
import { GalleryProvider } from './GalleryContext'
import { TransferProvider } from './TransferContext'
import { SettingsProvider } from './SettingsContext'
import ZCamConnector from '../services/ZCamConnector'
import FileTransferService from '../services/FileTransferService'
import ThumbnailCacheService from '../services/ThumbnailCacheService'

/**
 * App Providers - Combines all context providers
 * Provides dependency injection for services and manages app-level state
 */

interface AppProvidersProps {
  children: React.ReactNode
}

// Service instances (singletons)
let zcamConnector: ZCamConnector | undefined
let fileTransferService: FileTransferService | undefined
let thumbnailCacheService: ThumbnailCacheService | undefined

// Service factory functions
function createZCamConnector(): ZCamConnector {
  if (!zcamConnector) {
    zcamConnector = new ZCamConnector()
  }
  return zcamConnector
}

function createFileTransferService(): FileTransferService {
  if (!fileTransferService) {
    // Create a default download function that uses Electron IPC
    const downloadFunction = async (
      file: any,
      destination: string,
      onProgress: (received: number, total: number) => void
    ): Promise<void> => {
      if (window.electronAPI?.file?.download) {
        // Use Electron's file download with progress callback
        await window.electronAPI.file.download(file.path, destination, onProgress)
      } else {
        // Fallback for development/testing
        console.warn('Electron API not available, using mock download')
        // Simulate download progress
        const totalSize = file.size || 1000000
        for (let i = 0; i <= 100; i += 10) {
          onProgress((i / 100) * totalSize, totalSize)
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    fileTransferService = new FileTransferService(downloadFunction, {
      maxConcurrentDownloads: 3,
      progressThrottleMs: 100,
    })
  }
  return fileTransferService
}

function createThumbnailCacheService(): ThumbnailCacheService {
  if (!thumbnailCacheService) {
    // Create a default thumbnail generation function
    const thumbnailGenerationFunction = async (file: any): Promise<string> => {
      if (window.electronAPI?.file?.readAsDataURL) {
        try {
          // Try to read the file as data URL for thumbnails
          return await window.electronAPI.file.readAsDataURL(file.path)
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error)
          // Return a fallback thumbnail
          return createFallbackThumbnail(file)
        }
      } else {
        // Fallback for development/testing
        return createFallbackThumbnail(file)
      }
    }

    thumbnailCacheService = new ThumbnailCacheService(thumbnailGenerationFunction, {
      maxCacheSize: 1000,
      maxMemoryMB: 50,
    })
  }
  return thumbnailCacheService
}

// Helper function to create fallback thumbnails
function createFallbackThumbnail(file: any): string {
  const isVideo = file.name.toLowerCase().match(/\.(mov|mp4|avi|mkv)$/)
  const isImage = file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)
  
  if (isVideo) {
    // Return a video icon thumbnail
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#f3f4f6" rx="8"/>
        <path d="M20 18h24c1.1 0 2 .9 2 2v24c0 1.1-.9 2-2 2H20c-1.1 0-2-.9-2-2V20c0-1.1.9-2 2-2z" fill="#9ca3af"/>
        <path d="M26 24l12 8-12 8V24z" fill="#ffffff"/>
      </svg>
    `)
  } else if (isImage) {
    // Return an image icon thumbnail
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#f3f4f6" rx="8"/>
        <rect x="16" y="16" width="32" height="24" fill="#9ca3af" rx="4"/>
        <circle cx="28" cy="26" r="3" fill="#ffffff"/>
        <path d="M16 40l8-8 8 8 8-8 8 8v4H16v-4z" fill="#ffffff"/>
      </svg>
    `)
  } else {
    // Return a generic file icon thumbnail
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#f3f4f6" rx="8"/>
        <rect x="20" y="16" width="24" height="32" fill="#9ca3af" rx="2"/>
        <rect x="22" y="20" width="20" height="2" fill="#ffffff"/>
        <rect x="22" y="24" width="16" height="2" fill="#ffffff"/>
        <rect x="22" y="28" width="18" height="2" fill="#ffffff"/>
      </svg>
    `)
  }
}

// Main App Providers component
export function AppProviders({ children }: AppProvidersProps) {
  // Create service instances
  const zcamConnectorInstance = createZCamConnector()
  const fileTransferServiceInstance = createFileTransferService()
  const thumbnailCacheServiceInstance = createThumbnailCacheService()

  return (
    <SettingsProvider>
      <ConnectionProvider zcamConnector={zcamConnectorInstance}>
        <GalleryProvider>
          <TransferProvider transferService={fileTransferServiceInstance}>
            {children}
          </TransferProvider>
        </GalleryProvider>
      </ConnectionProvider>
    </SettingsProvider>
  )
}

// Export service instances for testing
export {
  createZCamConnector,
  createFileTransferService,
  createThumbnailCacheService,
}

// Export individual providers for testing
export {
  ConnectionProvider,
  GalleryProvider,
  TransferProvider,
  SettingsProvider,
}
