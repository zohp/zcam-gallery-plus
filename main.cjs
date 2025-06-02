const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const http = require('http'); // Or https, if your camera uses it
const chokidar = require('chokidar');

const isDev = !app.isPackaged;

// Map to keep track of folder watchers (keyed by folder path)
const ingestFolderWatchers = new Map();

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
    },
  });

  // Set Content Security Policy to fix Electron security warning
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' data: http://10.98.32.1:* http://localhost:*; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: http://10.98.32.1:* http://localhost:*; " +
          "media-src 'self' data: http://10.98.32.1:* http://localhost:*; " +
          "connect-src 'self' http://10.98.32.1:* http://localhost:*;"
        ]
      }
    });
  });

  if (isDev) {
    win.loadURL('http://localhost:5173'); // Vite dev server
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
  return win;
}

app.whenReady().then(() => {
  console.log('main.cjs: App is ready.');
  const mainWindow = createWindow();

  ipcMain.handle('show-open-dialog-v2', async (event, options) => {
    console.log('main.cjs: IPC HANDLER (V2) REACHED! show-open-dialog-v2 called with options:', options);
    
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) {
      console.log('main.cjs: No focused window (v2) found');
      return { canceled: true, filePaths: [] };
    }
    
    const dialogOptions = {
      title: options?.title || 'Select Folder (v2)',
      properties: ['openDirectory', 'createDirectory', 'openFile'],
      defaultPath: options?.defaultPath || app.getPath('documents'),
    };
        
    console.log('main.cjs: Using dialog (v2) options:', dialogOptions);

    try {
      const result = await dialog.showOpenDialog(focusedWindow, dialogOptions);
      console.log('main.cjs: Dialog (v2) result:', result);
      return result;
    } catch (error) {
      console.error('main.cjs: Dialog (v2) error:', error);
      return { canceled: true, filePaths: [], error: error.message };
    }
  });

  ipcMain.handle('show-save-dialog', async (event, options) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) {
      return { canceled: true, filePath: '' };
    }
    const result = await dialog.showSaveDialog(focusedWindow, {
      title: 'Save File As',
      defaultPath: options?.defaultPath || app.getPath('documents'),
      filters: options?.filters || [],
    });
    return result;
  });

  // Handle request for app data path
  ipcMain.handle('get-app-data-path', () => {
    return app.getPath('userData');
  });

  // New IPC handler for listing camera files
  ipcMain.handle('list-camera-files', async (event, { cameraIp, pathToList }) => {
    console.log(`main.cjs: Received list-camera-files request for IP: ${cameraIp}, Path: ${pathToList}`);
    const url = `http://${cameraIp}${pathToList}`;
    try {
      // Dynamic import of node-fetch
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`main.cjs: Error fetching ${url} - Status: ${response.status}`);
        // Try to get error text, but be careful as it might not be text
        let errorText = 'Unknown error';
        try {
            errorText = await response.text();
        } catch (e) { /* ignore if can't get text */ }
        throw new Error(`Failed to list files from camera: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }
      const htmlContent = await response.text();
      console.log(`main.cjs: Successfully fetched content from ${url}. Length: ${htmlContent.length}`);
      return htmlContent; // Send raw HTML back to renderer for parsing
    } catch (error) {
      console.error(`main.cjs: Critical error in list-camera-files for ${url}:`, error);
      throw error; // Re-throw to be caught by invoking preload function
    }
  });

  // IPC handler to start watching an ingest folder
  ipcMain.handle('start-ingest-folder-watcher', (event, folderPath) => {
    if (!folderPath) return;
    // If already watching, close the old watcher
    if (ingestFolderWatchers.has(folderPath)) {
      ingestFolderWatchers.get(folderPath).close();
      ingestFolderWatchers.delete(folderPath);
    }
    const watcher = chokidar.watch(folderPath, { ignoreInitial: true });
    watcher.on('all', (eventType, changedPath) => {
      // Notify all renderer windows
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('ingest-folder-changed', { event: eventType, path: changedPath });
      });
    });
    ingestFolderWatchers.set(folderPath, watcher);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
}); 