import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import type { GalleryItem, CameraFile, SortCriteria, FilterCriteria } from '@/shared/types'

/**
 * Gallery State Management
 * Handles file browsing, sorting, filtering, and virtual scrolling optimization
 */

// Action types
type GalleryAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ITEMS'; payload: GalleryItem[] }
  | { type: 'ADD_ITEMS'; payload: GalleryItem[] }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<GalleryItem> } }
  | { type: 'SET_CURRENT_PATH'; payload: string }
  | { type: 'SET_SORT_CRITERIA'; payload: SortCriteria }
  | { type: 'SET_FILTER_CRITERIA'; payload: FilterCriteria }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ITEMS' }

// State interface
interface GalleryState {
  items: GalleryItem[]
  loading: boolean
  currentPath: string
  sortBy: SortCriteria
  filterBy: FilterCriteria
  error: string | null
}

// Initial state
const initialState: GalleryState = {
  items: [],
  loading: false,
  currentPath: '/DCIM/',
  sortBy: { field: 'date', order: 'desc' },
  filterBy: {},
  error: null,
}

// Reducer
function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error, // Clear error when starting to load
      }

    case 'SET_ITEMS':
      return {
        ...state,
        items: action.payload,
        loading: false,
        error: null,
      }

    case 'ADD_ITEMS':
      return {
        ...state,
        items: [...state.items, ...action.payload],
      }

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
      }

    case 'SET_CURRENT_PATH':
      return {
        ...state,
        currentPath: action.payload,
        items: [], // Clear items when changing path
        error: null,
      }

    case 'SET_SORT_CRITERIA':
      return {
        ...state,
        sortBy: action.payload,
      }

    case 'SET_FILTER_CRITERIA':
      return {
        ...state,
        filterBy: action.payload,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      }

    case 'CLEAR_ITEMS':
      return {
        ...state,
        items: [],
        error: null,
      }

    default:
      return state
  }
}

// Context type
interface GalleryContextType {
  // State
  items: GalleryItem[]
  loading: boolean
  currentPath: string
  sortBy: SortCriteria
  filterBy: FilterCriteria
  error: string | null

  // Computed state
  filteredAndSortedItems: GalleryItem[]
  itemCount: number
  folderCount: number
  fileCount: number

  // Actions
  setLoading: (loading: boolean) => void
  setItems: (items: GalleryItem[]) => void
  addItems: (items: GalleryItem[]) => void
  updateItem: (id: string, updates: Partial<GalleryItem>) => void
  setCurrentPath: (path: string) => void
  setSortCriteria: (criteria: SortCriteria) => void
  setFilterCriteria: (criteria: FilterCriteria) => void
  setError: (error: string | null) => void
  clearItems: () => void
  navigateToPath: (path: string) => void
  navigateUp: () => void
}

// Create context
const GalleryContext = createContext<GalleryContextType | undefined>(undefined)

// Provider props
interface GalleryProviderProps {
  children: React.ReactNode
}

