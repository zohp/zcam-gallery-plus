import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConnectionButton } from '../controls/ConnectionButton'
import { ConnectionProvider } from '../../stores/ConnectionContext'
import type { CameraInfo } from '@/shared/types'

// Mock the ConnectionContext
const mockConnectionContext = {
  status: 'disconnected' as const,
  cameraInfo: null,
  error: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  refreshDeviceInfo: vi.fn(),
  isConnected: false,
}

vi.mock('../../stores/ConnectionContext', () => ({
  useConnection: () => mockConnectionContext,
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('ConnectionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnectionContext.status = 'disconnected'
    mockConnectionContext.cameraInfo = null
    mockConnectionContext.error = null
    mockConnectionContext.isConnected = false
  })

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <ConnectionProvider>
        {component}
      </ConnectionProvider>
    )
  }

  describe('initial state', () => {
    it('should render connect button when disconnected', () => {
      renderWithProvider(<ConnectionButton />)
      
      expect(screen.getByText('Connect')).toBeDefined()
      expect(screen.getByLabelText('Connect camera')).toBeDefined()
    })

    it('should show correct status icon', () => {
      renderWithProvider(<ConnectionButton />)
      
      const icon = screen.getByText('⚫')
      expect(icon).toBeDefined()
    })
  })

  describe('connection flow', () => {
    it('should call connect when button is clicked', async () => {
      mockConnectionContext.connect.mockResolvedValue(undefined)
      
      renderWithProvider(<ConnectionButton />)
      
      const connectButton = screen.getByText('Connect')
      fireEvent.click(connectButton)
      
      expect(mockConnectionContext.connect).toHaveBeenCalledWith('10.98.32.1')
    })

    it('should show connecting state', () => {
      mockConnectionContext.status = 'connecting'
      
      renderWithProvider(<ConnectionButton />)
      
      expect(screen.getByText('Connecting...')).toBeDefined()
      expect(screen.getByText('⏳')).toBeDefined()
    })

    it('should show connected state', () => {
      const mockCameraInfo: CameraInfo = {
        ip: '10.98.32.1',
        model: 'Z CAM E2',
        serialNumber: 'ZCAM123',
        firmware: '1.0.0',
        batteryLevel: 85,
      }
      
      mockConnectionContext.status = 'connected'
      mockConnectionContext.cameraInfo = mockCameraInfo
      mockConnectionContext.isConnected = true
      
      renderWithProvider(<ConnectionButton />)
      
      expect(screen.getByText('Disconnect')).toBeDefined()
      expect(screen.getByText('🟢')).toBeDefined()
    })

    it('should show error state', () => {
      mockConnectionContext.status = 'error'
      mockConnectionContext.error = 'Connection failed'
      
      renderWithProvider(<ConnectionButton />)
      
      expect(screen.getByText('Retry Connection')).toBeDefined()
      expect(screen.getByText('🔴')).toBeDefined()
    })
  })

  describe('disconnect functionality', () => {
    it('should call disconnect when connected', () => {
      const mockCameraInfo: CameraInfo = {
        ip: '10.98.32.1',
        model: 'Z CAM E2',
        serialNumber: 'ZCAM123',
        firmware: '1.0.0',
        batteryLevel: 85,
      }
      
      mockConnectionContext.status = 'connected'
      mockConnectionContext.cameraInfo = mockCameraInfo
      mockConnectionContext.isConnected = true
      
      renderWithProvider(<ConnectionButton />)
      
      const disconnectButton = screen.getByText('Disconnect')
      fireEvent.click(disconnectButton)
      
      expect(mockConnectionContext.disconnect).toHaveBeenCalled()
    })
  })

  describe('tooltip functionality', () => {
    it('should show connection details on hover', async () => {
      const mockCameraInfo: CameraInfo = {
        ip: '10.98.32.1',
        model: 'Z CAM E2',
        serialNumber: 'ZCAM123',
        firmware: '1.0.0',
        batteryLevel: 85,
      }
      
      mockConnectionContext.status = 'connected'
      mockConnectionContext.cameraInfo = mockCameraInfo
      mockConnectionContext.isConnected = true
      
      renderWithProvider(<ConnectionButton />)
      
      const button = screen.getByRole('button')
      fireEvent.mouseEnter(button)
      
      await waitFor(() => {
        expect(screen.getByText('Z CAM E2 (10.98.32.1)')).toBeDefined()
        expect(screen.getByText('Model: Z CAM E2')).toBeDefined()
        expect(screen.getByText('Serial: ZCAM123')).toBeDefined()
        expect(screen.getByText('Firmware: 1.0.0')).toBeDefined()
        expect(screen.getByText('Battery: 85%')).toBeDefined()
      })
    })

    it('should show error message on hover when disconnected', async () => {
      mockConnectionContext.status = 'error'
      mockConnectionContext.error = 'Network timeout'
      
      renderWithProvider(<ConnectionButton />)
      
      const button = screen.getByRole('button')
      fireEvent.mouseEnter(button)
      
      await waitFor(() => {
        expect(screen.getByText('Network timeout')).toBeDefined()
      })
    })

    it('should hide tooltip when mouse leaves', async () => {
      const mockCameraInfo: CameraInfo = {
        ip: '10.98.32.1',
        model: 'Z CAM E2',
        serialNumber: 'ZCAM123',
        firmware: '1.0.0',
        batteryLevel: 85,
      }
      
      mockConnectionContext.status = 'connected'
      mockConnectionContext.cameraInfo = mockCameraInfo
      mockConnectionContext.isConnected = true
      
      renderWithProvider(<ConnectionButton />)
      
      const button = screen.getByRole('button')
      fireEvent.mouseEnter(button)
      
      await waitFor(() => {
        expect(screen.getByText('Z CAM E2 (10.98.32.1)')).toBeDefined()
      })
      
      fireEvent.mouseLeave(button)
      
      await waitFor(() => {
        expect(screen.queryByText('Z CAM E2 (10.98.32.1)')).toBeNull()
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProvider(<ConnectionButton />)
      
      const button = screen.getByRole('button')
      expect(button.getAttribute('aria-label')).toBe('Connect camera')
    })

    it('should be disabled when connecting', () => {
      mockConnectionContext.status = 'connecting'
      
      renderWithProvider(<ConnectionButton />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should be disabled when already connected and connecting', () => {
      mockConnectionContext.status = 'connecting'
      mockConnectionContext.isConnected = true
      
      renderWithProvider(<ConnectionButton />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockConnectionContext.connect.mockRejectedValue(new Error('Connection failed'))
      
      renderWithProvider(<ConnectionButton />)
      
      const connectButton = screen.getByText('Connect')
      fireEvent.click(connectButton)
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Connection failed:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })
  })
})
