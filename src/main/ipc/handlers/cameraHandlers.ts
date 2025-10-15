import { ipcMain } from 'electron'

/**
 * Camera handlers for Electron IPC
 * Provides camera communication functionality to renderer process
 */
export class CameraHandlers {
  /**
   * Register all camera-related IPC handlers
   */
  registerHandlers(): void {
    ipcMain.handle('camera:listFiles', this.handleListFiles.bind(this))
    ipcMain.handle('camera:getDeviceInfo', this.handleGetDeviceInfo.bind(this))
    ipcMain.handle('camera:downloadFile', this.handleDownloadFile.bind(this))
  }

  /**
   * List files from camera (delegates to renderer's ZCamConnector)
   * This is a pass-through since HTTP requests should be made from renderer
   */
  private async handleListFiles(
    _event: Electron.IpcMainInvokeEvent,
    ip: string,
    path: string
  ): Promise<string> {
    try {
      // Validate IP address
      if (!this.isValidIpAddress(ip)) {
        throw new Error('Invalid IP address')
      }

      // Validate path
      if (!this.isValidCameraPath(path)) {
        throw new Error('Invalid camera path')
      }

      // For now, return a placeholder response
      // In the future, this could be enhanced with main process HTTP capabilities
      // or used for validation before delegating to renderer
      return `Camera files listing for ${ip}${path}`
    } catch (error) {
      console.error('Camera list files failed:', error)
      throw error
    }
  }

  /**
   * Get device info from camera
   */
  private async handleGetDeviceInfo(
    _event: Electron.IpcMainInvokeEvent,
    ip: string
  ): Promise<any> {
    try {
      // Validate IP address
      if (!this.isValidIpAddress(ip)) {
        throw new Error('Invalid IP address')
      }

      // Placeholder implementation
      // In practice, this would be handled by the renderer's ZCamConnector
      return {
        ip,
        model: 'Z CAM E2',
        serialNumber: 'Unknown',
        firmwareVersion: 'Unknown',
        batteryLevel: null,
      }
    } catch (error) {
      console.error('Get device info failed:', error)
      throw error
    }
  }

  /**
   * Download file from camera
   */
  private async handleDownloadFile(
    _event: Electron.IpcMainInvokeEvent,
    url: string,
    destination: string
  ): Promise<void> {
    try {
      // Validate URL
      if (!this.isValidCameraUrl(url)) {
        throw new Error('Invalid camera URL')
      }

      // Validate destination path
      if (!destination || typeof destination !== 'string') {
        throw new Error('Invalid destination path')
      }

      // Placeholder implementation
      // In practice, this would delegate to the file handlers
      console.log(`Downloading from ${url} to ${destination}`)
    } catch (error) {
      console.error('Camera download failed:', error)
      throw error
    }
  }

  // Private utility methods

  private isValidIpAddress(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }

  private isValidCameraPath(path: string): boolean {
    // Allow common camera paths
    const allowedPaths = ['/DCIM/', '/DCIM', '/', '/VIDEO/', '/PHOTO/']
    return allowedPaths.includes(path) || path.startsWith('/DCIM/')
  }

  private isValidCameraUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' && this.isValidIpAddress(parsed.hostname)
    } catch {
      return false
    }
  }
}
