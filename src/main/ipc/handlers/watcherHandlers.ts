import { ipcMain } from 'electron'
import chokidar from 'chokidar'
import type { WatchEvent } from '@/shared/types'

/**
 * File watcher handlers for Electron IPC
 * Provides folder watching functionality for auto-ingest
 */
export class WatcherHandlers {
  private watchers = new Map<string, chokidar.FSWatcher>()
  private readonly maxWatchers = 10

  /**
   * Register all watcher-related IPC handlers
   */
  registerHandlers(): void {
    ipcMain.handle('watcher:start', this.handleStartWatcher.bind(this))
    ipcMain.handle('watcher:stop', this.handleStopWatcher.bind(this))
    ipcMain.handle('watcher:stopAll', this.handleStopAllWatchers.bind(this))
    ipcMain.handle('watcher:list', this.handleListWatchers.bind(this))
  }

  /**
   * Start watching a folder
   */
  private async handleStartWatcher(
    event: Electron.IpcMainInvokeEvent,
    folderPath: string,
    options: {
      recursive?: boolean
      ignoreInitial?: boolean
      ignored?: string[]
    } = {}
  ): Promise<boolean> {
    try {
      // Check watcher limit
      if (this.watchers.size >= this.maxWatchers) {
        throw new Error(`Maximum number of watchers (${this.maxWatchers}) reached`)
      }

      // Check if already watching this path
      if (this.watchers.has(folderPath)) {
        return true // Already watching
      }

      const watcher = chokidar.watch(folderPath, {
        ignored: options.ignored || [
          /(^|[\/\\])\../, // ignore dotfiles
          '**/node_modules/**',
          '**/.DS_Store',
          '**/Thumbs.db',
        ],
        persistent: true,
        ignoreInitial: options.ignoreInitial !== false,
        depth: options.recursive ? undefined : 0,
      })

      // Set up event handlers
      watcher.on('add', (filePath) => {
        this.sendWatchEvent(event, 'add', filePath)
      })

      watcher.on('change', (filePath) => {
        this.sendWatchEvent(event, 'change', filePath)
      })

      watcher.on('unlink', (filePath) => {
        this.sendWatchEvent(event, 'unlink', filePath)
      })

      watcher.on('error', (error) => {
        console.error(`Watcher error for ${folderPath}:`, error)
        this.sendWatchEvent(event, 'error', folderPath, error.message)
      })

      // Store the watcher
      this.watchers.set(folderPath, watcher)

      console.log(`Started watching: ${folderPath}`)
      return true
    } catch (error) {
      console.error('Start watcher failed:', error)
      throw error
    }
  }

  /**
   * Stop watching a specific folder
   */
  private async handleStopWatcher(
    _event: Electron.IpcMainInvokeEvent,
    folderPath: string
  ): Promise<boolean> {
    try {
      const watcher = this.watchers.get(folderPath)
      if (!watcher) {
        return false // Not watching this path
      }

      await watcher.close()
      this.watchers.delete(folderPath)

      console.log(`Stopped watching: ${folderPath}`)
      return true
    } catch (error) {
      console.error('Stop watcher failed:', error)
      throw error
    }
  }

  /**
   * Stop all watchers
   */
  private async handleStopAllWatchers(
    _event: Electron.IpcMainInvokeEvent
  ): Promise<number> {
    try {
      const watcherPaths = Array.from(this.watchers.keys())
      let stoppedCount = 0

      for (const path of watcherPaths) {
        const watcher = this.watchers.get(path)
        if (watcher) {
          await watcher.close()
          stoppedCount++
        }
      }

      this.watchers.clear()
      console.log(`Stopped ${stoppedCount} watchers`)
      return stoppedCount
    } catch (error) {
      console.error('Stop all watchers failed:', error)
      throw error
    }
  }

  /**
   * List all active watchers
   */
  private async handleListWatchers(
    _event: Electron.IpcMainInvokeEvent
  ): Promise<string[]> {
    try {
      return Array.from(this.watchers.keys())
    } catch (error) {
      console.error('List watchers failed:', error)
      throw error
    }
  }

  /**
   * Send watch event to renderer process
   */
  private sendWatchEvent(
    event: Electron.IpcMainInvokeEvent,
    eventType: 'add' | 'change' | 'unlink' | 'error',
    path: string,
    error?: string
  ): void {
    const watchEvent: WatchEvent & { error?: string } = {
      eventType,
      path,
    }

    if (error) {
      watchEvent.error = error
    }

    // Send to the specific renderer process that requested the watcher
    event.sender.send('watcher:event', watchEvent)
  }

  /**
   * Cleanup all watchers (called on app quit)
   */
  async cleanup(): Promise<void> {
    try {
      await this.handleStopAllWatchers({} as Electron.IpcMainInvokeEvent)
    } catch (error) {
      console.error('Watcher cleanup failed:', error)
    }
  }
}
