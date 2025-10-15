import { ipcMain, dialog, shell } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import type { FileMetadata, DialogOptions } from '@/shared/types'

/**
 * File operation handlers for Electron IPC
 * Provides secure file system access to renderer process
 */
export class FileHandlers {
  private readonly allowedExtensions = [
    '.mov', '.mp4', '.avi', '.mkv', '.wmv', '.flv', '.webm',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp',
    '.wav', '.mp3', '.aac', '.flac', '.ogg', '.m4a',
    '.thm', '.lrf', '.nrt', '.mpk', '.dat', '.ini', '.xml', '.bin', '.txt'
  ]

  private readonly maxFileSize = 500 * 1024 * 1024 // 500MB limit

  /**
   * Register all file-related IPC handlers
   */
  registerHandlers(): void {
    ipcMain.handle('file:download', this.handleDownload.bind(this))
    ipcMain.handle('file:readAsDataURL', this.handleReadAsDataURL.bind(this))
    ipcMain.handle('file:getMetadata', this.handleGetMetadata.bind(this))
    ipcMain.handle('file:delete', this.handleDelete.bind(this))
    ipcMain.handle('file:ensureDirExists', this.handleEnsureDirExists.bind(this))
    ipcMain.handle('file:pathExists', this.handlePathExists.bind(this))
  }

  /**
   * Download file from URL to local destination
   */
  private async handleDownload(
    _event: Electron.IpcMainInvokeEvent,
    url: string,
    destination: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided')
      }

      // Validate and sanitize destination path
      const sanitizedPath = this.sanitizePath(destination)
      if (!sanitizedPath) {
        throw new Error('Invalid destination path')
      }

      // Ensure destination directory exists
      await this.ensureDirExists(path.dirname(sanitizedPath))

      // Check if file extension is allowed
      const ext = path.extname(sanitizedPath).toLowerCase()
      if (!this.allowedExtensions.includes(ext)) {
        throw new Error(`File extension ${ext} is not allowed`)
      }

      // Download the file
      await this.downloadFile(url, sanitizedPath, onProgress)
    } catch (error) {
      console.error('File download failed:', error)
      throw error
    }
  }

  /**
   * Read file as data URL
   */
  private async handleReadAsDataURL(
    _event: Electron.IpcMainInvokeEvent,
    filePath: string
  ): Promise<string> {
    try {
      const sanitizedPath = this.sanitizePath(filePath)
      if (!sanitizedPath) {
        throw new Error('Invalid file path')
      }

      // Check if file exists and is readable
      const stats = await fs.stat(sanitizedPath)
      if (!stats.isFile()) {
        throw new Error('Path is not a file')
      }

      if (stats.size > this.maxFileSize) {
        throw new Error('File too large to read')
      }

      // Read file and convert to data URL
      const buffer = await fs.readFile(sanitizedPath)
      const ext = path.extname(sanitizedPath).toLowerCase()
      const mimeType = this.getMimeType(ext)
      const base64 = buffer.toString('base64')
      
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error('File read failed:', error)
      throw error
    }
  }

  /**
   * Get file metadata
   */
  private async handleGetMetadata(
    _event: Electron.IpcMainInvokeEvent,
    filePath: string
  ): Promise<FileMetadata> {
    try {
      const sanitizedPath = this.sanitizePath(filePath)
      if (!sanitizedPath) {
        throw new Error('Invalid file path')
      }

      const stats = await fs.stat(sanitizedPath)
      
      return {
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      }
    } catch (error) {
      console.error('Get metadata failed:', error)
      throw error
    }
  }

  /**
   * Delete file
   */
  private async handleDelete(
    _event: Electron.IpcMainInvokeEvent,
    filePath: string
  ): Promise<void> {
    try {
      const sanitizedPath = this.sanitizePath(filePath)
      if (!sanitizedPath) {
        throw new Error('Invalid file path')
      }

      await fs.unlink(sanitizedPath)
    } catch (error) {
      console.error('File delete failed:', error)
      throw error
    }
  }

  /**
   * Ensure directory exists
   */
  private async handleEnsureDirExists(
    _event: Electron.IpcMainInvokeEvent,
    dirPath: string
  ): Promise<void> {
    try {
      const sanitizedPath = this.sanitizePath(dirPath)
      if (!sanitizedPath) {
        throw new Error('Invalid directory path')
      }

      await fs.mkdir(sanitizedPath, { recursive: true })
    } catch (error) {
      console.error('Ensure directory failed:', error)
      throw error
    }
  }

  /**
   * Check if path exists
   */
  private async handlePathExists(
    _event: Electron.IpcMainInvokeEvent,
    filePath: string
  ): Promise<boolean> {
    try {
      const sanitizedPath = this.sanitizePath(filePath)
      if (!sanitizedPath) {
        return false
      }

      await fs.access(sanitizedPath)
      return true
    } catch {
      return false
    }
  }

  // Private utility methods

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  private sanitizePath(inputPath: string): string | null {
    try {
      // Resolve to absolute path
      const resolved = path.resolve(inputPath)
      
      // Check if path is within allowed directories
      const userDataPath = app.getPath('userData')
      const documentsPath = app.getPath('documents')
      const downloadsPath = app.getPath('downloads')
      const desktopPath = app.getPath('desktop')
      
      const allowedPaths = [userDataPath, documentsPath, downloadsPath, desktopPath]
      
      // Check if resolved path is within any allowed directory
      const isAllowed = allowedPaths.some(allowedPath => 
        resolved.startsWith(allowedPath)
      )
      
      if (!isAllowed) {
        console.warn('Path outside allowed directories:', resolved)
        return null
      }
      
      return resolved
    } catch {
      return null
    }
  }

  private async ensureDirExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error
      }
    }
  }

  private async downloadFile(
    url: string,
    destination: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const fetch = (await import('node-fetch')).default
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0
    
    if (total > this.maxFileSize) {
      throw new Error('File too large to download')
    }

    const fileStream = await fs.open(destination, 'w')
    const body = response.body

    if (!body) {
      throw new Error('No response body')
    }

    let downloaded = 0
    
    for await (const chunk of body) {
      await fileStream.write(chunk)
      downloaded += chunk.length
      
      if (onProgress && total > 0) {
        const progress = (downloaded / total) * 100
        onProgress(Math.round(progress))
      }
    }
    
    await fileStream.close()
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.webp': 'image/webp',
      '.mov': 'video/quicktime',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
      '.json': 'application/json',
    }
    
    return mimeTypes[extension] || 'application/octet-stream'
  }
}
