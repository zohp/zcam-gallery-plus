import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { IPCCoordinator } from './ipc'

/**
 * Electron Main Process Entry Point
 * Handles window creation, IPC setup, and app lifecycle
 */

class ElectronApp {
  private mainWindow: BrowserWindow | null = null
  private ipcCoordinator: IPCCoordinator

  constructor() {
    this.ipcCoordinator = new IPCCoordinator()
  }

  /**
   * Initialize the application
   */
  async init(): Promise<void> {
    // Wait for Electron to be ready
    await app.whenReady()

    // Set up IPC handlers
    this.setupIPC()

    // Create main window
    await this.createMainWindow()

    // Handle app events
    this.setupAppEvents()
  }

  /**
   * Set up IPC communication
   */
  private setupIPC(): void {
    this.ipcCoordinator.registerAllHandlers()
    
    // App-specific IPC handlers
    ipcMain.handle('app:getDataPath', () => app.getPath('userData'))
    ipcMain.handle('app:getVersion', () => app.getVersion())
    ipcMain.handle('app:isPackaged', () => app.isPackaged)
    
    // Store handlers (simple JSON file-based storage)
    ipcMain.handle('store:get', (_, key: string) => {
      try {
        const fs = require('fs')
        const path = require('path')
        const storePath = path.join(app.getPath('userData'), 'store.json')
        
        if (!fs.existsSync(storePath)) {
          return null
        }
        
        const data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
        return data[key] || null
      } catch (error) {
        console.error('Store get error:', error)
        return null
      }
    })

    ipcMain.handle('store:set', (_, key: string, value: any) => {
      try {
        const fs = require('fs')
        const path = require('path')
        const storePath = path.join(app.getPath('userData'), 'store.json')
        
        let data = {}
        if (fs.existsSync(storePath)) {
          data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
        }
        
        data[key] = value
        fs.writeFileSync(storePath, JSON.stringify(data, null, 2))
      } catch (error) {
        console.error('Store set error:', error)
      }
    })

    ipcMain.handle('store:delete', (_, key: string) => {
      try {
        const fs = require('fs')
        const path = require('path')
        const storePath = path.join(app.getPath('userData'), 'store.json')
        
        if (!fs.existsSync(storePath)) {
          return
        }
        
        const data = JSON.parse(fs.readFileSync(storePath, 'utf8'))
        delete data[key]
        fs.writeFileSync(storePath, JSON.stringify(data, null, 2))
      } catch (error) {
        console.error('Store delete error:', error)
      }
    })
  }

  /**
   * Create the main application window
   */
  private async createMainWindow(): Promise<void> {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false, // Don't show until ready
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
      },
    })

    // Load the app
    const isDev = process.env.NODE_ENV === 'development'
    
    if (isDev) {
      // Development: load from Vite dev server
      await this.mainWindow.loadURL('http://localhost:5173')
      
      // Open DevTools in development
      this.mainWindow.webContents.openDevTools()
    } else {
      // Production: load from built files
      await this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })
  }

  /**
   * Set up application event handlers
   */
  private setupAppEvents(): void {
    // macOS: Re-create window when dock icon is clicked
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createMainWindow()
      }
    })

    // Quit when all windows are closed (except on macOS)
    app.on('window-all-closed', async () => {
      if (process.platform !== 'darwin') {
        await this.cleanup()
        app.quit()
      }
    })

    // Cleanup before quitting
    app.on('before-quit', async () => {
      await this.cleanup()
    })
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    console.log('Cleaning up application...')
    await this.ipcCoordinator.cleanup()
    console.log('Application cleanup completed')
  }
}

// Create and initialize the app
const electronApp = new ElectronApp()

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  app.quit()
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

// Initialize the app
electronApp.init().catch((error) => {
  console.error('Failed to initialize app:', error)
  app.quit()
})
