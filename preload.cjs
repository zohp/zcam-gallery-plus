console.log('preload.cjs loaded successfully');
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const https = require('https');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Download a file from a URL and save to destPath, with progress callback.
   * @param {string} url - Source URL
   * @param {string} destPath - Local destination path
   * @param {function} progressCallback - (received, total) => void
   */
  downloadFile: (url, destPath, progressCallback) => {
    return new Promise((resolve, reject) => {
      const proto = url.startsWith('https') ? https : http;
      proto.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('Failed to download file'));
          return;
        }
        const total = Number(res.headers['content-length']) || 0;
        let received = 0;
        fs.ensureDirSync(path.dirname(destPath));
        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          received += chunk.length;
          if (progressCallback) progressCallback(received, total);
        });
        res.pipe(fileStream);
        res.on('end', () => resolve());
        res.on('error', reject);
        fileStream.on('error', reject);
      }).on('error', reject);
    });
  },
  
  /**
   * Shows a native open file dialog.
   * @param {object} options - Options for dialog.showOpenDialog
   * @returns {Promise<object>} - Result from dialog.showOpenDialog
   */
  showOpenDialog: async (options) => {
    console.log('preload.cjs: showOpenDialog (v2) called with options:', options);
    try {
      const result = await ipcRenderer.invoke('show-open-dialog-v2', options);
      console.log('preload.cjs: showOpenDialog (v2) result:', result);
      return result;
    } catch (error) {
      console.error('preload.cjs: showOpenDialog (v2) error:', error);
      return { canceled: true, filePaths: [], error: error.message };
    }
  },

  /**
   * Shows a native save file dialog (placeholder - needs main process implementation if required elsewhere).
   * For choosing ingest path, showOpenDialog with 'openDirectory' is used.
   */
  showSaveDialog: async (defaultName) => {
    return await ipcRenderer.invoke('show-save-dialog', { defaultPath: defaultName });
  },

  // Expose fs.readdirSync to list files in a directory
  readDirSync: (dirPath) => {
    try {
      if (fs.existsSync(dirPath)) {
        return fs.readdirSync(dirPath);
      }
      return []; // Return empty if path doesn't exist
    } catch (error) {
      console.error('Error reading directory:', dirPath, error);
      return []; // Return empty on error
    }
  },

  getFileMetadata: async (filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        ctime: stats.ctime.toISOString(),
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (err) {
      console.error(`preload.cjs: getFileMetadata error for ${filePath}:`, err);
      throw err; 
    }
  },

  pathExists: async (filePath) => {
    try {
      return await fs.pathExists(filePath);
    } catch (err) {
      console.error(`preload.cjs: pathExists error for ${filePath}:`, err);
      return false;
    }
  },

  ensureDirExists: async (dirPath) => {
    try {
      await fs.ensureDir(dirPath);
    } catch (err) {
      console.error(`preload.cjs: ensureDirExists error for ${dirPath}:`, err);
      throw err;
    }
  },

  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),

  listCameraFilesIPC: async (cameraIp, pathToList) => {
    console.log(`preload.cjs: Invoking list-camera-files for IP: ${cameraIp}, Path: ${pathToList}`);
    try {
      const htmlContent = await ipcRenderer.invoke('list-camera-files', { cameraIp, pathToList });
      console.log(`preload.cjs: Received HTML content from main. Length: ${htmlContent?.length}`);
      return htmlContent;
    } catch (error) {
      console.error(`preload.cjs: Error invoking list-camera-files for ${pathToList}:`, error);
      throw error; // Re-throw to be caught by ZCamConnector
    }
  },

  readFileAsDataURL: async (filePath) => {
    try {
      if (await fs.pathExists(filePath)) {
        const buffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'image/jpeg'; // default
        
        // Determine MIME type based on file extension
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.bmp') mimeType = 'image/bmp';
        
        const base64 = buffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
      }
      return null;
    } catch (err) {
      console.error(`preload.cjs: readFileAsDataURL error for ${filePath}:`, err);
      return null;
    }
  },

  // Start watching the ingest folder (calls main process)
  startIngestFolderWatcher: (folderPath) => ipcRenderer.invoke('start-ingest-folder-watcher', folderPath),

  // Listen for ingest folder changes from main process
  onIngestFolderChanged: (callback) => {
    ipcRenderer.on('ingest-folder-changed', (event, data) => callback(data));
  },
}); 