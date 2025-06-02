export interface GalleryItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  timestamp?: number; // Optional: Unix timestamp for sorting by date
  thumbnailUrl?: string; // Optional: URL or path to a thumbnail image
  rawPath?: string; // Optional: Path to the original raw file if this is a proxy
  duration?: number; // Optional: Duration in seconds for video files
  // Add any other relevant fields you might need, e.g.:
  // size?: number; // File size in bytes
  // dimensions?: { width: number; height: number };
  // isProxy?: boolean;
}

// You can add other shared types here as your project grows. 