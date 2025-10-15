import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import FileTransferService from '../services/FileTransferService'
import type { TransferProgress, CameraFile } from '@/shared/types'

/**
 * Transfer State Management
 * Handles file downloads, progress tracking, and queue management
 */

// Action types
type TransferAction =
  | { type: 'SET_TRANSFER_SERVICE'; payload: FileTransferService }
  | { type: 'ADD_TRANSFER'; payload: TransferProgress }
  | { type: 'UPDATE_TRANSFER'; payload: TransferProgress }
  | { type: 'REMOVE_TRANSFER'; payload: string }
  | { type: 'SET_TRANSFERS'; payload: TransferProgress[] }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'SET_ERROR'; payload: string | null }

// State interface
interface TransferState {
  transferService: FileTransferService | null
  activeTransfers: Map<string, TransferProgress>
  completedTransfers: Set<string>
  error: string | null
}

// Initial state
const initialState: TransferState = {
  transferService: null,
  activeTransfers: new Map(),
  completedTransfers: new Set(),
  error: null,
}

// Reducer
function transferReducer(state: TransferState, action: TransferAction): TransferState {
  switch (action.type) {
    case 'SET_TRANSFER_SERVICE':
      return {
        ...state,
        transferService: action.payload,
      }

    case 'ADD_TRANSFER':
      return {
        ...state,
        activeTransfers: new Map(state.activeTransfers).set(
          action.payload.fileId,
          action.payload
        ),
        error: null,
      }

    case 'UPDATE_TRANSFER':
      return {
        ...state,
        activeTransfers: new Map(state.activeTransfers).set(
          action.payload.fileId,
          action.payload
        ),
      }

    case 'REMOVE_TRANSFER':
      const newActiveTransfers = new Map(state.activeTransfers)
      const transfer = newActiveTransfers.get(action.payload)
      
      newActiveTransfers.delete(action.payload)
      
      // Add to completed if it was completed
      const newCompletedTransfers = new Set(state.completedTransfers)
      if (transfer?.status === 'completed') {
        newCompletedTransfers.add(action.payload)
      }

      return {
        ...state,
        activeTransfers: newActiveTransfers,
        completedTransfers: newCompletedTransfers,
      }

    case 'SET_TRANSFERS':
      const transfersMap = new Map<string, TransferProgress>()
      action.payload.forEach(transfer => {
        transfersMap.set(transfer.fileId, transfer)
      })
      
      return {
        ...state,
        activeTransfers: transfersMap,
      }

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        completedTransfers: new Set(),
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      }

    default:
      return state
  }
}

// Context type
interface TransferContextType {
  // State
  transferService: FileTransferService | null
  activeTransfers: TransferProgress[]
  completedTransfers: string[]
  error: string | null

  // Computed state
  totalActiveTransfers: number
  totalCompletedTransfers: number
  totalProgress: number
  isAnyTransferActive: boolean

  // Actions
  initializeTransferService: (service: FileTransferService) => void
  downloadFile: (file: CameraFile, destination: string) => Promise<void>
  pauseDownload: (fileId: string) => void
  resumeDownload: (fileId: string) => void
  cancelDownload: (fileId: string) => void
  getTransferProgress: (fileId: string) => TransferProgress | null
  clearCompletedTransfers: () => void
  setError: (error: string | null) => void
  updateTransferProgress: (progress: TransferProgress) => void
}

// Create context
const TransferContext = createContext<TransferContextType | undefined>(undefined)

// Provider props
interface TransferProviderProps {
  children: React.ReactNode
  transferService?: FileTransferService
}

