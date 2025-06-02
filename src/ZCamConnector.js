// Removed: import fetch from 'node-fetch';

class ZCamConnector {
  constructor() {
    this.connected = false;
    this.cameraInfo = null;
    this.candidateCameras = [];
  }

  // Scan the local subnet for Z CAM cameras
  async scanForCameras({ subnet = '192.168.1', port = 80, timeout = 1000 } = {}) {
    const foundCameras = [];
    const fetchPromises = [];
    for (let i = 2; i < 255; i++) { // skip .0 (network) and .1 (router)
      const ip = `${subnet}.${i}`;
      const url = `http://${ip}:${port}/ctrl/getdevinfo`;
      // Try to fetch device info with a timeout
      const fetchPromise = fetch(url, { method: 'GET' })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json().catch(() => null);
            // Check if response looks like Z CAM device info
            if (data && data.model && data.sn) {
              foundCameras.push({ ip, info: data });
            }
          }
        })
        .catch(() => {}); // Ignore errors (host not found, timeout, etc.)
      fetchPromises.push(fetchPromise);
    }
    await Promise.all(fetchPromises);
    this.candidateCameras = foundCameras;
    return foundCameras;
  }

  // Fetch device info from /info
  async getDeviceInfo(cameraIP = '10.98.32.1') {
    const url = `http://${cameraIP}/info`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch device info');
    return await res.json();
  }

  // Connect to a specific camera by IP and verify it's a Z CAM
  async connect(cameraIP = '10.98.32.1') {
    try {
      const info = await this.getDeviceInfo(cameraIP);
      if (info && info.model && info.sn) {
        this.connected = true;
        this.cameraInfo = { ip: cameraIP, ...info };
        return true;
      }
    } catch (e) {
      // Connection failed
    }
    this.connected = false;
    this.cameraInfo = null;
    return false;
  }

  disconnect() {
    this.connected = false;
    this.cameraInfo = null;
  }

  isConnected() {
    return this.connected;
  }

  getCameraInfo() {
    return this.cameraInfo;
  }

  getCameraIp() {
    return this.cameraInfo?.ip;
  }

  // Helper to parse HTML directory listing (adapted from App.jsx)
  _parseHTMLDirectoryListing(html) {
    const linkRegex = /<a href="([^"]+)">([^<]+)<\/a>/gi; // Added /i for case-insensitivity
    const items = [];
    let match;
    const fileExtensionRegex = /\.(mov|mp4|jpg|jpeg|png|wav|thm|lrf|nrt|mpk|dat|ini|xml|bin|txt)$/i;

    while ((match = linkRegex.exec(html))) {
      const href = match[1];
      const name = match[2];
      if (name === '../' || href === '../') continue;

      // Determine if it's a folder: by trailing slash in href or if name lacks common extension
      const isFolder = href.endsWith('/') || !fileExtensionRegex.test(name);
      
      items.push({
        name: name, // Use the display name from the link text
        href: href, // Keep the original href from the link
        isFolder: isFolder,
        size: null // HTML usually doesn't provide size easily
      });
    }
    return items;
  }

  async listFiles(cameraPath = '/DCIM/') {
    if (!this.isConnected() || !this.cameraInfo?.ip) {
      throw new Error('ZCamConnector: Not connected to camera');
    }
    if (!window.electronAPI || !window.electronAPI.listCameraFilesIPC) {
      throw new Error('ZCamConnector: electronAPI.listCameraFilesIPC is not available. Ensure preload.cjs is correctly loaded.');
    }

    console.log(`ZCamConnector: Requesting file list from main process for path: ${cameraPath}`);
    try {
      // Use the new IPC call to fetch HTML content from the main process
      const htmlContent = await window.electronAPI.listCameraFilesIPC(this.cameraInfo.ip, cameraPath);
      
      if (typeof htmlContent !== 'string') {
        console.error('ZCamConnector: Did not receive a string from listCameraFilesIPC. Received:', htmlContent);
        throw new Error('ZCamConnector: Invalid response from main process for file list.');
      }

      console.log(`ZCamConnector: Received HTML content of length ${htmlContent.length} for path ${cameraPath}. Parsing...`);
      
      // Try to parse as JSON first (some cameras might respond with JSON for specific endpoints)
      try {
        const data = JSON.parse(htmlContent);
        if (data && Array.isArray(data.files)) {
          const basePath = cameraPath.endsWith('/') ? cameraPath : cameraPath + '/';
          const fileExtensionRegex = /\.(mov|mp4|jpg|jpeg|png|wav|thm|lrf|nrt|mpk|dat|ini|xml|bin|txt)$/i;

          return data.files.map(fileEntry => {
            if (typeof fileEntry === 'string') {
              const isActuallyFolder = fileEntry.endsWith('/') || !fileExtensionRegex.test(fileEntry);
              const cleanName = fileEntry.endsWith('/') ? fileEntry.slice(0, -1) : fileEntry;
              return {
                name: cleanName,
                href: basePath + fileEntry, 
                isFolder: isActuallyFolder,
                size: null 
              };
            } else if (typeof fileEntry === 'object' && fileEntry !== null && fileEntry.name) {
              const isActuallyFolder = fileEntry.name.endsWith('/') || fileEntry.isFolder === true || !fileExtensionRegex.test(fileEntry.name);
              const cleanName = fileEntry.name.endsWith('/') ? fileEntry.name.slice(0, -1) : fileEntry.name;
              return {
                name: cleanName,
                href: basePath + fileEntry.name,
                isFolder: isActuallyFolder,
                size: typeof fileEntry.size === 'number' ? fileEntry.size : null
              };
            }
            return null; 
          }).filter(Boolean); 
        }
      } catch (jsonError) {
        // JSON parsing failed, proceed to HTML parsing as primary method
        // console.log('ZCamConnector: Response not JSON, attempting HTML parse for directory listing.');
      }
      
      // Primary method: Parse HTML directory listing
      const filesFromHTML = this._parseHTMLDirectoryListing(htmlContent);
      if (filesFromHTML.length > 0) {
        // console.log(`ZCamConnector: Successfully parsed ${filesFromHTML.length} items from HTML for ${cameraPath}`);
        return filesFromHTML;
      }
      
      // Fallback: if HTML parsing yields nothing, check if it's plain text (unlikely for Z CAM)
      console.warn(`ZCamConnector: HTML parsing of content from ${this.cameraInfo.ip}${cameraPath} yielded no files. Content might be unexpected or empty.`);
      const lines = htmlContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length > 0 && lines.every(line => !line.includes('<') && !line.includes('{'))) {
        console.log('ZCamConnector: Assuming plain text list of files as a last resort.');
        const basePath = cameraPath.endsWith('/') ? cameraPath : cameraPath + '/';
        const fileExtensionRegex = /\.(mov|mp4|jpg|jpeg|png|wav|thm|lrf|nrt|mpk|dat|ini|xml|bin|txt)$/i;
        return lines.map(name => ({
          name: name.endsWith('/') ? name.slice(0,-1) : name,
          href: basePath + name, 
          isFolder: name.endsWith('/') || !fileExtensionRegex.test(name),
          size: null
        }));
      }

      // If all parsing attempts fail
      console.error(`ZCamConnector: All parsing attempts failed for content from ${this.cameraInfo.ip}${cameraPath}.`);
      throw new Error('ZCamConnector: Unexpected camera response format for file list after IPC call.');

    } catch (error) {
      console.error(`ZCamConnector: Error in listFiles (IPC) for path ${cameraPath}:`, error);
      throw error; // Re-throw the error to be handled by the caller (AutoIngestService)
    }
  }

  getCandidateCameras() {
    return this.candidateCameras;
  }
}

export default ZCamConnector; 