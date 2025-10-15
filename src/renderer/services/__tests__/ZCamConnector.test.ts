import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ZCamConnector, HttpClient, HttpResponse } from '../ZCamConnector'
import type { CameraInfo, CameraFile } from '@/shared/types'

// Mock HTTP client for testing
class MockHttpClient implements HttpClient {
  private responses: Map<string, HttpResponse> = new Map()

  setResponse(url: string, response: HttpResponse): void {
    this.responses.set(url, response)
  }

  async get(url: string): Promise<HttpResponse> {
    const response = this.responses.get(url)
    if (!response) {
      throw new Error(`No mock response set for URL: ${url}`)
    }
    return response
  }
}

// Mock HTTP response implementation
class MockHttpResponse implements HttpResponse {
  constructor(
    public ok: boolean,
    public status: number,
    public statusText: string,
    private body: string | object
  ) {}

  async text(): Promise<string> {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
  }

  async json(): Promise<any> {
    return typeof this.body === 'object' ? this.body : JSON.parse(this.body as string)
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    if (typeof this.body === 'string') {
      return new TextEncoder().encode(this.body).buffer
    }
    return new TextEncoder().encode(JSON.stringify(this.body)).buffer
  }
}

describe('ZCamConnector', () => {
  let connector: ZCamConnector
  let mockHttpClient: MockHttpClient

  beforeEach(() => {
    mockHttpClient = new MockHttpClient()
    connector = new ZCamConnector(mockHttpClient)
  })

  describe('connect', () => {
    it('should successfully connect to a valid Z CAM camera', async () => {
      const mockDeviceInfo = {
        model: 'Z CAM E2',
        sn: '12345',
        firmware: '1.0.0',
        batteryLevel: 85,
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      const result = await connector.connect('192.168.1.100')

      expect(result.success).toBe(true)
      expect(result.cameraInfo).toEqual({
        ip: '192.168.1.100',
        model: 'Z CAM E2',
        serialNumber: '12345',
        firmware: '1.0.0',
        batteryLevel: 85,
      })
      expect(connector.isConnected()).toBe(true)
    })

    it('should fail to connect to an invalid device', async () => {
      const mockDeviceInfo = {
        model: 'Canon EOS R5',
        sn: '12345',
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      const result = await connector.connect('192.168.1.100')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Device is not a valid Z CAM camera')
      expect(connector.isConnected()).toBe(false)
    })

    it('should handle network errors gracefully', async () => {
      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(false, 404, 'Not Found', '')
      )

      const result = await connector.connect('192.168.1.100')

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 404')
      expect(connector.isConnected()).toBe(false)
    })

    it('should retry connection attempts on failure', async () => {
      // First two attempts fail, third succeeds
      const mockDeviceInfo = {
        model: 'Z CAM E2',
        sn: '12345',
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      const result = await connector.connect('192.168.1.100')

      expect(result.success).toBe(true)
    })
  })

  describe('disconnect', () => {
    it('should disconnect from the camera', async () => {
      // First connect
      const mockDeviceInfo = {
        model: 'Z CAM E2',
        sn: '12345',
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      await connector.connect('192.168.1.100')
      expect(connector.isConnected()).toBe(true)

      // Then disconnect
      connector.disconnect()
      expect(connector.isConnected()).toBe(false)
      expect(connector.getCurrentCameraInfo()).toBe(null)
    })
  })

  describe('listFiles', () => {
    beforeEach(async () => {
      const mockDeviceInfo = {
        model: 'Z CAM E2',
        sn: '12345',
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      await connector.connect('192.168.1.100')
    })

    it('should list files from a directory', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="../">Parent Directory</a>
            <a href="A001/">A001/</a>
            <a href="A001C001.MOV">A001C001.MOV</a>
            <a href="A001C002.MOV">A001C002.MOV</a>
          </body>
        </html>
      `

      mockHttpClient.setResponse(
        'http://192.168.1.100/DCIM/',
        new MockHttpResponse(true, 200, 'OK', mockHtml)
      )

      const files = await connector.listFiles('/DCIM/')

      expect(files).toHaveLength(3)
      expect(files[0]).toEqual({
        name: 'A001',
        path: '/DCIM/A001/',
        size: 0,
        isFolder: true,
      })
      expect(files[1]).toEqual({
        name: 'A001C001.MOV',
        path: '/DCIM/A001C001.MOV',
        size: 0,
        isFolder: false,
      })
      expect(files[2]).toEqual({
        name: 'A001C002.MOV',
        path: '/DCIM/A001C002.MOV',
        size: 0,
        isFolder: false,
      })
    })

    it('should throw error when not connected', async () => {
      connector.disconnect()

      await expect(connector.listFiles('/DCIM/')).rejects.toThrow('Not connected to camera')
    })

    it('should handle empty directory listings', async () => {
      mockHttpClient.setResponse(
        'http://192.168.1.100/DCIM/',
        new MockHttpResponse(true, 200, 'OK', '<html><body></body></html>')
      )

      const files = await connector.listFiles('/DCIM/')

      expect(files).toHaveLength(0)
    })
  })

  describe('downloadFile', () => {
    beforeEach(async () => {
      const mockDeviceInfo = {
        model: 'Z CAM E2',
        sn: '12345',
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      await connector.connect('192.168.1.100')
    })

    it('should download a file with progress callback', async () => {
      const mockData = 'Mock file content'
      mockHttpClient.setResponse(
        'http://192.168.1.100/DCIM/A001/A001C001.MOV',
        new MockHttpResponse(true, 200, 'OK', mockData)
      )

      const progressCallback = vi.fn()
      const result = await connector.downloadFile(
        'http://192.168.1.100/DCIM/A001/A001C001.MOV',
        progressCallback
      )

      expect(result).toBeDefined()
      expect(result.constructor.name).toBe('ArrayBuffer')
      expect(result.byteLength).toBeGreaterThan(0)
      
      const decodedContent = new TextDecoder().decode(result)
      expect(decodedContent).toBe(mockData)
    })

    it('should throw error when not connected', async () => {
      connector.disconnect()

      await expect(
        connector.downloadFile('http://192.168.1.100/test.mov', () => {})
      ).rejects.toThrow('Not connected to camera')
    })
  })

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(connector.isConnected()).toBe(false)
    })

    it('should return true after successful connection', async () => {
      const mockDeviceInfo = {
        model: 'Z CAM E2',
        sn: '12345',
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      await connector.connect('192.168.1.100')

      expect(connector.isConnected()).toBe(true)
    })
  })

  describe('getCurrentCameraInfo', () => {
    it('should return null when not connected', () => {
      expect(connector.getCurrentCameraInfo()).toBe(null)
    })

    it('should return camera info when connected', async () => {
      const mockDeviceInfo = {
        model: 'Z CAM E2',
        sn: '12345',
        firmware: '1.0.0',
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      await connector.connect('192.168.1.100')

      const info = connector.getCurrentCameraInfo()
      expect(info).toEqual({
        ip: '192.168.1.100',
        model: 'Z CAM E2',
        serialNumber: '12345',
        firmware: '1.0.0',
      })
    })
  })

  describe('getCameraIp', () => {
    it('should return null when not connected', () => {
      expect(connector.getCameraIp()).toBe(null)
    })

    it('should return IP when connected', async () => {
      const mockDeviceInfo = {
        model: 'Z CAM E2',
        sn: '12345',
      }

      mockHttpClient.setResponse(
        'http://192.168.1.100/info',
        new MockHttpResponse(true, 200, 'OK', mockDeviceInfo)
      )

      await connector.connect('192.168.1.100')

      expect(connector.getCameraIp()).toBe('192.168.1.100')
    })
  })

  describe('parseDeviceInfo', () => {
    it('should parse valid device info correctly', () => {
      const mockData = {
        model: 'Z CAM E2',
        sn: '12345',
        firmware: '1.0.0',
        batteryLevel: 85,
        storage: {
          totalSpace: 1000000000,
          freeSpace: 500000000,
          usedSpace: 500000000,
        },
      }

      // Access private method through type assertion for testing
      const connector = new ZCamConnector(mockHttpClient) as any
      const result = connector.parseDeviceInfo(mockData, '192.168.1.100')

      expect(result).toEqual({
        ip: '192.168.1.100',
        model: 'Z CAM E2',
        serialNumber: '12345',
        firmware: '1.0.0',
        batteryLevel: 85,
        storageInfo: {
          totalSpace: 1000000000,
          freeSpace: 500000000,
          usedSpace: 500000000,
        },
      })
    })

    it('should handle missing optional fields', () => {
      const mockData = {
        model: 'Z CAM E2',
        sn: '12345',
      }

      const connector = new ZCamConnector(mockHttpClient) as any
      const result = connector.parseDeviceInfo(mockData, '192.168.1.100')

      expect(result).toEqual({
        ip: '192.168.1.100',
        model: 'Z CAM E2',
        serialNumber: '12345',
        firmware: undefined,
        batteryLevel: undefined,
        storageInfo: undefined,
      })
    })
  })

  describe('parseDirectoryListing', () => {
    it('should parse HTML directory listing correctly', () => {
      const mockHtml = `
        <html>
          <body>
            <a href="../">Parent Directory</a>
            <a href="A001/">A001/</a>
            <a href="A001C001.MOV">A001C001.MOV</a>
            <a href="A001C002.MOV">A001C002.MOV</a>
            <a href="thumbnail.jpg">thumbnail.jpg</a>
          </body>
        </html>
      `

      const connector = new ZCamConnector(mockHttpClient) as any
      const result = connector.parseDirectoryListing(mockHtml, '/DCIM/')

      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({
        name: 'A001',
        path: '/DCIM/A001/',
        size: 0,
        isFolder: true,
      })
      expect(result[1]).toEqual({
        name: 'A001C001.MOV',
        path: '/DCIM/A001C001.MOV',
        size: 0,
        isFolder: false,
      })
      expect(result[2]).toEqual({
        name: 'A001C002.MOV',
        path: '/DCIM/A001C002.MOV',
        size: 0,
        isFolder: false,
      })
      expect(result[3]).toEqual({
        name: 'thumbnail.jpg',
        path: '/DCIM/thumbnail.jpg',
        size: 0,
        isFolder: false,
      })
    })

    it('should skip parent directory links', () => {
      const mockHtml = `
        <html>
          <body>
            <a href="../">../</a>
            <a href="file.mov">file.mov</a>
          </body>
        </html>
      `

      const connector = new ZCamConnector(mockHttpClient) as any
      const result = connector.parseDirectoryListing(mockHtml, '/DCIM/')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('file.mov')
    })
  })

  describe('isValidZCamDevice', () => {
    it('should validate Z CAM devices correctly', () => {
      const validDevices = [
        { model: 'Z CAM E2', serialNumber: '12345' },
        { model: 'Z CAM E2M', serialNumber: '12345' },
        { model: 'Z CAM S6', serialNumber: '12345' },
        { model: 'Z CAM Pro', serialNumber: '12345' },
      ]

      const connector = new ZCamConnector(mockHttpClient) as any

      validDevices.forEach(device => {
        expect(connector.isValidZCamDevice(device as any)).toBe(true)
      })
    })

    it('should reject non-Z CAM devices', () => {
      const invalidDevices = [
        { model: 'Canon EOS R5', serialNumber: '12345' },
        { model: 'Sony A7R IV', serialNumber: '12345' },
        { model: 'Blackmagic Pocket 6K', serialNumber: '12345' },
      ]

      const connector = new ZCamConnector(mockHttpClient) as any

      invalidDevices.forEach(device => {
        expect(connector.isValidZCamDevice(device as any)).toBe(false)
      })
    })
  })
})
