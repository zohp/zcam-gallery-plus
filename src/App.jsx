import React, { useState, useRef, useEffect, useCallback, useMemo, useContext, createContext } from 'react';
import ZCamConnector from './ZCamConnector';
import AutoIngestService from './AutoIngestService';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import './App.css';
import { listCameraFiles } from './fileSystem';

// Create a new context for stable grid cell data and handlers
const GridCellContext = React.createContext(null);

// --- Download Progress Context ---
const DownloadProgressContext = createContext({
  progress: {},
  setProgress: () => {},
  lastProgressRef: { current: {} },
  pendingProgressUpdatesRef: { current: {} },
  flushProgressUpdates: () => {},
});

function DownloadProgressProvider({ children }) {
  const [progress, setProgress] = useState({});
  const lastProgressRef = useRef({});
  const pendingProgressUpdatesRef = useRef({});
  const flushScheduledRef = useRef(false);
  const lastFlushTimeRef = useRef(Date.now());

  // Throttled flush
  const THROTTLE_INTERVAL_MS = 100;
  const flushProgressUpdates = useCallback(() => {
    const now = Date.now();
    const sinceLastFlush = now - lastFlushTimeRef.current;
    if (sinceLastFlush < THROTTLE_INTERVAL_MS) {
      if (!flushScheduledRef.current) {
        flushScheduledRef.current = true;
        setTimeout(flushProgressUpdates, THROTTLE_INTERVAL_MS - sinceLastFlush);
      }
      return;
    }
    lastFlushTimeRef.current = now;
    if (Object.keys(pendingProgressUpdatesRef.current).length > 0) {
      setProgress(prev => {
        let newProgress = { ...prev };
        let changed = false;
        for (const itemName in pendingProgressUpdatesRef.current) {
          if (newProgress[itemName] !== pendingProgressUpdatesRef.current[itemName]) {
            newProgress[itemName] = pendingProgressUpdatesRef.current[itemName];
            changed = true;
          }
        }
        pendingProgressUpdatesRef.current = {};
        return changed ? newProgress : prev;
      });
    }
    flushScheduledRef.current = false;
  }, []);

  const contextValue = useMemo(() => ({
    progress,
    setProgress,
    lastProgressRef,
    pendingProgressUpdatesRef,
    flushProgressUpdates,
  }), [progress, setProgress]);

  return (
    <DownloadProgressContext.Provider value={contextValue}>
      {children}
    </DownloadProgressContext.Provider>
  );
}

const connector = new ZCamConnector();
const ZCAM_IP = '10.98.32.1';

// Static style object for thumbnails, defined outside App component for stability
const thumbnailCommonStyle = {
  width: '100%',
  height: '100%',
  aspectRatio: '16/9',
  objectFit: 'cover',
  borderRadius: 0,
  boxSizing: 'border-box',
};

// Development-only logging helper
const devLog = (...args) => {
  // Simplified to always log for now, or implement your preferred logic
  console.log('[App.jsx]', ...args);
};

