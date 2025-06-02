class AutoIngestService {
  constructor(zCamConnector, fileDownloader, config, onNewFileIngested, onProgress, onThumbnailReady) {
    this.connector = zCamConnector; // Instance of ZCamConnector
    this.fileDownloader = fileDownloader; // Function like window.electronAPI.downloadFile
    this.config = {
      pollingIntervalMs: 10000, // Default changed to 10 seconds
      localIngestPath: '/tmp/zcam_ingest', // Default local path to save files
      cameraPathToMonitor: '/DCIM/', // Path on camera to monitor
      localThumbnailPath: '/tmp/zcam_thumbnails', // Default local path for thumbnails
      ...config, // User-provided overrides
    };
    this.onNewFileIngested = onNewFileIngested; // Callback: (ingestedFile) => void
    this.onProgress = onProgress; // Callback: (fileName, progressPercent) => void
    this.onThumbnailReady = onThumbnailReady; // Callback: (itemName, localThumbPath) => void
    this.readDirSync = config.readDirSync; // Function to read directory contents

    this.ingestedFiles = new Set(); // Tracks filenames (e.g., 'A001C001.MOV') that have been processed
    this.activeTransfers = new Map(); // Tracks ongoing downloads: fileName -> { progress, controller }

    console.log('AutoIngestService initialized with config:', this.config);

    // Register for ingest folder change notifications from main process (via preload)
    if (window.electronAPI && window.electronAPI.onIngestFolderChanged) {
      window.electronAPI.onIngestFolderChanged(() => {
        this.syncWithLocalFolder();
      });
    }

    this._syncDebounceTimeout = null;
  }

  // Method to check if a file is known (either ingested or actively transferring)
  isFileKnown(fileName) {
    return this.ingestedFiles.has(fileName) || this.activeTransfers.has(fileName);
  }

  _getLocalThumbnailPath(itemName) {
    if (!this.config.localThumbnailPath || !itemName) return null;
    // Ensure consistent file extension for thumbnails, e.g., .jpg
    // Remove existing extension from itemName if any, then add .jpg
    const nameWithoutExt = itemName.split('.').slice(0, -1).join('.');
    const thumbnailFilename = `${nameWithoutExt || itemName}.thm.jpg`; 
    return `${this.config.localThumbnailPath}/${thumbnailFilename}`.replace(/\/\//g, '/');
  }

  // Method to ensure a thumbnail is cached locally
  async ensureLocalThumbnail(itemName, cameraFileUrlPath) {
    if (!this.connector.isConnected()) {
      console.warn(`AutoIngestService: ensureLocalThumbnail for ${itemName} - Not connected.`);
      return null;
    }
    if (!this.config.localThumbnailPath) {
      console.warn(`AutoIngestService: ensureLocalThumbnail for ${itemName} - localThumbnailPath not configured.`);
      return null;
    }

    const localThumbPath = this._getLocalThumbnailPath(itemName);
    if (!localThumbPath) {
      console.error(`AutoIngestService: Could not determine local thumbnail path for ${itemName}`);
      return null;
    }
    // console.log(`AutoIngestService: ensureLocalThumbnail for ${itemName} - Target local path: ${localThumbPath}`);

    try {
      if (window.electronAPI?.ensureDirExists) {
        await window.electronAPI.ensureDirExists(this.config.localThumbnailPath);
        // console.log(`AutoIngestService: Thumbnail directory ${this.config.localThumbnailPath} ensured.`);
      } else {
        console.warn('AutoIngestService: window.electronAPI.ensureDirExists not available.');
      }

      if (window.electronAPI?.pathExists && await window.electronAPI.pathExists(localThumbPath)) {
        // console.log(`AutoIngestService: Thumbnail for ${itemName} FOUND locally: ${localThumbPath}`);
        // If it exists, still call onThumbnailReady so App.jsx knows about it if it missed it before.
        if (this.onThumbnailReady) {
          this.onThumbnailReady(itemName, localThumbPath);
        }
        return localThumbPath;
      }

      const cameraIp = this.connector.getCameraIp();
      const thumbUrl = `http://${cameraIp}${cameraFileUrlPath}?act=thm`;
      console.log(`AutoIngestService: DOWNLOADING thumbnail for ${itemName} from ${thumbUrl} to ${localThumbPath}`);
      
      const thumbAbortController = new AbortController();
      await this.fileDownloader(thumbUrl, localThumbPath, () => {}, thumbAbortController.signal);
      
      // After download, verify it actually exists before calling callback
      if (window.electronAPI?.pathExists && await window.electronAPI.pathExists(localThumbPath)) {
        console.log(`AutoIngestService: Thumbnail for ${itemName} DOWNLOADED successfully to ${localThumbPath}`);
        if (this.onThumbnailReady) {
          this.onThumbnailReady(itemName, localThumbPath);
        }
        return localThumbPath;
      } else {
        console.error(`AutoIngestService: Thumbnail for ${itemName} download ATTEMPTED but file NOT FOUND at ${localThumbPath}`);
        return null;
      }

    } catch (error) {
      console.error(`AutoIngestService: Error in ensureLocalThumbnail for ${itemName} (${thumbUrl}):`, error);
      return null;
    }
  }

  async start() {
    if (!this.connector.isConnected()) {
      console.warn('AutoIngestService: Cannot start, Z CAM not connected.');
      return;
    }
    this.syncWithLocalFolder(); // Optionally sync once on start
    await this.checkForNewFiles(); // Only poll the camera
    // No setInterval for local folder
  }

  stop() {
    // No pollingIntervalId to clear
    if (this.activeTransfers.size > 0) {
      console.log(`AutoIngestService: Cancelling ${this.activeTransfers.size} active download(s).`);
      this.activeTransfers.forEach((transfer, fileName) => {
        if (transfer.controller) {
          console.log(`AutoIngestService: Aborting download for ${fileName}`);
          transfer.controller.abort();
        }
      });
      this.activeTransfers.clear();
    } else {
      console.log('AutoIngestService: No active transfers to cancel.');
    }
    console.log('AutoIngestService: Polling stopped and active transfers aborted (if any).');
  }

  // Placeholder for listCameraFiles, should be adapted from App.jsx or connector
  async _listCameraFilesRecursive(cameraPath) {
    // This needs to be implemented properly, likely by adapting
    // the listCameraFiles from fileSystem.js or ZCamConnector to list recursively
    // and identify file types. For now, a placeholder.
    console.warn('_listCameraFilesRecursive needs a proper implementation based on ZCamConnector/fileSystem.js');
    // Example: const files = await this.connector.listFiles(cameraPath, true); // true for recursive
    return []; // Placeholder
  }

  // Debounced syncWithLocalFolder
  syncWithLocalFolder() {
    if (this._syncDebounceTimeout) {
      clearTimeout(this._syncDebounceTimeout);
    }
    this._syncDebounceTimeout = setTimeout(() => {
      this._syncDebounceTimeout = null;
      this._syncWithLocalFolderImmediate();
    }, 200);
  }

  // The original sync logic, renamed
  _syncWithLocalFolderImmediate() {
    if (!this.readDirSync || !this.config.localIngestPath) {
      console.warn('AutoIngestService: readDirSync or localIngestPath not configured. Cannot sync.');
      return;
    }
    console.log(`AutoIngestService: Starting syncWithLocalFolder for path: ${this.config.localIngestPath}`);
    try {
      const localPhysicalFilesArray = this.readDirSync(this.config.localIngestPath);
      const localPhysicalFilesSet = new Set(
        localPhysicalFilesArray.filter(f => /\.(mov|mp4|jpg|jpeg|png|wav)$/i.test(f))
      );
      
      let newlySyncedCount = 0;
      let removedFromIngestedCount = 0;
      let alreadyKnownAndPresentCount = 0;

      // 1. Sync files present locally but not in our ingestedFiles set yet
      localPhysicalFilesSet.forEach(fileName => {
        if (!this.ingestedFiles.has(fileName)) {
          this.ingestedFiles.add(fileName);
          newlySyncedCount++;
          console.log(`AutoIngestService: SYNC - Added '${fileName}' to ingestedFiles set (found locally).`);
          if (this.onNewFileIngested) {
            this.onNewFileIngested({
              name: fileName,
              localPath: `${this.config.localIngestPath}/${fileName}`.replace(/\/\//g, '/'),
              cameraUrlPath: null,
              isLocallySynced: true, 
              isMissingLocally: false
            });
          }
        } else {
          // File is in local folder AND already in ingestedFiles set - this is good.
          alreadyKnownAndPresentCount++;
        }
      });

      // 2. Sync files in our ingestedFiles set but no longer present locally
      const previouslyIngested = new Set(this.ingestedFiles); 
      previouslyIngested.forEach(fileName => {
        if (!localPhysicalFilesSet.has(fileName)) {
          this.ingestedFiles.delete(fileName);
          removedFromIngestedCount++;
          console.log(`AutoIngestService: SYNC - Removed '${fileName}' from ingestedFiles set (missing locally).`);
          if (this.onNewFileIngested) {
            this.onNewFileIngested({
              name: fileName,
              localPath: null, 
              cameraUrlPath: null, 
              isLocallySynced: false, 
              isMissingLocally: true 
            });
          }
        }
      });

      console.log(`AutoIngestService: Finished syncWithLocalFolder. Newly Synced (found local): ${newlySyncedCount}, Already Known & Present: ${alreadyKnownAndPresentCount}, Removed (missing locally): ${removedFromIngestedCount}. Total in ingestedFiles set now: ${this.ingestedFiles.size}`);

    } catch (error) {
      console.error('AutoIngestService: Error during syncWithLocalFolder:', error);
    }
  }

  // Recursive helper to list all files from camera, including subfolders
  async listAllCameraFiles(currentRelativePath = '') {
    // Construct the full path to list on the camera. currentRelativePath is relative to cameraPathToMonitor
    const pathToListOnCamera = `${this.config.cameraPathToMonitor}${currentRelativePath}`.replace(/\/\/?$/, ''); 
    let items;
    try {
      console.log(`AutoIngestService: Attempting to list camera path: ${pathToListOnCamera}`);
      // htmlContent will be the raw HTML string from the camera
      const htmlContent = await this.connector.listFiles(pathToListOnCamera); 
      
      // ZCamConnector's listFiles now handles the IPC and returns a parsed array of items or throws an error.
      // So, htmlContent here should actually be the parsed items array from ZCamConnector.
      // Let's rename htmlContent to parsedItemsFromConnector for clarity.
      const parsedItemsFromConnector = htmlContent; 

      if (!Array.isArray(parsedItemsFromConnector)) {
        console.warn(`AutoIngestService: listFiles (via Connector) did not return an array for path: ${pathToListOnCamera}, received:`, parsedItemsFromConnector);
        items = []; // Treat as empty if not an array
      } else {
        items = parsedItemsFromConnector;
      }
      console.log(`AutoIngestService: Successfully listed/parsed ${items.length} items from camera path: ${pathToListOnCamera}`);

    } catch (error) {
      console.error(`AutoIngestService: Error listing files from camera at ${pathToListOnCamera}:`, error.message);
      // If the root DCIM path itself fails (e.g. 404), probe only the known valid subfolders.
      if (currentRelativePath === '' && this.config.cameraPathToMonitor === '/DCIM/') {
        console.log('AutoIngestService: Root /DCIM/ listing failed. Probing only known subfolders: A001, A002, A003, B001, B002, B003, C001.');
        const knownSubfolders = [
          'A001', 'A002', 'A003',
          'B001', 'B002', 'B003',
          'C001' // Add more if needed
        ];
        let discoveredFiles = [];
        for (const subfolder of knownSubfolders) {
          const presumedRelativePath = `${subfolder}/`;
          try {
            console.log(`AutoIngestService: Probing known subfolder: ${presumedRelativePath}`);
            const subfolderItems = await this.listAllCameraFiles(presumedRelativePath);
            discoveredFiles.push(...subfolderItems);
          } catch (subfolderError) {
            // It's okay if a presumed subfolder doesn't exist or fails to list, just try the next.
          }
        }
        if (discoveredFiles.length > 0) {
          console.log(`AutoIngestService: Found ${discoveredFiles.length} files/folders through known subfolder probing.`);
          return discoveredFiles; // Return files found by probing
        }
      }
      return []; // General error or no files found after probing
    }

    const files = [];
    for (const item of items) {
      if (item && typeof item.name === 'string') {
        if (item.isFolder) {
          let folderName = item.name; // This should be just the folder name, e.g., "A001" or "A001/"
          if (!folderName.endsWith('/')) {
            folderName += '/';
          }
          // The next relative path for recursion is the current relative path + this folder's name
          const nextRelativePath = `${currentRelativePath}${folderName}`;
          files.push(...await this.listAllCameraFiles(nextRelativePath));
        } else {
          // item.name is the filename. currentRelativePath is its directory relative to cameraPathToMonitor.
          const filePathOnCamera = `${this.config.cameraPathToMonitor}${currentRelativePath}${item.name}`.replace(/\/\+/g, '/');
          files.push({ name: item.name, path: filePathOnCamera });
        }
      } else {
        console.warn(`AutoIngestService: Encountered invalid item structure:`, item, `at path: ${pathToListOnCamera}`);
      }
    }
    return files;
  }

  async checkForNewFiles() {
    if (!this.connector.isConnected()) {
      console.log('AutoIngest: Camera not connected, skipping check.');
      return;
    }
    console.log(`AutoIngest: Checking camera for new files in/below ${this.config.cameraPathToMonitor}...`);

    try {
      // The initial call to listAllCameraFiles should start with an empty relative path
      const allCameraFiles = await this.listAllCameraFiles(''); 
      
      if (allCameraFiles.length === 0) {
        // This log is fine, could be an empty DCIM or specific subfolder
        console.log('AutoIngest: No files or folders found in camera path or path is empty.');
      }

      let newFilesFoundThisCheck = 0;
      for (const cameraFile of allCameraFiles) {
        const fileName = cameraFile.name;
        const cameraFileUrlPath = cameraFile.path; 

        // Basic safety check for fileName and cameraFileUrlPath
        if (typeof fileName !== 'string' || typeof cameraFileUrlPath !== 'string') {
          console.warn('AutoIngest: Invalid camera file data encountered:', cameraFile);
          continue;
        }
        
        // Skip common non-media folders if cameraPathToMonitor is broad like /DCIM/
        if (this.config.cameraPathToMonitor === '/DCIM/' && 
            (fileName.toUpperCase() === 'PROXY' || cameraFileUrlPath.toUpperCase().includes('/PROXY/'))) {
          continue;
        }

        if (/\.(mov|mp4|jpg|jpeg|png|wav)$/i.test(fileName) && // Ensure it's a media file
            !this.ingestedFiles.has(fileName) && 
            !this.activeTransfers.has(fileName)) {
          console.log(`AutoIngest: New file detected - ${fileName} at ${cameraFileUrlPath}. Initiating ingest.`);
          this.requestIngest(fileName, cameraFileUrlPath); // Use requestIngest
          newFilesFoundThisCheck++;
        }
      }

      if (newFilesFoundThisCheck > 0) {
        console.log(`AutoIngest: Initiated ingest for ${newFilesFoundThisCheck} new files in this check.`);
      } else {
        // console.log('AutoIngest: No new files to initiate ingest for in this check.');
      }
    } catch (error) {
      console.error('AutoIngest: Error checking for new files:', error);
    }
  }

  async ingestFile(fileName, cameraFileUrlPath) {
    if (this.activeTransfers.has(fileName)) {
       console.warn(`AutoIngest: ingestFile called for ${fileName}, but it's already in activeTransfers. Skipping duplicate call.`);
       return; 
    }
    
    const abortController = new AbortController();
    this.activeTransfers.set(fileName, { progress: 0, controller: abortController });
    console.log(`AutoIngest: Preparing to ingest ${fileName} from ${cameraFileUrlPath}`);
    console.log(`AutoIngest: Using localIngestPath for this download: ${this.config.localIngestPath}`);
    const downloadUrl = `http://${this.connector.getCameraIp()}${cameraFileUrlPath}`;
    const localFilePath = `${this.config.localIngestPath}/${fileName}`;
    console.log(`AutoIngest: Download URL: ${downloadUrl}`);
    console.log(`AutoIngest: Local File Path: ${localFilePath}`);

    try {
      console.log(`AutoIngest: Starting actual download for ${fileName}`);
      await this.fileDownloader(
        downloadUrl, 
        localFilePath, 
        (received, total) => {
          const progress = total ? Math.round((received / total) * 100) : 0;
          const currentTransfer = this.activeTransfers.get(fileName);
          if (currentTransfer) {
              this.activeTransfers.set(fileName, { ...currentTransfer, progress });
          }
          if (this.onProgress) {
            this.onProgress(fileName, progress);
          }
        },
        abortController.signal
      );

      console.log(`AutoIngest: Successfully ingested ${fileName} to ${localFilePath}`);
      this.ingestedFiles.add(fileName);
      if (this.onNewFileIngested) {
        this.onNewFileIngested({
          name: fileName,
          localPath: localFilePath,
          cameraUrlPath: cameraFileUrlPath,
          isLocallySynced: false, 
          isMissingLocally: false 
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`AutoIngest: Download for ${fileName} was aborted.`);
      } else {
        console.error(`AutoIngest: Error ingesting file ${fileName}:`, error);
      }
    } finally {
      this.activeTransfers.delete(fileName);
      console.log(`AutoIngest: Finished ingest attempt for ${fileName} (success, failure, or abort).`);
    }
  }

  requestIngest(fileName, cameraFileUrlPath) {
    console.log(`AutoIngestService: Received direct request to ingest ${fileName}`);
    if (this.ingestedFiles.has(fileName)) {
      console.log(`AutoIngestService: File ${fileName} is already marked as ingested. Ignoring request.`);
      return;
    }
    if (this.activeTransfers.has(fileName)) {
      console.log(`AutoIngestService: File ${fileName} is already in activeTransfers. Ignoring request.`);
      return;
    }
    if (!this.connector.isConnected()) { 
      console.warn(`AutoIngestService: Cannot process direct ingest request for ${fileName}, not connected or not ready.`);
      return;
    }

    console.log(`AutoIngestService: Proceeding with direct ingest for ${fileName} from ${cameraFileUrlPath}`);
    this.ingestFile(fileName, cameraFileUrlPath);
  }

  // Optionally, add a method to request the main process to start watching a new folder
  requestIngestFolderWatch(newPath) {
    if (window.electronAPI && window.electronAPI.startIngestFolderWatcher) {
      window.electronAPI.startIngestFolderWatcher(newPath);
    }
  }
}

export default AutoIngestService; 