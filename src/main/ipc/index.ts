import { FileHandlers } from './handlers/fileHandlers'
import { DialogHandlers } from './handlers/dialogHandlers'
import { CameraHandlers } from './handlers/cameraHandlers'
import { WatcherHandlers } from './handlers/watcherHandlers'

/**
 * IPC Coordinator - Registers all IPC handlers
 * Provides centralized management of Electron IPC communication
 */
export class IPCCoordinator {
  private fileHandlers: FileHandlers
  private dialogHandlers: DialogHandlers
  private cameraHandlers: CameraHandlers
  private watcherHandlers: WatcherHandlers

  constructor() {
    this.fileHandlers = new FileHandlers()
    this.dialogHandlers = new DialogHandlers()
    this.cameraHandlers = new CameraHandlers()
    this.watcherHandlers = new WatcherHandlers()
  }

  /**
   * Register all IPC handlers
   */
  registerAllHandlers(): void {
    console.log('Registering IPC handlers...')
    
    this.fileHandlers.registerHandlers()
    this.dialogHandlers.registerHandlers()
    this.cameraHandlers.registerHandlers()
    this.watcherHandlers.registerHandlers()
    
    console.log('All IPC handlers registered successfully')
  }

  /**
   * Cleanup all handlers and watchers
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up IPC handlers...')
    
    try {
      await this.watcherHandlers.cleanup()
      console.log('IPC cleanup completed successfully')
    } catch (error) {
      console.error('IPC cleanup failed:', error)
    }
  }

  /**
   * Get handler instances for testing
   */
  getHandlers() {
    return {
      fileHandlers: this.fileHandlers,
      dialogHandlers: this.dialogHandlers,
      cameraHandlers: this.cameraHandlers,
      watcherHandlers: this.watcherHandlers,
    }
  }
}