const MemoizedDownloadButton = React.memo(({ item, downloadProgressRef, onDownload, itemProgressToDisplay }) => {
  const currentProgressForButton = downloadProgressRef && downloadProgressRef.current ? downloadProgressRef.current : {};
  const progressFromRef = currentProgressForButton[item.name];
  const isActuallyDownloading = progressFromRef !== undefined && progressFromRef > 0 && progressFromRef < 100;
  const isCompleteFromRef = progressFromRef === 100;
  // Show checkmark if ingested or complete
  if (item.isIngested || isCompleteFromRef) {
    return <span className="download-checkmark" title="Downloaded" style={{ color: '#4caf50', fontSize: '1.1em', marginLeft: 4, verticalAlign: 'middle' }}>&#10003;</span>;
  }
  // Hide button only if actively downloading (progress strictly between 0 and 100)
  if (itemProgressToDisplay > 0 && itemProgressToDisplay < 100) {
    return null;
  }
  // Otherwise, show download button
  return (
    <button 
      onClick={onDownload} 
      disabled={isActuallyDownloading}
      className="download-button compact"
      title="Download"
      style={{
        background: 'none',
        color: isActuallyDownloading ? '#888' : '#e53935',
        border: 'none',
        borderRadius: 4,
        padding: '0 4px',
        fontSize: '1.1em',
        cursor: isActuallyDownloading ? 'not-allowed' : 'pointer',
        marginLeft: 2,
        marginRight: 2,
        verticalAlign: 'middle',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => { if (!isActuallyDownloading) e.target.style.color = '#b71c1c'; }}
      onMouseLeave={e => { if (!isActuallyDownloading) e.target.style.color = '#e53935'; }}
    >
      {/* Minimalistic SVG arrow down */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <path d="M8 3v8m0 0l-3-3m3 3l3-3" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}, (prevProps, nextProps) => {
  if (prevProps.item.name !== nextProps.item.name) return false;
  if (prevProps.item.isIngested !== nextProps.item.isIngested) return false;
  const prevProgressValFromRef = prevProps.downloadProgressRef?.current?.[prevProps.item.name];
  const nextProgressValFromRef = nextProps.downloadProgressRef?.current?.[nextProps.item.name];
  if (prevProgressValFromRef !== nextProgressValFromRef) return false;
  if (prevProps.itemProgressToDisplay !== nextProps.itemProgressToDisplay) return false;
  if (prevProps.onDownload !== nextProps.onDownload) return false;
  return true;
});

const SIDEBAR_ITEMS = [
  { key: 'gallery', label: 'Gallery' },
  { key: 'info', label: 'Camera Info' },
  { key: 'settings', label: 'Settings' },
];

// Helper to get the subfolder for a file (first 4 chars of filename)
function getSubfolder(fileName) {
  return fileName.slice(0, 4);
}

// Helper to get proxy path for a file
function getProxyPath(fileName) {
  if (!/\.(mov|mp4)$/i.test(fileName)) return null;
  const subfolder = getSubfolder(fileName); // e.g., A001
  // Corrected path: DCIM/<subfolder>/proxy/<original_filename.MOV>
  return `/DCIM/${subfolder}/proxy/${fileName}`;
}

// Helper to get the full path for a file in DCIM
function getFilePath(fileName) {
  const subfolder = getSubfolder(fileName);
  return `/DCIM/${subfolder}/${fileName}`;
}

function parseDirectoryListing(html) {
  // Simple regex to extract hrefs from directory listing
  // This works for basic Apache-style listings; adjust as needed for your camera
  const linkRegex = /<a href="([^"]+)">([^<]+)<\/a>/g;
  const items = [];
  let match;
  while ((match = linkRegex.exec(html))) {
    // Skip parent directory link
    if (match[1] === '../') continue;
    items.push({
      name: match[2],
      href: match[1],
      isFolder: match[1].endsWith('/'),
    });
  }
  return items;
}

// Helper function to truncate filename in the middle
function truncateFilenameMiddle(filename, maxLength = 30) {
  if (filename.length <= maxLength) {
    return filename;
  }
  const half = Math.floor((maxLength - 3) / 2); // -3 for ellipsis '...'
  const start = filename.substring(0, half);
  const end = filename.substring(filename.length - half);
  return `${start}…${end}`;
}

// Helper function to parse timestamp from Z CAM filename - MOVED HERE
const parseTimestampFromFilename = (filename) => {
  // Matches Z CAM_xxxx_YYYYMMDDHHMMSS_C.MOV or similar
  const match = filename.match(/_(\d{14})_/);
  if (match && match[1]) {
    const y = parseInt(match[1].substring(0, 4), 10);
    const m = parseInt(match[1].substring(4, 6), 10) - 1; // JS months are 0-indexed
    const d = parseInt(match[1].substring(6, 8), 10);
    const h = parseInt(match[1].substring(8, 10), 10);
    const min = parseInt(match[1].substring(10, 12), 10);
    const s = parseInt(match[1].substring(12, 14), 10);
    return new Date(y, m, d, h, min, s).getTime();
  }
  return null; // Or a very old/new date for sorting non-matching names
};

const GallerySortControl = ({ sortCriteria, onSortChange }) => {
  const fields = [
    { key: 'name', label: 'Name' },
    { key: 'date', label: 'Date' },
  ];

  const handleSortClick = (fieldKey) => {
    onSortChange(fieldKey);
  };

  return (
    <div className="gallery-sort-controls">
      {fields.map((field) => (
        <button
          key={field.key}
          onClick={() => handleSortClick(field.key)}
          className={sortCriteria.field === field.key ? 'active' : ''}
          title={`Sort by ${field.label} (${sortCriteria.field === field.key ? (sortCriteria.order === 'asc' ? 'Ascending' : 'Descending') : ( (field.key === 'date' || field.key === 'name') ? 'Descending' : 'Ascending') })`}
        >
          {field.label}
          {sortCriteria.field === field.key && (
            <span className="sort-indicator">{sortCriteria.order === 'asc' ? ' ▲' : ' ▼'}</span>
          )}
        </button>
      ))}
    </div>
  );
};

// Define constants used for grid calculation at App scope
const ITEM_MIN_WIDTH = 400; // Increased from 280
const GAP = 12; // Guaranteed visible gap between cells
const CELL_PADDING = 0;
const CELL_MARGIN = 0;

function App() {
  const [localIngestPath, setLocalIngestPath] = useState(null);
  const [autoIngestEnabled, setAutoIngestEnabled] = useState(false);
  const [autoIngestService, setAutoIngestService] = useState(null);
  const [autoIngestPath, setAutoIngestPath] = useState(null);
  const [localThumbnailPath, setLocalThumbnailPath] = useState('');
  const [folderWatcher, setFolderWatcher] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cameraInfo, setCameraInfo] = useState(null);
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [currentGalleryPath, setCurrentGalleryPath] = useState('/DCIM/');
  const [pathHistory, setPathHistory] = useState(['/DCIM/']);
  const [downloadProgress, setDownloadProgress] = useState({});
  const downloadProgressRef = useRef(downloadProgress);
  useEffect(() => {
    downloadProgressRef.current = downloadProgress;
  }, [downloadProgress]);
  const [sortCriteria, setSortCriteria] = useState({ field: 'name', order: 'desc' });
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [view, setView] = useState('gallery');
  const [error, setError] = useState(null);
  const [proxyAvailable, setProxyAvailable] = useState(false);
  const [localThumbnailDir, setLocalThumbnailDir] = useState(null);
  const [activeManualDownloadsCount, setActiveManualDownloadsCount] = useState(0);
  const intervalIdRef = useRef(null);
  const gridContainerRef = useRef(null);

  // --- Download Progress State ---
  const lastProgressRef = useRef({});
  const pendingProgressUpdatesRef = useRef({});
  const flushScheduledRef = useRef(false);
  const lastFlushTimeRef = useRef(Date.now()); // For throttling

  // --- Gallery Path State ---
  const currentGalleryPathRef = useRef(currentGalleryPath);
  useEffect(() => { currentGalleryPathRef.current = currentGalleryPath; }, [currentGalleryPath]);

  // --- Auto Ingest State ---
  const autoIngestPathRef = useRef(autoIngestPath);
  useEffect(() => { autoIngestPathRef.current = autoIngestPath; }, [autoIngestPath]);

  // --- Loaded Thumbnails Log ---
  const loadedThumbnailsLogRef = useRef(new Set());

  // --- Gallery Items Ref ---
  const galleryItemsRef = useRef(galleryItems);
  useEffect(() => {
    galleryItemsRef.current = galleryItems;
  }, [galleryItems]);

  const GALLERY_POLL_INTERVAL_MS = 10000;

  // --- Throttled Flush Progress Updates Callback (500ms) ---
  const flushProgressUpdates = useCallback(() => {
    const now = Date.now();
    const sinceLastFlush = now - lastFlushTimeRef.current;
    if (sinceLastFlush < THROTTLE_INTERVAL_MS) {
      if (!flushScheduledRef.current) {
        flushScheduledRef.current = true;
        setTimeout(flushProgressUpdates, THROTTLE_INTERVAL_MS - sinceLastFlush);
      }
      return;
    }
    lastFlushTimeRef.current = now;
    if (Object.keys(pendingProgressUpdatesRef.current).length > 0) {
      setDownloadProgress(prevProgress => {
        let newProgress = { ...prevProgress };
        let changed = false;
        for (const itemName in pendingProgressUpdatesRef.current) {
          if (newProgress[itemName] !== pendingProgressUpdatesRef.current[itemName]) {
            newProgress[itemName] = pendingProgressUpdatesRef.current[itemName];
            changed = true;
          }
        }
        pendingProgressUpdatesRef.current = {};
        return changed ? newProgress : prevProgress;
      });
    }
    flushScheduledRef.current = false;
  }, []);

  // Stable getProxyPath using ref
  function getProxyPath(fileName) {
    if (!/\.(mov|mp4)$/i.test(fileName)) return null;
    const subfolder = getSubfolder(fileName);
    const galleryPath = currentGalleryPathRef.current; // Use ref
    const expectedProxyLocation = `${galleryPath}${subfolder}/proxy/${fileName.toUpperCase()}`;
    // devLog(`[App.jsx getProxyPath] File: ${fileName}, Subfolder: ${subfolder}, Expected Proxy: ${expectedProxyLocation}`);
    return expectedProxyLocation;
  }

  const handlePreview = useCallback((item) => {
    if (!item || item.isFolder) return;
    const filePath = item.localPath || `http://${ZCAM_IP}${currentGalleryPathRef.current}${item.name}`; // Use ref
    devLog('[App.jsx handlePreview] Item:', item.name, 'Path:', filePath);
    setPreviewItem({ ...item, path: filePath });
    if (/\.(mov|mp4)$/i.test(item.name)) {
      const proxyPath = getProxyPath(item.name); // Internally uses currentGalleryPathRef.current
      if (proxyPath) {
        setProxyAvailable(true);
      }
    }
  }, [ZCAM_IP, setPreviewItem, setProxyAvailable]); // Dependencies are stable

  const handleGalleryNavigate = useCallback((itemOrPath) => {
    if (itemOrPath.isFolder) {
      setCurrentGalleryPath(prevPath => {
        const basePath = prevPath.endsWith('/') ? prevPath : prevPath + '/';
        return basePath + itemOrPath.name + '/';
      });
    } else {
      handlePreview(itemOrPath); // handlePreview is stable
    }
  }, [setCurrentGalleryPath, handlePreview]); // Dependencies are stable

  const handleDownload = useCallback(async (item) => {
    console.log('[DEBUG] handleDownload called for', item.name);
    const currentAutoIngestPathVal = autoIngestPathRef.current;
    const currentGalleryPathVal = currentGalleryPathRef.current;

    if (downloadProgressRef.current[item.name] !== undefined &&
        downloadProgressRef.current[item.name] >= 0 &&
        downloadProgressRef.current[item.name] < 100) {
      devLog('[App.jsx handleDownload] Download actively in progress for', item.name);
      return;
    }

    let destFolder = currentAutoIngestPathVal;
    if (!destFolder) {
      if (window.electronAPI?.showOpenDialog) {
        const result = await window.electronAPI.showOpenDialog({ properties: ['openDirectory'] });
        if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
          destFolder = result.filePaths[0];
          setAutoIngestPath(destFolder); // This will update autoIngestPathRef via its useEffect
        } else {
          if (lastProgressRef.current) delete lastProgressRef.current[item.name];
          setDownloadProgress(p => { const newProgress = { ...p }; delete newProgress[item.name]; return newProgress; });
          return;
        }
      } else {
        alert('Feature to choose folder not available.');
        if (lastProgressRef.current) delete lastProgressRef.current[item.name];
        setDownloadProgress(p => { const newProgress = { ...p }; delete newProgress[item.name]; return newProgress; });
        return;
      }
    }
    const dest = destFolder.endsWith('/') ? destFolder + item.name : destFolder + '/' + item.name;

    if (downloadProgressRef.current) downloadProgressRef.current[item.name] = 0;
    setActiveManualDownloadsCount(prevCount => prevCount + 1);
    if (lastProgressRef.current) lastProgressRef.current[item.name] = 0;
    setDownloadProgress(p => ({ ...p, [item.name]: 0 }));

    const cleanGalleryPath = currentGalleryPathVal.endsWith('/') ? currentGalleryPathVal : currentGalleryPathVal + '/';
    const url = `http://${ZCAM_IP}${cleanGalleryPath}${item.name}`;

    window.electronAPI.downloadFile(url, dest, (received, total) => {
      const percent = total ? Math.round((received / total) * 100) : 0;
      const prevProgress = downloadProgressRef.current[item.name];
      if (prevProgress !== undefined && prevProgress !== percent) {
        downloadProgressRef.current[item.name] = percent;
        pendingProgressUpdatesRef.current[item.name] = percent;
        // If this is the first progress event (prevProgress is 0 or undefined and percent > 0), flush immediately
        if ((prevProgress === 0 || prevProgress === undefined) && percent > 0) {
          flushProgressUpdates(); // Immediate flush for first progress
        } else {
          flushProgressUpdates(); // Throttled for subsequent updates
        }
      }
    })
    .then(() => {
      delete pendingProgressUpdatesRef.current[item.name];
      if (lastProgressRef.current) lastProgressRef.current[item.name] = 100;
      setDownloadProgress(pgo => ({ ...pgo, [item.name]: 100 }));
      setGalleryItems(prevItems => {
        let changed = false;
        const newItems = prevItems.map(gi => {
          if (gi.name === item.name) {
            if (!gi.isIngested || gi.localPath !== dest) {
              changed = true;
              return { ...gi, isIngested: true, localPath: dest };
            }
          }
          return gi;
        });
        return changed ? newItems : prevItems;
      });
      setActiveManualDownloadsCount(prevCount => Math.max(0, prevCount - 1));
    })
    .catch((e) => {
      console.error('Download failed:', item.name, e);
      setActiveManualDownloadsCount(prevCount => Math.max(0, prevCount - 1));
      setDownloadProgress(pgo => { const newProgress = { ...pgo }; delete newProgress[item.name]; return newProgress; });
      setGalleryItems(prevItems => {
        let changed = false;
        const newItems = prevItems.map(gi => {
          if (gi.name === item.name) {
            if (gi.isIngested) {
              changed = true;
              return { ...gi, isIngested: false };
            }
          }
          return gi;
        });
        return changed ? newItems : prevItems;
      });
    });
  }, [
    ZCAM_IP,
    setActiveManualDownloadsCount,
    setDownloadProgress,
    setAutoIngestPath,
    setGalleryItems,
    downloadProgressRef,
    lastProgressRef,
    pendingProgressUpdatesRef,
    flushProgressUpdates
    // currentGalleryPath (state) and autoIngestPath (state) are NOT dependencies.
    // Their values are read from currentGalleryPathRef.current and autoIngestPathRef.current.
  ]);

  // Memoize renderPreview for stable reference
  const renderPreview = useCallback(async (item) => {
    if (!item || item.isFolder) return;
    // Build original and proxy URLs
    const filePath = item.localPath || `http://${ZCAM_IP}${currentGalleryPathRef.current}${item.name}`;
    let proxyUrl = null;
    if (/\.(mov|mp4)$/i.test(item.name)) {
      // Try to construct proxy path
      const subfolder = item.name.slice(0, 4);
      const proxyPath = `/DCIM/${subfolder}/proxy/${item.name.toUpperCase()}`;
      const url = `http://${ZCAM_IP}${proxyPath}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) proxyUrl = url;
      } catch {}
    }
    setPreviewItem({
      ...item,
      proxyUrl: proxyUrl || null,
      originalUrl: filePath
    });
  }, [ZCAM_IP, currentGalleryPathRef]);

  const gridCellContextValueBase = useMemo(() => ({
    handleDownload,
    renderPreview,
    downloadProgressRef, 
    loadedThumbnailsLogRef,
    handleGalleryNavigate
  }), [
    handleDownload,         // Now stable
    renderPreview,          // Now stable
    downloadProgressRef,    // Stable ref object
    loadedThumbnailsLogRef, // Stable ref object
    handleGalleryNavigate   // Now stable
  ]);

  // Log initial state values
  useEffect(() => {
    devLog('[App Init] Initial states:', {
      view,
      connected,
      currentGalleryPath,
      connecting,
      error,
      localThumbnailDir,
      GALLERY_POLL_INTERVAL_MS
    });
  }, []); // Only log once on mount

  const connector = useMemo(() => new ZCamConnector(ZCAM_IP, devLog), []);

  // Add a ref to hold the latest autoIngestService
  const autoIngestServiceRef = useRef(autoIngestService); 
  useEffect(() => {
    autoIngestServiceRef.current = autoIngestService;
  }, [autoIngestService]); // Keep ref in sync with state

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Update the ref whenever sortCriteria changes
  useEffect(() => {
    devLog('[App.jsx] Client-side sort applying for:', sortCriteria);
  }, [sortCriteria]);

  // Sorting function
  const sortItems = useCallback((items, criteria) => {
    const itemsCopy = [...items];
    itemsCopy.sort((a, b) => {
      let valA = a[criteria.field];
      let valB = b[criteria.field];

      // Handle date sorting if 'date' is the field
      if (criteria.field === 'date') {
        valA = parseTimestampFromFilename(a.name) ?? 0;
        valB = parseTimestampFromFilename(b.name) ?? 0;
      }

      if (valA < valB) return criteria.order === 'asc' ? -1 : 1;
      if (valA > valB) return criteria.order === 'asc' ? 1 : -1;
      return 0;
    });
    return itemsCopy;
  }, []); // No dependencies, pure function

  // Move fetchGalleryAndSizes here, before any useEffect that uses it
  const fetchGalleryAndSizes = useCallback(async (path, isPoll = false) => {
    if (!connected) {
      devLog('fetchGalleryAndSizes: Not connected, skipping fetch.');
      return;
    }
    if (!isPoll) {
      setGalleryLoading(true);
    }
    setError(null);

    try {
      const cameraFetchedItems = await connector.listFiles(path);
      devLog(`[App.jsx fetchGalleryAndSizes] Fetched ${cameraFetchedItems.length} camera items from ${path}. isPoll: ${isPoll}`);

      const currentGalleryItems = galleryItemsRef.current; // Use the ref for current state

      let itemsChangedDuringMerge = false;
      const newMergedItemsArray = cameraFetchedItems.map(cameraItem => {
        const existingItem = currentGalleryItems.find(p => p.name === cameraItem.name);
        
        const cameraItemSize = cameraItem.size;

        if (existingItem) {
          const potentialUpdatedItem = {
            ...cameraItem, // Base from camera
            isIngested: existingItem.isIngested,
            localPath: existingItem.localPath,
            size: cameraItemSize ?? existingItem.size,
            localThumbnailPath: existingItem.localThumbnailPath,
            date: existingItem.date || cameraItem.date || parseTimestampFromFilename(cameraItem.name) || new Date().toISOString(), 
            type: existingItem.type || (cameraItem.name.toLowerCase().endsWith('.mov') ? 'video' : 'photo')
          };
            
          const propsToCheck = ['isIngested', 'localPath', 'size', 'localThumbnailPath', 'isFolder', 'date', 'type'];
          let changedProp = null;
          for (const prop of propsToCheck) {
            if (potentialUpdatedItem[prop] !== existingItem[prop]) {
              changedProp = prop;
              break;
            }
          }

          if (!changedProp) {
            return existingItem; // Return original object if no change
          } else {
            if (isPoll) {
              devLog(`[fetchGalleryAndSizes POLL MERGE DEBUG] Item ${existingItem.name} deemed changed. Prop: ${changedProp}. Prev: ${existingItem[changedProp]}, New: ${potentialUpdatedItem[changedProp]}. PrevObj:`, existingItem, 'NewObj:', potentialUpdatedItem);
            }
            itemsChangedDuringMerge = true;
            return potentialUpdatedItem; // Return new object if changed
          }
        }
        // New item, not existing before
        itemsChangedDuringMerge = true;
        return {
          ...cameraItem,
          isIngested: false,
          localPath: null,
          size: cameraItemSize, 
          localThumbnailPath: null,
          date: cameraItem.date || parseTimestampFromFilename(cameraItem.name) || new Date().toISOString(),
          type: cameraItem.name.toLowerCase().endsWith('.mov') ? 'video' : 'photo'
        };
      });
      
      if (currentGalleryItems.length !== newMergedItemsArray.length) {
        if (isPoll) devLog('[fetchGalleryAndSizes POLL MERGE DEBUG] Length changed. Prev:', currentGalleryItems.length, 'New:', newMergedItemsArray.length);
        itemsChangedDuringMerge = true;
      }

      let processedMergedItems = newMergedItemsArray;
      let itemsChangedDuringProcessing = false;

      if (window.electronAPI?.getFileMetadata && autoIngestServiceRef.current) {
        const itemsToProcessForMetadata = [...processedMergedItems];
        processedMergedItems = await Promise.all(itemsToProcessForMetadata.map(async (item) => {
          let updatedItem = item;
          let itemSpecificChange = false;
          let changedProcessingProp = null;

          if (!item.isFolder && item.localPath && (item.size === null || item.size === undefined || item.size === 0)) {
            try {
              const metadata = await window.electronAPI.getFileMetadata(item.localPath);
              if (metadata && typeof metadata.size === 'number' && metadata.size > 0 && item.size !== metadata.size) {
                updatedItem = { ...updatedItem, size: metadata.size };
                itemSpecificChange = true;
                changedProcessingProp = 'size (metadata)';
              }
            } catch (err) { /* ignore */ }
          }
          if (!item.isFolder && /\.(mov|mp4|jpg|jpeg|png)$/i.test(item.name) && !updatedItem.localThumbnailPath) {
            const cameraItemPath = getFilePath(item.name);
            try {
              const localThumb = await autoIngestServiceRef.current.ensureLocalThumbnail(item.name, cameraItemPath);
              if (localThumb && updatedItem.localThumbnailPath !== localThumb) {
                updatedItem = { ...updatedItem, localThumbnailPath: localThumb };
                itemSpecificChange = true;
                changedProcessingProp = 'localThumbnailPath';
              }
            } catch (err) {
              console.error(`[App.jsx fetchGalleryAndSizes] Error ensuring thumbnail for ${item.name}:`, err);
            }
          }
          if (itemSpecificChange && isPoll) {
            devLog(`[fetchGalleryAndSizes POLL PROCESSING DEBUG] Item ${item.name} processed, change detected for prop: ${changedProcessingProp}.`);
          }
          if (itemSpecificChange) itemsChangedDuringProcessing = true;
          return updatedItem;
        }));
      }
      
      if (isPoll && !itemsChangedDuringMerge && !itemsChangedDuringProcessing) {
         const prevNames = currentGalleryItems.map(p => p.name).sort().join(',');
         const newNames = processedMergedItems.map(n => n.name).sort().join(',');
         if (prevNames === newNames && currentGalleryItems.length === processedMergedItems.length) {
            devLog('[App.jsx fetchGalleryAndSizes POLLED] No changes from merge or processing, file list identical. Skipping sort/set.');
            return; 
         }
         // If we are here, it means the name/length check failed
         devLog(`[fetchGalleryAndSizes POLL DEBUG] Names/length check failed. PrevLen: ${currentGalleryItems.length}, NewLen: ${processedMergedItems.length}. PrevNames: "${prevNames}", NewNames: "${newNames}"`);
      }

      setGalleryItems(prevItems => {
        // If we are here, it means some change happened (itemsChangedDuringMerge or itemsChangedDuringProcessing is true, or it's not a poll)
        // or the early return condition for polling wasn't met.
        devLog('[App.jsx fetchGalleryAndSizes] Data changed or initial fetch. Re-sorting and updating gallery items.');
        
        // Sort the final list of items (which may contain preserved or new object references)
        const sortedFinalItems = sortItems(processedMergedItems, sortCriteria);

        // Compare with previous sorted items to see if a state update is truly needed
        // This is a deep comparison of sorted lists
        if (prevItems.length === sortedFinalItems.length) {
          let effectivelySame = true;
          for (let i = 0; i < prevItems.length; i++) {
            // Compare relevant properties, not just reference, as sortItems creates new array
            if (prevItems[i].name !== sortedFinalItems[i].name || 
                prevItems[i].isIngested !== sortedFinalItems[i].isIngested ||
                prevItems[i].localPath !== sortedFinalItems[i].localPath ||
                prevItems[i].localThumbnailPath !== sortedFinalItems[i].localThumbnailPath ||
                prevItems[i].size !== sortedFinalItems[i].size
                // Add any other critical properties that define an item's visual state
                ) {
              effectivelySame = false;
              break;
            }
          }
          devLog(`[DEBUG] setGalleryItems: effectivelySame = ${effectivelySame}`);
          if (effectivelySame) {
            devLog('[App.jsx fetchGalleryAndSizes setGalleryItems] Sorted final items are effectively same as previous, skipping setGalleryItems to avoid re-render.');
            return prevItems; // Do not call setGalleryItems if nothing changed
          }
        }

        if (autoIngestEnabled && isPoll && autoIngestServiceRef.current) {
          devLog('[App.jsx fetchGalleryAndSizes POLLED] Auto-ingest is ON. Checking for new files to request immediate ingest.');
          sortedFinalItems.forEach(item => {
            if (!item.isFolder && !item.isIngested) {
              const alreadyKnownToService = autoIngestServiceRef.current.isFileKnown(item.name);
              if (!alreadyKnownToService) {
                 devLog(`[App.jsx fetchGalleryAndSizes POLLED] Requesting immediate ingest for new/un-ingested file: ${item.name}`);
                 autoIngestServiceRef.current.requestIngest(item.name, getFilePath(item.name));
              }
            }
          });
        }
        return sortedFinalItems;
      });

    } catch (err) {
      setError(`Failed to load gallery from ${path}: ${err.message}`);
      console.error("fetchGalleryAndSizes error:", err);
      if (err.message === 'ZCamConnector: Not connected to camera') {
        setConnected(false);
      }
      if (!isPoll) setGalleryItems([]);
    } finally {
      if (!isPoll) {
        setGalleryLoading(false);
      }
    }
  }, [connected, connector, autoIngestServiceRef, sortItems]); // Add connected back so it is always up to date

  devLog('[App Pre-Effect] Checking view before problematic useEffect:', view); // Log view before use
  React.useEffect(() => {
    devLog('[DEBUG] Gallery fetch effect running', {view, connected, currentGalleryPath});
    if (view === 'gallery' && connected) {
      fetchGalleryAndSizes(currentGalleryPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, connected, currentGalleryPath]); // fetchGalleryAndSizes intentionally omitted

  React.useEffect(() => {
    // Make the window full screen if running in Electron
    if (window.require) {
      try {
        const { remote } = window.require('electron');
        const win = remote.getCurrentWindow();
        win.setFullScreen(true);
      } catch {}
    }
  }, []);

  // Advanced memoization for sortedGalleryItems to prevent unnecessary re-renders
  const lastSortedRef = useRef({
    galleryItems: null,
    sortCriteria: null,
    sorted: [],
  });
  const sortedGalleryItems = useMemo(() => {
    // If galleryItems and sortCriteria are unchanged (by reference and value), reuse last sorted
    if (
      lastSortedRef.current.galleryItems === galleryItems &&
      lastSortedRef.current.sortCriteria &&
      lastSortedRef.current.sortCriteria.field === sortCriteria.field &&
      lastSortedRef.current.sortCriteria.order === sortCriteria.order
    ) {
      return lastSortedRef.current.sorted;
    }
    // Otherwise, sort and update ref
    devLog(`[App.jsx useMemo sortedGalleryItems] Re-sorting gallery items. Count: ${galleryItems.length} Criteria:`, sortCriteria);
    const sorted = [...galleryItems].sort((a, b) => {
      if (sortCriteria.field === 'name') {
        return sortCriteria.order === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortCriteria.field === 'date') {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return sortCriteria.order === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
    lastSortedRef.current = {
      galleryItems,
      sortCriteria: { ...sortCriteria },
      sorted,
    };
    return sorted;
  }, [galleryItems, sortCriteria]);

  // Callback to handle sort changes
  const handleSortChange = useCallback((field) => {
    devLog('[App.jsx handleSortChange] Sort field changed to:', field);
    setSortCriteria(prevCriteria => {
      if (prevCriteria.field === field) {
        // Toggle order if same field is clicked
        return { field, order: prevCriteria.order === 'asc' ? 'desc' : 'asc' };
      } else {
        // Default to descending for date and name, ascending for size when new field selected
        const defaultOrder = (field === 'date' || field === 'name') ? 'desc' : 'asc';
        return { field, order: defaultOrder };
      }
    });
  }, []);

  // Callback for when a new file is ingested
  const handleNewFileIngested = useCallback((ingestedFile) => {
    devLog('[App.jsx handleNewFileIngested] Received event:', ingestedFile);

    const manualDownloadProgress = downloadProgressRef.current[ingestedFile.name];

    if (manualDownloadProgress !== undefined && manualDownloadProgress >= 0) {
      if (manualDownloadProgress < 100) {
        devLog(`[App.jsx handleNewFileIngested] Manual download active (${manualDownloadProgress}%) for ${ingestedFile.name}. Skipping.`);
      } else {
        devLog(`[App.jsx handleNewFileIngested] Manual download completed (100%) for ${ingestedFile.name}. Skipping.`);
      }
      return;
    }

    setGalleryItems(prevItems => {
      const currentSortCriteria = sortCriteria; // Use current sortCriteria state
      const existingItemIndex = prevItems.findIndex(item => item.name === ingestedFile.name);
      let itemsArrayChanged = false; // Flag to indicate if a new array reference is needed

      if (existingItemIndex > -1) {
        const existingItem = prevItems[existingItemIndex];
        let updatedItem = { ...existingItem }; // Start with a copy to modify
        let specificFieldChanged = false;

        // Update fields based on ingestedFile data, checking for actual changes
        if (ingestedFile.size !== undefined && updatedItem.size !== ingestedFile.size) {
          updatedItem.size = ingestedFile.size;
          specificFieldChanged = true;
        }
        if (ingestedFile.date !== undefined && updatedItem.date !== ingestedFile.date) {
          updatedItem.date = ingestedFile.date;
          specificFieldChanged = true;
        }
        if (ingestedFile.localPath !== undefined && updatedItem.localPath !== ingestedFile.localPath) {
          updatedItem.localPath = ingestedFile.localPath;
          updatedItem.isIngested = !!ingestedFile.localPath; // Ingested if localPath is truthy
          specificFieldChanged = true; // isIngested might also change due to localPath
        }
        // Ensure isIngested reflects localPath presence if localPath was the primary change source
        if (updatedItem.isIngested !== !!updatedItem.localPath) {
            updatedItem.isIngested = !!updatedItem.localPath;
            specificFieldChanged = true;
        }

        if (ingestedFile.isLocallySynced !== undefined && updatedItem.isLocallySynced !== ingestedFile.isLocallySynced) {
          updatedItem.isLocallySynced = ingestedFile.isLocallySynced;
          specificFieldChanged = true;
          if (ingestedFile.isLocallySynced && !updatedItem.isIngested) { // If synced, it must be ingested
             updatedItem.isIngested = true;
          }
        }
        if (ingestedFile.isMissingLocally !== undefined && updatedItem.isMissingLocally !== ingestedFile.isMissingLocally) {
          updatedItem.isMissingLocally = ingestedFile.isMissingLocally;
          specificFieldChanged = true;
          if (ingestedFile.isMissingLocally) { // If missing, it's not ingested and has no local path
            updatedItem.isIngested = false;
            updatedItem.localPath = null;
            updatedItem.isLocallySynced = false; // Should also be false if missing
          }
        }
        if (ingestedFile.thumbnailUrl !== undefined && updatedItem.thumbnail !== ingestedFile.thumbnailUrl) {
          updatedItem.thumbnail = ingestedFile.thumbnailUrl; // Camera thumbnail URL
          specificFieldChanged = true;
        }
        if (ingestedFile.localThumbnailPath !== undefined && updatedItem.localThumbnailPath !== ingestedFile.localThumbnailPath) {
          updatedItem.localThumbnailPath = ingestedFile.localThumbnailPath;
          specificFieldChanged = true;
        }

        if (specificFieldChanged) {
          devLog(`[App.jsx handleNewFileIngested] UPDATE: Changes detected for ${ingestedFile.name}.`);
          const newItemsArray = [...prevItems];
          newItemsArray[existingItemIndex] = updatedItem;
          itemsArrayChanged = true;
          return sortItems(newItemsArray, currentSortCriteria); // Return new sorted array
        }
        devLog(`[App.jsx handleNewFileIngested] UPDATE: No effective change for existing item ${ingestedFile.name}.`);
        return prevItems; // No change to this item, return original array

      } else {
        // Item does not exist, add it
        devLog(`[App.jsx handleNewFileIngested] ADD: New item ${ingestedFile.name}.`);
        const newItem = {
          name: ingestedFile.name,
          size: ingestedFile.size || 0,
          date: ingestedFile.date || parseTimestampFromFilename(ingestedFile.name) || new Date().toISOString(),
          type: ingestedFile.name.toLowerCase().endsWith('.mov') ? 'video' : 'photo',
          isIngested: !!ingestedFile.localPath, // Ingested if it has a localPath from the start
          localPath: ingestedFile.localPath || null,
          thumbnail: ingestedFile.thumbnailUrl || null, // Camera thumbnail URL
          localThumbnailPath: ingestedFile.localThumbnailPath || null,
          isLocallySynced: ingestedFile.isLocallySynced || false,
          isMissingLocally: ingestedFile.isMissingLocally || false,
        };
        itemsArrayChanged = true;
        return sortItems([...prevItems, newItem], currentSortCriteria); // Return new sorted array
      }
    });
  }, [downloadProgressRef, sortItems, sortCriteria]);

  // Callback for ingest progress
  const handleIngestProgress = useCallback((fileName, progressPercent) => {
    setDownloadProgress(prev => ({ ...prev, [fileName]: progressPercent }));
  }, []);

  // Effect to determine localThumbnailDir ONCE on component mount
  useEffect(() => {
    if (window.electronAPI?.getAppDataPath) {
      window.electronAPI.getAppDataPath().then(appDataPath => {
        const thumbDir = appDataPath ? `${appDataPath}/thumbnails`.replace(/\\/g, '/') : null;
        if (thumbDir && window.electronAPI?.ensureDirExists) {
          window.electronAPI.ensureDirExists(thumbDir).then(() => {
            setLocalThumbnailDir(thumbDir); // Ensure this state is set
            devLog('App.jsx: Local thumbnail directory ensured on mount:', thumbDir);
          }).catch(err => console.error('App.jsx: Error ensuring thumbnail dir on mount:', err));
        } else if (!thumbDir) {
          console.error('App.jsx: Could not determine appDataPath for thumbnails on mount.');
        }
      }).catch(err => console.error('App.jsx: Error getting appDataPath:', err));
    } else {
      console.warn('App.jsx: getAppDataPath API not available, cannot set localThumbnailDir.');
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // Initialize AutoIngestService when dependencies are ready
  useEffect(() => {
    devLog('App.jsx: AutoIngestService effect. Deps: Connected:', connected, 'IngestPath:', autoIngestPath, 'ThumbDir:', localThumbnailDir);
    let serviceInstance = null;
    
    // Only initialize if all dependencies, including localThumbnailDir, are ready
    if (connected && connector && window.electronAPI?.downloadFile && localThumbnailDir && typeof handleNewFileIngested === 'function' && typeof handleIngestProgress === 'function') {
      if (autoIngestServiceRef.current) {
        devLog('App.jsx: Stopping existing AutoIngestService before reinitialization...');
        autoIngestServiceRef.current.stop();
        // No need to setIsAutoIngesting(false) here, preserve user's intent if path changes
      }
      
      devLog(`App.jsx: Initializing AutoIngestService. IngestPath: ${autoIngestPath}, ThumbDir: ${localThumbnailDir}`);
      const service = new AutoIngestService(
        connector, 
        window.electronAPI.downloadFile,
        {
          localIngestPath: autoIngestPath,
          cameraPathToMonitor: '/DCIM/',
          pollingIntervalMs: 10000, 
          readDirSync: window.electronAPI.readDirSync,
          localThumbnailPath: localThumbnailDir, 
        },
        handleNewFileIngested,
        handleIngestProgress,
        (itemName, localThumbPath) => { // onThumbnailReady callback
          // devLog(`[App.jsx] Thumbnail ready for ${itemName} at ${localThumbPath}`);
          setGalleryItems(prevItems => {
            let itemFoundAndChanged = false;
            const newItems = prevItems.map(item => {
              if (item.name === itemName && item.localThumbnailPath !== localThumbPath) {
                itemFoundAndChanged = true;
                return { ...item, localThumbnailPath: localThumbPath };
              }
              return item;
            });
            // Only return new array if an item actually changed
            return itemFoundAndChanged ? newItems : prevItems;
          });
        }
      );
      autoIngestServiceRef.current = service;
      serviceInstance = service; 
      devLog('App.jsx: AutoIngestService initialized/reinitialized successfully.');

      if (autoIngestPath) { // If an ingest path is set, sync local files
        devLog('App.jsx: Performing initial sync with local folder after service initialization.');
        service.syncWithLocalFolder();
      }
      // If auto-ingest was previously on, and we are re-initializing (e.g. path change),
      // restart it if the service instance is new or was stopped.
      if (autoIngestEnabled && serviceInstance) { // Check if user intended it to be on
         devLog('App.jsx: Auto-ingest was on, attempting to restart it with new service instance.');
         serviceInstance.start(); 
      }

    } else {
      if (autoIngestServiceRef.current) {
        devLog('App.jsx: Dependencies for AutoIngestService not met. Stopping service.');
        autoIngestServiceRef.current.stop();
        autoIngestServiceRef.current = null; // Clear the service instance
      }
    }

    return () => {
      if (serviceInstance) {
        devLog('App.jsx: Cleanup - stopping auto-ingest service from effect return.');
        serviceInstance.stop();
      }
    };
  }, [connected, connector, autoIngestPath, localThumbnailDir, handleNewFileIngested, handleIngestProgress]); // Dependencies for service re-init

  // Reinstated: Toggle Auto Ingest
  const toggleAutoIngest = () => {
    const callId = Date.now(); // Unique ID for this call
    devLog(`App.jsx: toggleAutoIngest called (ID: ${callId}). Current isAutoIngesting: ${autoIngestEnabled}`);

    if (!autoIngestServiceRef.current) {
      console.warn(`App.jsx (ID: ${callId}): AutoIngestService not available.`);
      return;
    }
    if (autoIngestEnabled) {
      devLog(`App.jsx (ID: ${callId}): Stopping auto-ingest.`);
      autoIngestServiceRef.current.stop();
      setAutoIngestEnabled(false);
      devLog(`App.jsx (ID: ${callId}): Auto-ingest STOPPED by user.`);
    } else {
      devLog(`App.jsx (ID: ${callId}): Starting auto-ingest.`);
      autoIngestServiceRef.current.start();
      setAutoIngestEnabled(true);
      devLog(`App.jsx (ID: ${callId}): Auto-ingest STARTED by user.`);
    }
  };

  // Handler for choosing ingest path
  const handleSetIngestPath = async () => {
    devLog('handleSetIngestPath called');
    if (window.electronAPI && window.electronAPI.showOpenDialog) {
      devLog('App.jsx: Opening directory selection dialog...');
      
      try {
        const result = await window.electronAPI.showOpenDialog({ 
          properties: ['openDirectory'],
          title: 'Select Ingest Folder',
          buttonLabel: 'Select Folder',
          defaultPath: autoIngestPath || undefined // Use current path as default if available
        });
        
        devLog('App.jsx: Dialog result:', result);
        devLog('App.jsx: Dialog result details:', {
          canceled: result?.canceled,
          filePaths: result?.filePaths,
          filePathsLength: result?.filePaths?.length,
          firstPath: result?.filePaths?.[0],
          error: result?.error
        });
        
        if (result && !result.canceled) {
          if (result.filePaths && result.filePaths.length > 0) {
            const newPath = result.filePaths[0];
            const oldPath = autoIngestPath;
            devLog(`App.jsx: Setting new ingest path: ${newPath}`);
            setAutoIngestPath(newPath);
            devLog(`App.jsx: Auto ingest path successfully set to: ${newPath}`);
            
            // Service will be automatically reinitialized by the useEffect
            if (oldPath !== newPath) {
              devLog('App.jsx: Path changed, AutoIngestService will be reinitialized automatically.');
              if (autoIngestEnabled) {
                devLog('App.jsx: Auto-ingest was running. It will be stopped and you\'ll need to restart it with the new path.');
              }
            }
          } else {
            console.warn('App.jsx: Dialog completed but no file paths returned. This might indicate a dialog configuration issue.');
            devLog('App.jsx: Empty filePaths array despite not being canceled');
          }
        } else {
          devLog('[App.jsx handleSetIngestPath] User canceled the dialog or dialog failed');
          return; // Stop further execution for setting ingest path
        }
      } catch (error) {
        console.error('App.jsx: Error in directory selection:', error);
        alert('Failed to open directory selection dialog: ' + error.message);
      }
    } else {
      console.error('App.jsx: window.electronAPI.showOpenDialog is not available!');
      alert('Feature to choose folder not available in this environment.');
    }
  };

  // Effect to manage gallery polling - REMOVE activeManualDownloadsCount from dependencies
  useEffect(() => {
    const pollGallery = () => {
      devLog(`App.jsx: Gallery poller - fetching updates for ${currentGalleryPath}`); // Use currentGalleryPath
      fetchGalleryAndSizes(currentGalleryPath, true);  // Use currentGalleryPath
    };

    if (view === 'gallery' && connected && currentGalleryPath.startsWith('/DCIM/')) { // Use currentGalleryPath
      // Remove the activeManualDownloadsCount condition from here
      // We'll handle bandwidth management differently
      
      // Clear any existing interval before starting a new one to prevent multiple intervals.
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
      intervalIdRef.current = setInterval(pollGallery, GALLERY_POLL_INTERVAL_MS);
      devLog(`App.jsx: Started gallery polling for ${currentGalleryPath} with interval ID: ${intervalIdRef.current} (ignoring manual download count for polling control)`); // Use currentGalleryPath
    } else {
      // Conditions for polling are NOT met.
      // If an interval is active, stop it.
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        devLog(`App.jsx: Gallery polling stopped (conditions changed: view=${view}, connected=${connected}, path=${currentGalleryPath}). Cleared interval ID: ${intervalIdRef.current}`); // Use currentGalleryPath
        intervalIdRef.current = null;
      }
    }

    return () => {
      // Cleanup function:
      // This cleanup runs when the component unmounts OR when dependencies change causing the effect to re-run.
      // Always clear the interval controlled by this effect instance.
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        devLog(`App.jsx: useEffect cleanup. Cleared interval ID: ${intervalIdRef.current} for path ${currentGalleryPath}.`); // Use currentGalleryPath
        intervalIdRef.current = null;
      }
    };
  }, [
    view,
    connected,
    currentGalleryPath, // Use currentGalleryPath
    fetchGalleryAndSizes,
    GALLERY_POLL_INTERVAL_MS
  ]);

  // Subscribe to ingest folder watcher events and sync local folder on change (only once)
  useEffect(() => {
    devLog('[App.jsx] Folder watcher useEffect running (mount)');
    if (!window.electronAPI?.onIngestFolderChanged) return;
    const handler = () => {
      devLog('[App.jsx] Folder watcher event received, calling syncWithLocalFolder');
      if (autoIngestServiceRef.current) {
        autoIngestServiceRef.current.syncWithLocalFolder();
      }
    };
    window.electronAPI.onIngestFolderChanged(handler);
    // No off/unsubscribe available in current API, so no cleanup
  }, []); // Only run once on mount

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);
    setConnected(false);
    setCameraInfo(null);
    try {
      const ok = await connector.connect(ZCAM_IP);
      if (ok) {
        setConnected(true);
        setCameraInfo(connector.getCameraInfo());
      } else {
        setError('Failed to connect. Is your Z CAM powered on and on the network?');
      }
    } catch (e) {
      setError('Connection error.');
    }
    setConnecting(false);
  };

  const handleDisconnect = () => {
    connector.disconnect();
    setConnected(false);
    setCameraInfo(null);
    setGalleryItems([]);
  };

  // Helper to check if proxy exists (HEAD request) - MOVED EARLIER
  const checkProxyExists = async (proxyUrl) => {
    try {
      const res = await fetch(proxyUrl, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  };



  const handleGalleryBack = () => {
    if (currentGalleryPathRef.current !== '/DCIM/') { // Use ref
      const parts = currentGalleryPathRef.current.split('/').filter(Boolean); // Use ref
      parts.pop();
      setCurrentGalleryPath('/' + parts.join('/') + '/'); 
    }
  };

  // Component to handle async loading of local thumbnails - OPTIMIZED
  const LocalThumbnail = React.memo(({ localPath, item, commonStyle, onPreview, onFolderClick, loadedThumbnailsLogRef, itemProgress }) => {
    // const logKey = `${item.name}-${localPath ? 'EXISTS' : 'NULL'}`;
    // if (!LocalThumbnail._lastLoggedState || LocalThumbnail._lastLoggedState[item.name] !== logKey) {
    //   devLog(`[LocalThumbnail] 🖼️ RENDER: ${item.name} - localPath: ${localPath ? 'EXISTS' : 'NULL'}`);
    //   LocalThumbnail._lastLoggedState = LocalThumbnail._lastLoggedState || {};
    //   LocalThumbnail._lastLoggedState[item.name] = logKey;
    // }

    const [dataUrl, setDataUrl] = React.useState(null);
    const [isLoadingLocal, setIsLoadingLocal] = React.useState(false);
    const [hasErrorLoadingLocal, setHasErrorLoadingLocal] = React.useState(false);
    const lastLoadedPathRef = React.useRef(null); 

    React.useEffect(() => {
      let isActive = true;
      const loadLocalThumbnail = async () => {
        if (!localPath) {
          if (isActive) {
            setDataUrl(null);
            setHasErrorLoadingLocal(false); 
            lastLoadedPathRef.current = null;
          }
          return;
        }

        // Only reload if the path has actually changed since last successful load
        if (localPath === lastLoadedPathRef.current && dataUrl) {
          // devLog(`[LocalThumbnail] Skipping load for ${item.name}, localPath ${localPath} already loaded.`);
          return;
        }
        
        // devLog(`[LocalThumbnail] Attempting to load dataUrl for ${item.name} localPath: ${localPath}`);
        setIsLoadingLocal(true);
        setHasErrorLoadingLocal(false);

        try {
          const loadedDataUrl = await window.electronAPI.readFileAsDataURL(localPath);
          if (isActive) {
            setDataUrl(loadedDataUrl);
            lastLoadedPathRef.current = localPath; // Record successful load path
            if (loadedThumbnailsLogRef && loadedThumbnailsLogRef.current) {
              loadedThumbnailsLogRef.current.add(item.name);
            }
          }
        } catch (error) {
          devLog(`[LocalThumbnail] Error loading local thumbnail ${localPath} for ${item.name}:`, error);
          if (isActive) {
            setDataUrl(null);
            setHasErrorLoadingLocal(true);
            lastLoadedPathRef.current = null; // Clear on error so it might retry if path changes back
          }
        }
        if (isActive) {
          setIsLoadingLocal(false);
        }
      };

      loadLocalThumbnail();

      return () => { isActive = false; };
    // dataUrl REMOVED from dependency array to prevent loop. Effect now runs on localPath change.
    }, [localPath, loadedThumbnailsLogRef, item.name, itemProgress]); // item.name added for safety if localPath could be reused by different items (unlikely here)

    const cameraThumbnailUrl = React.useMemo(() => {
      if (/(\.mov|\.mp4)$/i.test(item.name)) {
        const videoUrl = `http://${ZCAM_IP}${getFilePath(item.name)}`;
        return `${videoUrl}?act=thm`;
      } else if (/(\.jpg|\.jpeg|\.png)$/i.test(item.name)) {
        return `http://${ZCAM_IP}${getFilePath(item.name)}`;
      }
      return null;
    }, [item.name]);

    const imgSrc = dataUrl && !hasErrorLoadingLocal ? dataUrl : cameraThumbnailUrl;
    const showQuestionMark = !imgSrc && !item.isFolder;

    return (
      <div 
        onClick={() => {
          if (item.isFolder && typeof onFolderClick === 'function') onFolderClick(item);
          else if (!item.isFolder && typeof onPreview === 'function') onPreview(item);
        }}
        style={{ 
          cursor: 'pointer', 
          width: '100%', 
          position: 'relative',
          ...commonStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: item.isFolder ? '#181818' : '#111',
          minHeight: '100px',
        }}
      >
        {item.isFolder ? (
          <svg width="56" height="40" viewBox="0 0 56 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="12" width="52" height="24" rx="5" fill="#2d3a4a" stroke="#4f5b6b" strokeWidth="2"/>
            <rect x="2" y="8" width="20" height="10" rx="3" fill="#3a4a5e" stroke="#4f5b6b" strokeWidth="2"/>
          </svg>
        ) : imgSrc ? (
          <img 
            src={imgSrc} 
            alt={item.name} 
            style={{ 
              ...commonStyle, 
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }} 
            onError={(e) => { 
              e.target.style.display = 'none';
            }}
          />
        ) : showQuestionMark ? (
          <span style={{color: '#555', fontSize: '2em', fontWeight: 'bold'}}>?</span>
        ) : null}
        {/* Download progress text is handled by the Cell component directly */}
      </div>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison for LocalThumbnail - only re-render if relevant props changed
    if (prevProps.localPath !== nextProps.localPath) return false;
    if (prevProps.item.name !== nextProps.item.name) return false;
    // For item, also check other potentially relevant fields if they affect rendering directly
    if (prevProps.item.isFolder !== nextProps.item.isFolder) return false; 

    // Compare commonStyle by stringification if it's an object, or direct if stable
    if (prevProps.commonStyle !== nextProps.commonStyle && 
        JSON.stringify(prevProps.commonStyle) !== JSON.stringify(nextProps.commonStyle)) {
      return false;
    }
    
    // Assuming onPreview and loadedThumbnailsLogRef are stable (e.g., from useCallback or useRef)
    // If they can change and affect rendering, they should be compared too.

    return true; // Skip re-render if all relevant props are the same
  });

  // Memoized Cell component for the Grid - OPTIMIZED to prevent unnecessary re-renders
  const Cell = React.memo(({ columnIndex, rowIndex, style, data }) => {
    // data is dynamicGridItemData: { itemsArray, progressState, columnCount }
    const { itemsArray, progressState, columnCount } = data;
    const gridCellContext = useContext(GridCellContext);
    const item = itemsArray[rowIndex * columnCount + columnIndex];
    if (!item) return <div style={style}></div>;
    // Get progress for this item only from progressState
    const itemProgressForDisplay = progressState[item.name] || 0;
    devLog(`[Cell] RENDER: ${item.name}, Progress: ${itemProgressForDisplay}`);
    if (!gridCellContext) return <div style={style}></div>;
    const {
      handleDownload,
      renderPreview,
      loadedThumbnailsLogRef,
      handleGalleryNavigate
    } = gridCellContext;
    const thumbnailCommonStyle = {
      width: '100%',
      aspectRatio: '16/9',
      height: 'auto',
      objectFit: 'cover',
      borderRadius: '4px',
      cursor: item.isFolder ? 'pointer' : 'default',
    };
    return (
      <div style={{
        ...style,
        background: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0,
      }} className="gallery-cell-outer">
        <div style={{
          width: `calc(100% - ${GAP}px)`,
          height: `calc(100% - ${GAP}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          borderRadius: 8,
          boxShadow: '0 2px 8px #0003',
          background: 'none',
        }}>
          <LocalThumbnail 
            localPath={item.localThumbnailPath} 
            item={item} 
            commonStyle={{ ...thumbnailCommonStyle, border: '1px solid #222', boxShadow: '0 1px 6px #0004', borderRadius: 6 }}
            onPreview={renderPreview}
            onFolderClick={handleGalleryNavigate}
            loadedThumbnailsLogRef={loadedThumbnailsLogRef}
            itemProgress={itemProgressForDisplay} // Pass progress directly
          />
          {/* Compact info line: filename, size, date, download/checkmark, progress bar */}
          <div className="file-info" style={{ width: '100%', marginTop: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72em', color: '#bbb', whiteSpace: 'nowrap', overflow: 'hidden', minHeight: 18 }}>
            <span className="file-name" title={item.name} style={{ fontSize: '0.72em', color: '#bbb', fontWeight: 400, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'middle' }}>{truncateFilenameMiddle(item.name, 38)}</span>
            <span style={{ margin: '0 4px', color: '#666' }}>|</span>
            <span style={{ color: '#888', marginRight: 2 }}>size</span>
            <span style={{ color: item.isFolder ? '#666' : (item.size ? '#bbb' : '#444'), minWidth: 36, display: 'inline-block', textAlign: 'right' }}>
              {item.isFolder ? 'Folder' : (item.size ? `${(item.size / 1024 / 1024).toFixed(1)}MB` : '—')}
            </span>
            <span style={{ margin: '0 4px', color: '#666' }}>|</span>
            <span style={{ color: '#888', marginRight: 2 }}>date</span>
            <span style={{ color: item.timestamp ? '#bbb' : '#444', minWidth: 60, display: 'inline-block', textAlign: 'right' }}>
              {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '—'}
            </span>
            {!item.isFolder && (
              <>
                <MemoizedDownloadButton 
                  item={item}
                  onDownload={() => handleDownload(item)}
                  downloadProgressRef={{ current: { [item.name]: itemProgressForDisplay } }}
                  itemProgressToDisplay={itemProgressForDisplay}
                />
                {(itemProgressForDisplay > 0 && itemProgressForDisplay < 100) && (
                  <div className="progress-bar-container" style={{ width: 28, height: 3, background: '#222', borderRadius: 2, marginLeft: 2, marginTop: 0, display: 'inline-block', verticalAlign: 'middle' }}>
                    <div className="progress-bar" style={{ width: `${itemProgressForDisplay}%`, height: '100%', background: '#e53935', borderRadius: 2, transition: 'width 0.2s' }}></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }, (prevProps, nextProps) => {
    // Only re-render if the item or its progress changes
    const prevData = prevProps.data;
    const nextData = nextProps.data;
    const prevColumnCount = prevData.columnCount || 1;
    const nextColumnCount = nextData.columnCount || 1;
    const prevItem = prevData.itemsArray[prevProps.rowIndex * prevColumnCount + prevProps.columnIndex];
    const nextItem = nextData.itemsArray[nextProps.rowIndex * nextColumnCount + nextProps.columnIndex];
    // Guard: if either item is undefined, only re-render if both are the same (covers empty cells)
    if (!prevItem || !nextItem) {
      return prevItem === nextItem;
    }
    // Compare only item and progress
    const prevItemProgress = prevData.progressState[prevItem.name] || 0;
    const nextItemProgress = nextData.progressState[nextItem.name] || 0;
    if (
      prevItem === nextItem &&
      prevItemProgress === nextItemProgress &&
      prevColumnCount === nextColumnCount &&
      prevProps.style === nextProps.style
    ) {
      return true;
    }
    devLog(`[Cell.memo] Re-rendering for ${nextItem.name}. ItemRefSame: ${prevItem === nextItem}, ProgSame: ${prevItemProgress === nextItemProgress}, ColCountSame: ${prevColumnCount === nextColumnCount}`);
    return false;
  });

  // Calculate number of columns based on grid width (constants moved slightly for clarity, if not already outside)
  const CELL_WIDTH = 280; // Should be const if not already defined in App scope
  // const CELL_PADDING = 4; // CELL_PADDING is now defined at App scope as 10 for rowHeight calc. Ensure this aligns with actual cell padding.
  // const CELL_HEIGHT = CELL_WIDTH * (9 / 16); // CELL_HEIGHT seems unused, rowHeight is calculated dynamically

  

  // Base gridItemData, does not include columnCount as it's derived dynamically
  const baseGridItemData = useMemo(() => {
    devLog(`[App.jsx useMemo baseGridItemData] Recomputing. Deps: sortedGalleryItems`);
    return {
      itemsArray: sortedGalleryItems,
      // columnCount will be added dynamically inside AutoSizer's children
    };
  }, [sortedGalleryItems]);

  // Preview overlay component
  const PreviewOverlay = ({ item, onClose }) => {
    if (!item) return null;
    return (
      <div className="preview-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
        <div style={{ position: 'relative', background: '#111', borderRadius: 12, padding: 24, boxShadow: '0 4px 32px #0008' }} onClick={e => e.stopPropagation()}>
          <div style={{ marginBottom: 12, color: '#fff', fontWeight: 600 }}>{item.name} {item.proxyUrl ? '(Proxy)' : ''}</div>
          {item.type === 'video' ? (
            <video src={item.proxyUrl || item.originalUrl} controls autoPlay style={{ maxWidth: '80vw', maxHeight: '70vh', borderRadius: 8, background: '#000' }} />
          ) : item.type === 'image' ? (
            <img src={item.originalUrl} alt={item.name} style={{ maxWidth: '80vw', maxHeight: '70vh', borderRadius: 8, background: '#000' }} />
          ) : (
            <div style={{ color: '#ccc' }}>No preview available</div>
          )}
          <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 8, background: '#222', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    );
  };

  devLog('[DEBUG] App render');

  // Add debug log in App render
  const appRenderCountRef = useRef(0);
  appRenderCountRef.current++;
  devLog(`[DEBUG] App render #${appRenderCountRef.current}`, {
    galleryItemsLen: galleryItems.length,
    downloadProgress,
    view,
    connected,
    galleryLoading,
    currentGalleryPath,
  });

  return (
    <DownloadProgressProvider>
      {/* Outermost container - ensures it fills the viewport and no body scrollbars */}
      <div className="macos-app" style={{
        height: '100vh',
        width: '100vw',
        background: 'var(--main-bg)',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}>
        {/* Main layout: flex column for toolbar + content */}
        <main className="main-content" style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}>
          <header className="toolbar" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '2rem',
            padding: '0.5rem 1rem', // More compact
            flexShrink: 0,
            background: 'var(--toolbar-bg, #2a2a2a)',
            boxSizing: 'border-box',
            width: '100%',
            borderBottom: '1px solid #444',
          }}>
            <button 
              onClick={handleGalleryBack} 
              disabled={currentGalleryPathRef.current === '/DCIM/'} // Use ref
              style={{ 
                background: 'none',
                border: 'none',
                color: currentGalleryPathRef.current === '/DCIM/' ? '#666' : '#fff', // Use ref
                cursor: currentGalleryPathRef.current === '/DCIM/' ? 'not-allowed' : 'pointer', // Use ref
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '2px 6px',
              }}
            >
              ← Back
            </button>
            
            {/* Ingest Folder Display & Selector */}
            {connected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  color: '#ccc', 
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}>
                  📁 Ingest:
                </span>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.3rem',
                  background: '#333',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  minWidth: '200px',
                  maxWidth: '300px',
                }}>
                  <input
                    type="text"
                    value={autoIngestPathRef.current ? autoIngestPathRef.current.replace(/\\/g, '/') : 'No folder selected'}
                    readOnly
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: autoIngestPathRef.current ? '#fff' : '#888',
                      fontSize: '0.8rem',
                      outline: 'none',
                      flex: 1,
                      cursor: 'pointer',
                      fontStyle: autoIngestPathRef.current ? 'normal' : 'italic',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={handleSetIngestPath}
                    title={autoIngestPathRef.current ? `Current ingest folder: ${autoIngestPathRef.current}` : 'Click to select ingest folder'}
                  />
                  <button 
                    onClick={handleSetIngestPath}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Change ingest folder"
                  >
                    📝
                  </button>
                </div>
              </div>
            )}

            {/* Auto Ingest Toggle Switch */}
            {connected && autoIngestServiceRef.current && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ 
                  color: '#ccc', 
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  Auto Ingest
                </span>
                
                {/* Option 1: iOS-style toggle switch */}
                <button 
                  onClick={toggleAutoIngest} 
                  style={{
                    background: autoIngestEnabled ? '#28a745' : '#444',
                    border: 'none',
                    borderRadius: '12px',
                    width: '40px',
                    height: '20px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  title={autoIngestEnabled ? 'Stop automatic downloading' : 'Start automatic downloading'}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'transform 0.3s ease',
                    transform: autoIngestEnabled ? 'translateX(20px)' : 'translateX(0px)',
                  }} />
                </button>
                
                {/* Option 2: Text-based toggle button (commented out for now)
                <button 
                  onClick={toggleAutoIngest} 
                  style={{
                    background: autoIngestEnabled ? '#28a745' : 'transparent',
                    border: `1px solid ${autoIngestEnabled ? '#28a745' : '#666'}`,
                    borderRadius: '6px',
                    color: autoIngestEnabled ? 'white' : '#ccc',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    padding: '4px 8px',
                    transition: 'all 0.2s ease',
                    minWidth: '45px',
                  }}
                  title={autoIngestEnabled ? 'Stop automatic downloading' : 'Start automatic downloading'}
                >
                  {autoIngestEnabled ? 'ON' : 'OFF'}
                </button>
                */}
                
                {/* Option 3: Checkbox-style toggle (commented out for now)
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  gap: '0.3rem'
                }}>
                  <input 
                    type="checkbox" 
                    checked={autoIngestEnabled}
                    onChange={toggleAutoIngest}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#28a745',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ 
                    color: autoIngestEnabled ? '#28a745' : '#ccc',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    transition: 'color 0.2s ease'
                  }}>
                    {autoIngestEnabled ? 'ON' : 'OFF'}
                  </span>
                </label>
                */}
              </div>
            )}
            
            {/* Unified Connection Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                onClick={connected ? handleDisconnect : handleConnect}
                disabled={connecting}
                style={{
                  background: 'none',
                  border: 'none',
                  color: connected ? '#dc3545' : connecting ? '#ffc107' : '#28a745',
                  cursor: connecting ? 'not-allowed' : 'pointer',
                  fontSize: '1.1em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: '500',
                  opacity: connecting ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  padding: '2px 8px',
                }}
                title={
                  connecting ? 'Connecting to camera...' : 
                  connected ? 'Disconnect from Z CAM' : 
                  'Connect to Z CAM'
                }
              >
                {connecting ? '🔄 Connecting...' : connected ? 
                  <span style={{ fontSize: '1.2em', color: '#dc3545', verticalAlign: 'middle' }} title="Disconnect">⏻</span>
                  : '🔌 Connect to Z CAM'
                }
              </button>
            </div>
            
            <button 
              style={{
                background: 'none',
                border: 'none',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                transition: 'opacity 0.2s',
              }}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              onMouseEnter={(e) => e.target.style.opacity = '0.7'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </header>

          {/* Content area: takes remaining space and gallery grid scrolls inside it */}
          <section className="content-area" style={{
            flexGrow: 1, // Take all available vertical space
            width: '100%',
            overflow: 'hidden', // Important: parent of scrolling container
            boxSizing: 'border-box',
            display: 'flex', 
            flexDirection: 'column',
          }}>
            {error && <div className="error-msg" style={{ padding: '1em', boxSizing: 'border-box', width: '100%' }}>{error}</div>}
            {view === 'gallery' && connected && (
              // This div wraps the gallery grid and loading/empty states
              <div style={{ 
                flexGrow: 1,
                width: '100%',
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}>
                <div className="gallery-view" style={{ padding: '0 24px' }}>
                  <div className="gallery-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}>
                    <h2 style={{ margin: 0, fontWeight: 600, fontSize: '1.4em' }}>Gallery: {currentGalleryPathRef.current}</h2>
                    <GallerySortControl
                      sortCriteria={sortCriteria}
                      onSortChange={handleSortChange}
                    />
                  </div>
                  {/* Gallery Grid container - this one scrolls. AutoSizer now always rendered. */}
                  <div 
                    ref={gridContainerRef} 
                    style={{
                      flexGrow: 1,
                      width: '100%',
                      height: '100%', // Important for AutoSizer
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <AutoSizer key={currentGalleryPathRef.current}> 
                      {({ height, width }) => {
                        // devLog(`[App.jsx AutoSizer] Rendering - Path: ${currentGalleryPath}, Width: ${width}, Height: ${height}, Items: ${sortedGalleryItems.length}, Loading: ${galleryLoading}`); // Removed this verbose log
                        
                        if (galleryLoading) {
                          devLog('[App.jsx AutoSizer] Rendering loading indicator because galleryLoading is true.');
                          return <div className="loading-indicator" style={{width: '100%', height: '100%', display:'flex', alignItems:'center', justifyContent:'center'}}>Loading gallery...</div>;
                        }
                        
                        if (width === 0 || height === 0 || (sortedGalleryItems.length === 0 && !galleryLoading)) {
                          if (sortedGalleryItems.length === 0 && !galleryLoading) {
                            devLog('[App.jsx AutoSizer] Rendering placeholder: No files found.');
                            return <div className="placeholder" style={{ textAlign: 'center', padding: '1em', boxSizing: 'border-box', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No files or folders found.</div>;
                          }
                          devLog('[App.jsx AutoSizer] Rendering null (width/height 0 or items 0 while loading).');
                          return null;
                        }

                        // Calculate columnCount directly within AutoSizer's children render function
                        const localColumnCount = Math.max(1, Math.floor((width + GAP) / (ITEM_MIN_WIDTH + GAP)));
                        devLog(`[App.jsx AutoSizer] Calculated localColumnCount: ${localColumnCount} for width: ${width}`);
                        
                        // Subtract GAP from each cell so there is always a visible gap
                        const columnWidthCalculated = (localColumnCount > 0) ? Math.floor((width - (localColumnCount + 1) * GAP) / localColumnCount) : ITEM_MIN_WIDTH;
                        const thumbnailHeight = columnWidthCalculated * (9 / 16);
                        const textHeight = 18; // Info line height
                        const rowHeight = Math.ceil(thumbnailHeight + textHeight); // No extra vertical gap, handled by grid
                        const rowCount = (localColumnCount > 0) ? Math.ceil(sortedGalleryItems.length / localColumnCount) : 0;

                        const dynamicGridItemData = {
                          ...baseGridItemData,
                          progressState: downloadProgress, // Ensure progressState is always present
                          columnCount: localColumnCount,
                          columnWidth: columnWidthCalculated
                        };

                        const currentGridCellContextValue = {
                          ...gridCellContextValueBase,
                          columnCount: localColumnCount 
                        };

                        if (height === 0 || width === 0 || (rowCount === 0 && sortedGalleryItems.length > 0) ) {
                            devLog(`[App.jsx AutoSizer] Rendering fallback (height/width 0 or rowCount 0 with items). H:${height}, W:${width}, RC:${rowCount}, Items:${sortedGalleryItems.length}`);
                            if (sortedGalleryItems.length > 0 && !galleryLoading) {
                                return <div className="placeholder" style={{ textAlign: 'center', padding: '1em', boxSizing: 'border-box', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Not enough space to display items.</div>;
                            }
                            return null; 
                        }
                        
                        return (
                          <GridCellContext.Provider value={currentGridCellContextValue}>
                            <Grid
                              className="gallery-grid"
                              columnCount={localColumnCount}
                              columnWidth={columnWidthCalculated}
                              height={height}
                              rowCount={rowCount}
                              rowHeight={rowHeight}
                              width={width}
                              itemData={dynamicGridItemData}
                              itemKey={({ columnIndex, rowIndex }) => `R${rowIndex}-C${columnIndex}`} 
                              children={Cell} 
                            />
                          </GridCellContext.Provider>
                        );
                      }}
                    </AutoSizer>
                  </div>
                </div>
                <PreviewOverlay item={previewItem} onClose={() => setPreviewItem(null)} />
              </div>
            )}
            {view === 'info' && connected && cameraInfo && (
              <div className="camera-info">
                <h3>Camera Info</h3>
                <pre>{JSON.stringify(cameraInfo, null, 2)}</pre>
              </div>
            )}
            {view === 'info' && !connected && (
              <div className="placeholder">Connect to the camera to view info.</div>
            )}
            {view === 'settings' && (
              <div className="placeholder">Settings coming soon…</div>
            )}
          </section>
        </main>
      </div>
    </DownloadProgressProvider>
  );
}

export default App;