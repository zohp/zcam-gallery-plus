// File system operations must be done via Electron's preload API

export async function downloadFile(url, destPath, progressCallback) {
  if (!window.electronAPI?.downloadFile) throw new Error('File system API not available');
  return window.electronAPI.downloadFile(url, destPath, progressCallback);
}

// Add more wrappers as needed, e.g. for showSaveDialog
export async function showSaveDialog(defaultName) {
  if (!window.electronAPI?.showSaveDialog) return null;
  return window.electronAPI.showSaveDialog(defaultName);
}

/**
 * List files/folders on the camera at a given path.
 * Returns an array of file/folder names.
 */
export async function listCameraFiles(cameraPath = '/DCIM/') {
  const ZCAM_IP = '10.98.32.1';
  const url = `http://${ZCAM_IP}${cameraPath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to list camera files');
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data.files)) {
      return data.files;
    }
    throw new Error('Unexpected camera response');
  } catch {
    throw new Error('Failed to parse camera file list');
  }
}

/**
 * Delete a file either on the camera or locally.
 * @param {string} filePath - Path to file
 * @param {string} location - 'camera' or 'local'
 */
export async function deleteFile(filePath, location = 'local') {
  if (location === 'local') {
    await fs.remove(filePath);
    return true;
  } else if (location === 'camera') {
    // Z CAM may not support HTTP DELETE; if not, this will need to use their API
    const url = `${CAMERA_BASE_URL}${filePath}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } else {
    throw new Error('Invalid location');
  }
}

/**
 * Get file metadata (size, mtime, etc.)
 * @param {string} filePath - Local file path
 */
export async function getFileMetadata(filePath) {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    mtime: stats.mtime,
    ctime: stats.ctime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
  };
} 