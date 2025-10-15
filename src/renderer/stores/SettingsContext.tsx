import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { SettingsState, SortCriteria } from '@/shared/types'

/**
 * Settings State Management
 * Handles user preferences, theme, and configuration with persistence
 */

// Action types
type SettingsAction =
  | { type: 'SET_INGEST_PATH'; payload: string }
  | { type: 'SET_AUTO_INGEST'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_SORT_PREFERENCE'; payload: SortCriteria }
  | { type: 'SET_MAX_CONCURRENT_DOWNLOADS'; payload: number }
  | { type: 'SET_THUMBNAIL_CACHE_SIZE'; payload: number }
  | { type: 'LOAD_SETTINGS'; payload: Partial<SettingsState> }
  | { type: 'RESET_SETTINGS' }

// Default settings
const defaultSettings: SettingsState = {
  ingestPath: '',
  autoIngest: false,
  theme: 'light',
  sortPreference: { field: 'date', order: 'desc' },
  maxConcurrentDownloads: 3,
  thumbnailCacheSize: 1000,
}

// Reducer
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_INGEST_PATH':
      return {
        ...state,
        ingestPath: action.payload,
      }

    case 'SET_AUTO_INGEST':
      return {
        ...state,
        autoIngest: action.payload,
      }

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      }

    case 'SET_SORT_PREFERENCE':
      return {
        ...state,
        sortPreference: action.payload,
      }

    case 'SET_MAX_CONCURRENT_DOWNLOADS':
      return {
        ...state,
        maxConcurrentDownloads: Math.max(1, Math.min(10, action.payload)), // Clamp between 1-10
      }

    case 'SET_THUMBNAIL_CACHE_SIZE':
      return {
        ...state,
        thumbnailCacheSize: Math.max(100, Math.min(10000, action.payload)), // Clamp between 100-10000
      }

    case 'LOAD_SETTINGS':
      return {
        ...state,
        ...action.payload,
      }

    case 'RESET_SETTINGS':
      return defaultSettings

    default:
      return state
  }
}

// Context type
interface SettingsContextType {
  // State
  ingestPath: string
  autoIngest: boolean
  theme: 'light' | 'dark'
  sortPreference: SortCriteria
  maxConcurrentDownloads: number
  thumbnailCacheSize: number

  // Actions
  setIngestPath: (path: string) => void
  setAutoIngest: (enabled: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setSortPreference: (criteria: SortCriteria) => void
  setMaxConcurrentDownloads: (count: number) => void
  setThumbnailCacheSize: (size: number) => void
  resetSettings: () => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// Provider props
interface SettingsProviderProps {
  children: React.ReactNode
}

// Provider component
export function SettingsProvider({ children }: SettingsProviderProps) {
  const [state, dispatch] = useReducer(settingsReducer, defaultSettings)

  // Load settings from storage
  const loadSettings = useCallback(async () => {
    try {
      // Check if we're in Electron environment
      if (window.electronAPI?.store) {
        const savedSettings = window.electronAPI.store.get('settings')
        if (savedSettings) {
          dispatch({ type: 'LOAD_SETTINGS', payload: savedSettings })
        }
      } else {
        // Fallback to localStorage for development
        const savedSettings = localStorage.getItem('zcam-gallery-settings')
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings)
          dispatch({ type: 'LOAD_SETTINGS', payload: parsed })
        }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error)
    }
  }, [])

  // Save settings to storage
  const saveSettings = useCallback(async () => {
    try {
      // Check if we're in Electron environment
      if (window.electronAPI?.store) {
        window.electronAPI.store.set('settings', state)
      } else {
        // Fallback to localStorage for development
        localStorage.setItem('zcam-gallery-settings', JSON.stringify(state))
      }
    } catch (error) {
      console.warn('Failed to save settings:', error)
    }
  }, [state])

  // Actions
  const setIngestPath = useCallback((path: string) => {
    dispatch({ type: 'SET_INGEST_PATH', payload: path })
  }, [])

  const setAutoIngest = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_INGEST', payload: enabled })
  }, [])

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }, [])

  const setSortPreference = useCallback((criteria: SortCriteria) => {
    dispatch({ type: 'SET_SORT_PREFERENCE', payload: criteria })
  }, [])

  const setMaxConcurrentDownloads = useCallback((count: number) => {
    dispatch({ type: 'SET_MAX_CONCURRENT_DOWNLOADS', payload: count })
  }, [])

  const setThumbnailCacheSize = useCallback((size: number) => {
    dispatch({ type: 'SET_THUMBNAIL_CACHE_SIZE', payload: size })
  }, [])

  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' })
  }, [])

  // Auto-save settings when they change
  useEffect(() => {
    saveSettings()
  }, [state, saveSettings])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
    document.documentElement.className = state.theme
  }, [state.theme])

  // Context value
  const contextValue: SettingsContextType = {
    // State
    ingestPath: state.ingestPath,
    autoIngest: state.autoIngest,
    theme: state.theme,
    sortPreference: state.sortPreference,
    maxConcurrentDownloads: state.maxConcurrentDownloads,
    thumbnailCacheSize: state.thumbnailCacheSize,

    // Actions
    setIngestPath,
    setAutoIngest,
    setTheme,
    setSortPreference,
    setMaxConcurrentDownloads,
    setThumbnailCacheSize,
    resetSettings,
    loadSettings,
    saveSettings,
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

// Hook to use settings context
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext)
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  
  return context
}

// Optimized hooks for specific settings
export function useTheme(): Pick<SettingsContextType, 'theme' | 'setTheme'> {
  const { theme, setTheme } = useSettings()
  return { theme, setTheme }
}

export function useIngestSettings(): Pick<SettingsContextType, 'ingestPath' | 'autoIngest' | 'setIngestPath' | 'setAutoIngest'> {
  const { ingestPath, autoIngest, setIngestPath, setAutoIngest } = useSettings()
  return { ingestPath, autoIngest, setIngestPath, setAutoIngest }
}

export function usePerformanceSettings(): Pick<SettingsContextType, 'maxConcurrentDownloads' | 'thumbnailCacheSize' | 'setMaxConcurrentDownloads' | 'setThumbnailCacheSize'> {
  const { maxConcurrentDownloads, thumbnailCacheSize, setMaxConcurrentDownloads, setThumbnailCacheSize } = useSettings()
  return { maxConcurrentDownloads, thumbnailCacheSize, setMaxConcurrentDownloads, setThumbnailCacheSize }
}

export function useSortSettings(): Pick<SettingsContextType, 'sortPreference' | 'setSortPreference'> {
  const { sortPreference, setSortPreference } = useSettings()
  return { sortPreference, setSortPreference }
}