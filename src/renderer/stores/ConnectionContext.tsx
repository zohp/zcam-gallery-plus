import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import ZCamConnector from '../services/ZCamConnector'
import type { ConnectionState, CameraInfo, ConnectResult } from '@/shared/types'

/**
 * Connection State Management
 * Handles camera connection, device info, and connection status
 */

// Action types
type ConnectionAction =
  | { type: 'CONNECT_START' }
  | { type: 'CONNECT_SUCCESS'; payload: CameraInfo }
  | { type: 'CONNECT_ERROR'; payload: string }
  | { type: 'DISCONNECT' }
  | { type: 'UPDATE_DEVICE_INFO'; payload: Partial<CameraInfo> }

// Initial state
const initialState: ConnectionState = {
  status: 'disconnected',
  cameraInfo: null,
  error: null,
}

// Reducer
function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case 'CONNECT_START':
      return {
        ...state,
        status: 'connecting',
        error: null,
      }

    case 'CONNECT_SUCCESS':
      return {
        ...state,
        status: 'connected',
        cameraInfo: action.payload,
        error: null,
      }

    case 'CONNECT_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.payload,
        cameraInfo: null,
      }

    case 'DISCONNECT':
      return {
        ...state,
        status: 'disconnected',
        cameraInfo: null,
        error: null,
      }

    case 'UPDATE_DEVICE_INFO':
      return {
        ...state,
        cameraInfo: state.cameraInfo ? { ...state.cameraInfo, ...action.payload } : null,
      }

    default:
      return state
  }
}

// Context type
interface ConnectionContextType {
  // State
  status: ConnectionState['status']
  cameraInfo: CameraInfo | null
  error: string | null
  isConnected: boolean

  // Actions
  connect: (ip: string) => Promise<ConnectResult>
  disconnect: () => void
  refreshDeviceInfo: () => Promise<void>
}

// Create context
const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined)

// Provider props
interface ConnectionProviderProps {
  children: React.ReactNode
  zcamConnector?: ZCamConnector
}

// Provider component
export function ConnectionProvider({ children, zcamConnector }: ConnectionProviderProps) {
  const [state, dispatch] = useReducer(connectionReducer, initialState)
  
  // Use provided connector or create default instance
  const connector = zcamConnector || new ZCamConnector()

  // Connect to camera
  const connect = useCallback(async (ip: string): Promise<ConnectResult> => {
    try {
      dispatch({ type: 'CONNECT_START' })

      const result = await connector.connect(ip)

      if (result.success && result.cameraInfo) {
        dispatch({ type: 'CONNECT_SUCCESS', payload: result.cameraInfo })
      } else {
        dispatch({ type: 'CONNECT_ERROR', payload: result.error || 'Connection failed' })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error'
      dispatch({ type: 'CONNECT_ERROR', payload: errorMessage })
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [connector])

  // Disconnect from camera
  const disconnect = useCallback(() => {
    connector.disconnect()
    dispatch({ type: 'DISCONNECT' })
  }, [connector])

  // Refresh device info
  const refreshDeviceInfo = useCallback(async () => {
    if (!connector.isConnected()) {
      return
    }

    try {
      const deviceInfo = await connector.getDeviceInfo(connector.getCameraIp() || '')
      dispatch({ type: 'UPDATE_DEVICE_INFO', payload: deviceInfo })
    } catch (error) {
      console.warn('Failed to refresh device info:', error)
    }
  }, [connector])

  // Auto-refresh device info periodically when connected
  useEffect(() => {
    if (state.status === 'connected') {
      const interval = setInterval(refreshDeviceInfo, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [state.status, refreshDeviceInfo])

  // Context value
  const contextValue: ConnectionContextType = {
    // State
    status: state.status,
    cameraInfo: state.cameraInfo,
    error: state.error,
    isConnected: state.status === 'connected',

    // Actions
    connect,
    disconnect,
    refreshDeviceInfo,
  }

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  )
}

// Hook to use connection context
export function useConnection(): ConnectionContextType {
  const context = useContext(ConnectionContext)
  
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider')
  }
  
  return context
}

// Hook for connection status only (optimized for components that only need status)
export function useConnectionStatus(): Pick<ConnectionContextType, 'status' | 'isConnected' | 'error'> {
  const { status, isConnected, error } = useConnection()
  return { status, isConnected, error }
}

// Hook for camera info only (optimized for components that only need camera info)
export function useCameraInfo(): Pick<ConnectionContextType, 'cameraInfo'> {
  const { cameraInfo } = useConnection()
  return { cameraInfo }
}