// Provider component
export function TransferProvider({ children, transferService }: TransferProviderProps) {
  const [state, dispatch] = useReducer(transferReducer, initialState)

  // Initialize transfer service
  const initializeTransferService = useCallback((service: FileTransferService) => {
    dispatch({ type: 'SET_TRANSFER_SERVICE', payload: service })
    
    // Set up progress callback
    service.setProgressCallback((progress: TransferProgress) => {
      dispatch({ type: 'UPDATE_TRANSFER', payload: progress })
    })
  }, [])

  // Memoized computed values
  const activeTransfers = useMemo(() => 
    Array.from(state.activeTransfers.values()),
    [state.activeTransfers]
  )

  const completedTransfers = useMemo(() => 
    Array.from(state.completedTransfers),
    [state.completedTransfers]
  )

  const totalActiveTransfers = useMemo(() => 
    state.activeTransfers.size,
    [state.activeTransfers]
  )

  const totalCompletedTransfers = useMemo(() => 
    state.completedTransfers.size,
    [state.completedTransfers]
  )

  const totalProgress = useMemo(() => {
    if (activeTransfers.length === 0) return 0
    
    const totalBytes = activeTransfers.reduce((sum, transfer) => 
      sum + transfer.totalBytes, 0
    )
    const receivedBytes = activeTransfers.reduce((sum, transfer) => 
      sum + transfer.bytesReceived, 0
    )
    
    return totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0
  }, [activeTransfers])

  const isAnyTransferActive = useMemo(() => 
    activeTransfers.some(transfer => transfer.status === 'downloading'),
    [activeTransfers]
  )

  // Actions
  const downloadFile = useCallback(async (file: CameraFile, destination: string): Promise<void> => {
    if (!state.transferService) {
      throw new Error('Transfer service not initialized')
    }

    try {
      dispatch({ type: 'SET_ERROR', payload: null })
      await state.transferService.downloadFile(file, destination)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }, [state.transferService])

  const pauseDownload = useCallback((fileId: string) => {
    if (state.transferService) {
      state.transferService.pauseDownload(fileId)
    }
  }, [state.transferService])

  const resumeDownload = useCallback((fileId: string) => {
    if (state.transferService) {
      state.transferService.resumeDownload(fileId)
    }
  }, [state.transferService])

  const cancelDownload = useCallback((fileId: string) => {
    if (state.transferService) {
      state.transferService.cancelDownload(fileId)
      dispatch({ type: 'REMOVE_TRANSFER', payload: fileId })
    }
  }, [state.transferService])

  const getTransferProgress = useCallback((fileId: string): TransferProgress | null => {
    return state.activeTransfers.get(fileId) || null
  }, [state.activeTransfers])

  const clearCompletedTransfers = useCallback(() => {
    if (state.transferService) {
      state.transferService.clearCompleted()
    }
    dispatch({ type: 'CLEAR_COMPLETED' })
  }, [state.transferService])

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const updateTransferProgress = useCallback((progress: TransferProgress) => {
    dispatch({ type: 'UPDATE_TRANSFER', payload: progress })
  }, [])

  // Initialize with provided service
  useEffect(() => {
    if (transferService && !state.transferService) {
      initializeTransferService(transferService)
    }
  }, [transferService, state.transferService, initializeTransferService])

  // Context value
  const contextValue: TransferContextType = {
    // State
    transferService: state.transferService,
    activeTransfers,
    completedTransfers,
    error: state.error,

    // Computed state
    totalActiveTransfers,
    totalCompletedTransfers,
    totalProgress,
    isAnyTransferActive,

    // Actions
    initializeTransferService,
    downloadFile,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    getTransferProgress,
    clearCompletedTransfers,
    setError,
    updateTransferProgress,
  }

  return (
    <TransferContext.Provider value={contextValue}>
      {children}
    </TransferContext.Provider>
  )
}

// Hook to use transfer context
export function useTransfers(): TransferContextType {
  const context = useContext(TransferContext)
  
  if (context === undefined) {
    throw new Error('useTransfers must be used within a TransferProvider')
  }
  
  return context
}

// Optimized hooks for specific data
export function useTransferProgress(): Pick<TransferContextType, 'activeTransfers' | 'totalProgress' | 'isAnyTransferActive'> {
  const { activeTransfers, totalProgress, isAnyTransferActive } = useTransfers()
  return { activeTransfers, totalProgress, isAnyTransferActive }
}

export function useTransferActions(): Pick<TransferContextType, 'downloadFile' | 'pauseDownload' | 'resumeDownload' | 'cancelDownload'> {
  const { downloadFile, pauseDownload, resumeDownload, cancelDownload } = useTransfers()
  return { downloadFile, pauseDownload, resumeDownload, cancelDownload }
}

export function useTransferService(): Pick<TransferContextType, 'transferService' | 'initializeTransferService'> {
  const { transferService, initializeTransferService } = useTransfers()
  return { transferService, initializeTransferService }
}