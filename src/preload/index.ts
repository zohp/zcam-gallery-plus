import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '@/shared/types'

/**
 * Preload script - Exposes secure APIs to renderer process
 * Provides type-safe bridge between main and renderer processes
 */

// File operations API
const fileAPI = {
  download: async (
    url: string,
    destination: string,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    return ipcRenderer.invoke('file:download', url, destination, onProgress)
  },

  readAsDataURL: async (path: string): Promise<string> => {
    return ipcRenderer.invoke('file:readAsDataURL', path)
  },

  getMetadata: async (path: string): Promise<any> => {
    return ipcRenderer.invoke('file:getMetadata', path)
  },

  delete: async (path: string): Promise<void> => {
    return ipcRenderer.invoke('file:delete', path)
  },

  ensureDirExists: async (path: string): Promise<void> => {
    return ipcRenderer.invoke('file:ensureDirExists', path)
  },

  pathExists: async (path: string): Promise<boolean> => {
    return ipcRenderer.invoke('file:pathExists', path)
  },
}

// Dialog API
const dialogAPI = {
  showOpenDialog: async (options?: any): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:showOpenDialog', options)
  },

  showSaveDialog: async (options?: any): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:showSaveDialog', options)
  },

  showErrorBox: async (title: string, content: string): Promise<void> => {
    return ipcRenderer.invoke('dialog:showErrorBox', title, content)
  },

  showMessageBox: async (options: any): Promise<number> => {
    return ipcRenderer.invoke('dialog:showMessageBox', options)
  },
}

// Camera API
const cameraAPI = {
  listFiles: async (ip: string, path: string): Promise<string> => {
    return ipcRenderer.invoke('camera:listFiles', ip, path)
  },

  getDeviceInfo: async (ip: string): Promise<any> => {
    return ipcRenderer.invoke('camera:getDeviceInfo', ip)
  },

  downloadFile: async (url: string, destination: string): Promise<void> => {
    return ipcRenderer.invoke('camera:downloadFile', url, destination)
  },
}

// Watcher API
const watcherAPI = {
  start: async (
    folderPath: string,
    options?: {
      recursive?: boolean
      ignoreInitial?: boolean
      ignored?: string[]
    }
  ): Promise<boolean> => {
    return ipcRenderer.invoke('watcher:start', folderPath, options)
  },

  stop: async (folderPath: string): Promise<boolean> => {
    return ipcRenderer.invoke('watcher:stop', folderPath)
  },

  stopAll: async (): Promise<number> => {
    return ipcRenderer.invoke('watcher:stopAll')
  },

  list: async (): Promise<string[]> => {
    return ipcRenderer.invoke('watcher:list')
  },

  onFolderChanged: (callback: (event: any) => void): (() => void) => {
    const listener = (_event: any, watchEvent: any) => {
      callback(watchEvent)
    }

    ipcRenderer.on('watcher:event', listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('watcher:event', listener)
    }
  },
}

// App API
const appAPI = {
  getAppDataPath: (): string => {
    return ipcRenderer.sendSync('app:getDataPath')
  },

  getVersion: (): string => {
    return ipcRenderer.sendSync('app:getVersion')
  },

  isPackaged: (): boolean => {
    return ipcRenderer.sendSync('app:isPackaged')
  },
}

// IPC API
const ipcAPI = {
  sendMessage: (channel: string, ...args: any[]): void => {
    ipcRenderer.send(channel, ...args)
  },

  on: (channel: string, callback: (...args: any[]) => void): (() => void) => {
    const listener = (_event: any, ...args: any[]) => {
      callback(...args)
    }

    ipcRenderer.on(channel, listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  once: (channel: string, callback: (...args: any[]) => void): void => {
    ipcRenderer.once(channel, callback)
  },

  off: (channel: string, callback: (...args: any[]) => void): void => {
    ipcRenderer.removeListener(channel, callback)
  },

  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel)
  },
}

// Store API (for settings persistence)
const storeAPI = {
  get: (key: string): any => {
    return ipcRenderer.sendSync('store:get', key)
  },

  set: (key: string, value: any): void => {
    ipcRenderer.sendSync('store:set', key, value)
  },

  delete: (key: string): void => {
    ipcRenderer.sendSync('store:delete', key)
  },

  onDidChange: (callback: (key: string, value: any) => void): (() => void) => {
    const listener = (_event: any, key: string, value: any) => {
      callback(key, value)
    }

    ipcRenderer.on('store:changed', listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('store:changed', listener)
    }
  },
}

// Migration API
const migrationAPI = {
  isNeeded: async (): Promise<{ success: boolean; needed?: boolean; error?: string }> => {
    return ipcRenderer.invoke('migration:isNeeded')
  },

  getInfo: async (): Promise<{ success: boolean; info?: any; error?: string }> => {
    return ipcRenderer.invoke('migration:getInfo')
  },

  perform: async (): Promise<{ success: boolean; result?: any; error?: string }> => {
    return ipcRenderer.invoke('migration:perform')
  },

  validate: async (): Promise<{ success: boolean; validation?: any; error?: string }> => {
    return ipcRenderer.invoke('migration:validate')
  },

  getStatus: async (): Promise<{ success: boolean; status?: any; error?: string }> => {
    return ipcRenderer.invoke('migration:getStatus')
  },

  rollback: async (backupPath: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('migration:rollback', backupPath)
  },

  cleanup: async (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('migration:cleanup')
  },

  isFirstRunAfterMigration: async (): Promise<{ success: boolean; isFirstRun?: boolean; error?: string }> => {
    return ipcRenderer.invoke('migration:isFirstRunAfterMigration')
  },
}

// Expose APIs to renderer process
const electronAPI: ElectronAPI = {
  file: fileAPI,
  dialog: dialogAPI,
  camera: cameraAPI,
  watcher: watcherAPI,
  app: appAPI,
  ipc: ipcAPI,
  store: storeAPI,
  migration: migrationAPI,
}

// Context bridge - secure exposure to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type declaration for global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
