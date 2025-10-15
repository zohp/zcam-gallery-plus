import { ipcMain, dialog } from 'electron'
import type { DialogOptions } from '@/shared/types'

/**
 * Dialog handlers for Electron IPC
 * Provides secure system dialog access to renderer process
 */
export class DialogHandlers {
  /**
   * Register all dialog-related IPC handlers
   */
  registerHandlers(): void {
    ipcMain.handle('dialog:showOpenDialog', this.handleShowOpenDialog.bind(this))
    ipcMain.handle('dialog:showSaveDialog', this.handleShowSaveDialog.bind(this))
    ipcMain.handle('dialog:showErrorBox', this.handleShowErrorBox.bind(this))
    ipcMain.handle('dialog:showMessageBox', this.handleShowMessageBox.bind(this))
  }

  /**
   * Show open dialog (folder/file picker)
   */
  private async handleShowOpenDialog(
    _event: Electron.IpcMainInvokeEvent,
    options: DialogOptions = {}
  ): Promise<string | null> {
    try {
      const result = await dialog.showOpenDialog({
        title: options.title || 'Select Folder',
        defaultPath: options.defaultPath || undefined,
        buttonLabel: options.buttonLabel || 'Select',
        properties: ['openDirectory', 'createDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    } catch (error) {
      console.error('Open dialog failed:', error)
      throw error
    }
  }

  /**
   * Show save dialog
   */
  private async handleShowSaveDialog(
    _event: Electron.IpcMainInvokeEvent,
    options: {
      title?: string
      defaultPath?: string
      buttonLabel?: string
      filters?: Electron.FileFilter[]
    } = {}
  ): Promise<string | null> {
    try {
      const result = await dialog.showSaveDialog({
        title: options.title || 'Save File',
        defaultPath: options.defaultPath || undefined,
        buttonLabel: options.buttonLabel || 'Save',
        filters: options.filters || [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Videos', extensions: ['mov', 'mp4', 'avi', 'mkv'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
          { name: 'Audio', extensions: ['wav', 'mp3', 'aac', 'flac'] },
        ],
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      return result.filePath
    } catch (error) {
      console.error('Save dialog failed:', error)
      throw error
    }
  }

  /**
   * Show error dialog
   */
  private async handleShowErrorBox(
    _event: Electron.IpcMainInvokeEvent,
    title: string,
    content: string
  ): Promise<void> {
    try {
      await dialog.showErrorBox(title, content)
    } catch (error) {
      console.error('Error dialog failed:', error)
      throw error
    }
  }

  /**
   * Show message box
   */
  private async handleShowMessageBox(
    _event: Electron.IpcMainInvokeEvent,
    options: {
      type?: 'info' | 'warning' | 'error' | 'question'
      title?: string
      message: string
      detail?: string
      buttons?: string[]
      defaultId?: number
      cancelId?: number
    }
  ): Promise<number> {
    try {
      const result = await dialog.showMessageBox({
        type: options.type || 'info',
        title: options.title || 'Message',
        message: options.message,
        detail: options.detail,
        buttons: options.buttons || ['OK'],
        defaultId: options.defaultId || 0,
        cancelId: options.cancelId,
      })

      return result.response
    } catch (error) {
      console.error('Message box failed:', error)
      throw error
    }
  }
}