// Provider component
export function GalleryProvider({ children }: GalleryProviderProps) {
  const [state, dispatch] = useReducer(galleryReducer, initialState)

  // Memoized filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = state.items

    // Apply filters
    if (state.filterBy.type) {
      filtered = filtered.filter(item => item.type === state.filterBy.type)
    }

    if (state.filterBy.searchQuery) {
      const query = state.filterBy.searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query)
      )
    }

    if (state.filterBy.dateRange) {
      filtered = filtered.filter(item => {
        if (!item.modifiedTime) return true
        
        const itemDate = new Date(item.modifiedTime)
        return itemDate >= state.filterBy.dateRange!.start &&
               itemDate <= state.filterBy.dateRange!.end
      })
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const { field, order } = state.sortBy
      let comparison = 0

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          const dateA = new Date(a.modifiedTime || 0)
          const dateB = new Date(b.modifiedTime || 0)
          comparison = dateA.getTime() - dateB.getTime()
          break
        case 'size':
          comparison = (a.size || 0) - (b.size || 0)
          break
      }

      return order === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [state.items, state.filterBy, state.sortBy])

  // Memoized computed values
  const itemCount = useMemo(() => state.items.length, [state.items])
  const folderCount = useMemo(() => 
    state.items.filter(item => item.isFolder).length, 
    [state.items]
  )
  const fileCount = useMemo(() => 
    state.items.filter(item => !item.isFolder).length, 
    [state.items]
  )

  // Actions
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  const setItems = useCallback((items: GalleryItem[]) => {
    dispatch({ type: 'SET_ITEMS', payload: items })
  }, [])

  const addItems = useCallback((items: GalleryItem[]) => {
    dispatch({ type: 'ADD_ITEMS', payload: items })
  }, [])

  const updateItem = useCallback((id: string, updates: Partial<GalleryItem>) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } })
  }, [])

  const setCurrentPath = useCallback((path: string) => {
    dispatch({ type: 'SET_CURRENT_PATH', payload: path })
  }, [])

  const setSortCriteria = useCallback((criteria: SortCriteria) => {
    dispatch({ type: 'SET_SORT_CRITERIA', payload: criteria })
  }, [])

  const setFilterCriteria = useCallback((criteria: FilterCriteria) => {
    dispatch({ type: 'SET_FILTER_CRITERIA', payload: criteria })
  }, [])

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const clearItems = useCallback(() => {
    dispatch({ type: 'CLEAR_ITEMS' })
  }, [])

  const navigateToPath = useCallback((path: string) => {
    setCurrentPath(path)
  }, [setCurrentPath])

  const navigateUp = useCallback(() => {
    const pathParts = state.currentPath.split('/').filter(Boolean)
    if (pathParts.length > 1) {
      pathParts.pop()
      const newPath = '/' + pathParts.join('/') + '/'
      setCurrentPath(newPath)
    }
  }, [state.currentPath, setCurrentPath])

  // Context value
  const contextValue: GalleryContextType = {
    // State
    items: state.items,
    loading: state.loading,
    currentPath: state.currentPath,
    sortBy: state.sortBy,
    filterBy: state.filterBy,
    error: state.error,

    // Computed state
    filteredAndSortedItems,
    itemCount,
    folderCount,
    fileCount,

    // Actions
    setLoading,
    setItems,
    addItems,
    updateItem,
    setCurrentPath,
    setSortCriteria,
    setFilterCriteria,
    setError,
    clearItems,
    navigateToPath,
    navigateUp,
  }

  return (
    <GalleryContext.Provider value={contextValue}>
      {children}
    </GalleryContext.Provider>
  )
}

// Hook to use gallery context
export function useGallery(): GalleryContextType {
  const context = useContext(GalleryContext)
  
  if (context === undefined) {
    throw new Error('useGallery must be used within a GalleryProvider')
  }
  
  return context
}

// Optimized hooks for specific data
export function useGalleryItems(): Pick<GalleryContextType, 'filteredAndSortedItems' | 'loading' | 'error'> {
  const { filteredAndSortedItems, loading, error } = useGallery()
  return { filteredAndSortedItems, loading, error }
}

export function useGalleryNavigation(): Pick<GalleryContextType, 'currentPath' | 'navigateToPath' | 'navigateUp'> {
  const { currentPath, navigateToPath, navigateUp } = useGallery()
  return { currentPath, navigateToPath, navigateUp }
}

export function useGallerySorting(): Pick<GalleryContextType, 'sortBy' | 'setSortCriteria'> {
  const { sortBy, setSortCriteria } = useGallery()
  return { sortBy, setSortCriteria }
}

export function useGalleryFiltering(): Pick<GalleryContextType, 'filterBy' | 'setFilterCriteria'> {
  const { filterBy, setFilterCriteria } = useGallery()
  return { filterBy, setFilterCriteria }
}