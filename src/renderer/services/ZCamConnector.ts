import type {
  IZCamConnector,
  ConnectionResult,
  CameraInfo,
  CameraFile,
} from '@/shared/types'

/**
 * ZCamConnector - Pure TypeScript service for Z CAM camera communication
 * 
 * This service handles all HTTP communication with Z CAM cameras including:
 * - Device discovery and connection
 * - File listing and metadata retrieval
 * - Device information queries
 * 
 * Design principles:
 * - Framework agnostic (no React dependencies)
 * - Comprehensive error handling with retry logic
 * - Strong typing for all camera responses
 * - Dependency injection for testability
 */
export class ZCamConnector implements IZCamConnector {
  private connected = false
  private cameraInfo: CameraInfo | null = null
  private baseUrl = ''
  private readonly timeout = 10000 // 10 seconds
  private readonly retryAttempts = 3
  private readonly retryDelay = 1000 // 1 second

  constructor(private readonly httpClient?: HttpClient) {
    this.httpClient = httpClient || new DefaultHttpClient()
  }

  /**
   * Connect to a Z CAM camera at the specified IP address
   */
  async connect(ip: string): Promise<ConnectionResult> {
    try {
      this.baseUrl = `http://${ip}`
      
      // First, verify the camera is reachable
      const deviceInfo = await this.getDeviceInfoWithRetry()
      
      if (!deviceInfo || !this.isValidZCamDevice(deviceInfo)) {
        return {
          success: false,
          error: 'Device is not a valid Z CAM camera',
        }
      }

      this.connected = true
      this.cameraInfo = deviceInfo

      return {
        success: true,
        cameraInfo: deviceInfo,
      }
    } catch (error) {
      this.connected = false
      this.cameraInfo = null
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
      }
    }
  }

  /**
   * Disconnect from the camera
   */
  disconnect(): void {
    this.connected = false
    this.cameraInfo = null
    this.baseUrl = ''
  }

  /**
   * Get device information from the camera
   */
  async getDeviceInfo(): Promise<CameraInfo> {
    if (!this.connected) {
      throw new Error('Not connected to camera')
    }

    const deviceInfo = await this.getDeviceInfoWithRetry()
    if (!deviceInfo) {
      throw new Error('Failed to retrieve device information')
    }

    return deviceInfo
  }

  /**
   * List files in a directory on the camera
   */
  async listFiles(path: string): Promise<CameraFile[]> {
    if (!this.connected) {
      throw new Error('Not connected to camera')
    }

    try {
      const url = `${this.baseUrl}${path}`
      const response = await this.httpClient!.get(url, { timeout: this.timeout })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const htmlContent = await response.text()
      return this.parseDirectoryListing(htmlContent, path)
    } catch (error) {
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Download a file from the camera with progress callback
   */
  async downloadFile(
    url: string,
    onProgress: (progress: number) => void
  ): Promise<ArrayBuffer> {
    if (!this.connected) {
      throw new Error('Not connected to camera')
    }

    try {
      const response = await this.httpClient!.get(url, {
        timeout: this.timeout,
        onProgress,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()
      return buffer
    } catch (error) {
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if connected to a camera
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get the current camera information
   */
  getCurrentCameraInfo(): CameraInfo | null {
    return this.cameraInfo
  }

  /**
   * Get the camera IP address
   */
  getCameraIp(): string | null {
    return this.cameraInfo?.ip || null
  }

  /**
   * Scan for Z CAM cameras on the local network
   */
  async scanForCameras(subnet = '192.168.1'): Promise<CameraInfo[]> {
    const foundCameras: CameraInfo[] = []
    const promises: Promise<void>[] = []

    // Scan IP range (skip .0 and .1)
    for (let i = 2; i < 255; i++) {
      const ip = `${subnet}.${i}`
      const promise = this.checkCameraAtIp(ip).then(camera => {
        if (camera) {
          foundCameras.push(camera)
        }
      })
      promises.push(promise)
    }

    await Promise.allSettled(promises)
    return foundCameras
  }

  // Private helper methods

  private async getDeviceInfoWithRetry(): Promise<CameraInfo | null> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const url = `${this.baseUrl}/info`
        const response = await this.httpClient!.get(url, { timeout: this.timeout })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return this.parseDeviceInfo(data, this.baseUrl.replace('http://', ''))
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt)
        }
      }
    }

    throw lastError || new Error('Failed to connect after retries')
  }

  private async checkCameraAtIp(ip: string): Promise<CameraInfo | null> {
    try {
      const connector = new ZCamConnector(this.httpClient)
      const result = await connector.connect(ip)
      return result.success ? result.cameraInfo || null : null
    } catch {
      return null
    }
  }

  private parseDeviceInfo(data: any, ip: string): CameraInfo {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid device info response')
    }

    return {
      ip,
      model: data.model || 'Unknown',
      serialNumber: data.sn || data.serialNumber || 'Unknown',
      firmware: data.firmware || data.version || undefined,
      batteryLevel: data.batteryLevel || undefined,
      storageInfo: data.storage ? {
        totalSpace: data.storage.totalSpace || 0,
        freeSpace: data.storage.freeSpace || 0,
        usedSpace: data.storage.usedSpace || 0,
      } : undefined,
    }
  }

  private parseDirectoryListing(html: string, basePath: string): CameraFile[] {
    const files: CameraFile[] = []
    const linkRegex = /<a href="([^"]+)">([^<]+)<\/a>/gi
    const fileExtensionRegex = /\.(mov|mp4|jpg|jpeg|png|wav|thm|lrf|nrt|mpk|dat|ini|xml|bin|txt)$/i

    let match: RegExpExecArray | null
    while ((match = linkRegex.exec(html))) {
      const href = match[1]
      const name = match[2]

      // Skip parent directory link
      if (name === '../' || href === '../') continue

      const isFolder = href.endsWith('/') || !fileExtensionRegex.test(name)
      const fullPath = this.resolvePath(basePath, href)

      files.push({
        name: name.endsWith('/') ? name.slice(0, -1) : name,
        path: fullPath,
        size: 0, // HTML listings don't typically include size
        isFolder,
      })
    }

    return files
  }

  private resolvePath(basePath: string, href: string): string {
    if (href.startsWith('/')) {
      return href
    }
    
    const normalizedBase = basePath.endsWith('/') ? basePath : basePath + '/'
    return normalizedBase + href
  }

  private isValidZCamDevice(deviceInfo: CameraInfo): boolean {
    if (!deviceInfo.model || !deviceInfo.serialNumber) {
      return false
    }
    
    const modelLower = deviceInfo.model.toLowerCase()
    return modelLower.includes('zcam') || modelLower.includes('z cam')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// HTTP Client interfaces for dependency injection

export interface HttpClient {
  get(url: string, options?: RequestOptions): Promise<HttpResponse>
}

export interface RequestOptions {
  timeout?: number
  onProgress?: (progress: number) => void
}

export interface HttpResponse {
  ok: boolean
  status: number
  statusText: string
  text(): Promise<string>
  json(): Promise<any>
  arrayBuffer(): Promise<ArrayBuffer>
}

// Default HTTP client implementation
export class DefaultHttpClient implements HttpClient {
  async get(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000)

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return new DefaultHttpResponse(response)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}

// Default HTTP response implementation
class DefaultHttpResponse implements HttpResponse {
  constructor(private response: Response) {}

  get ok(): boolean {
    return this.response.ok
  }

  get status(): number {
    return this.response.status
  }

  get statusText(): string {
    return this.response.statusText
  }

  async text(): Promise<string> {
    return await this.response.text()
  }

  async json(): Promise<any> {
    return await this.response.json()
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return await this.response.arrayBuffer()
  }
}
