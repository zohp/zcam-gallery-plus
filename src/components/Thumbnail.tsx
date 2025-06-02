import React from 'react';
import { GalleryItem } from '../types'; // Assuming types.ts is in the parent directory

interface ThumbnailProps {
  item: GalleryItem;
  isSelected: boolean;
  // Add any other props your Thumbnail might need, e.g.:
  // width?: number;
  // height?: number;
  // onClick?: (item: GalleryItem) => void;
  // onContextMenu?: (item: GalleryItem, event: React.MouseEvent) => void;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ item, isSelected }) => {
  // Basic placeholder rendering
  return (
    <div 
      className={`thumbnail-item ${isSelected ? 'selected' : ''}`}
      style={{
        border: isSelected ? '2px solid blue' : '1px solid #ccc',
        padding: '10px',
        margin: '5px',
        backgroundColor: '#f9f9f9',
        // In a real implementation, you'd have an <img> or <video> tag here
        // For now, just display the name and type
      }}
    >
      <p style={{ margin: 0, fontWeight: 'bold' }}>{item.name}</p>
      <p style={{ margin: '5px 0 0', fontSize: '0.8em', color: '#555' }}>Type: {item.type}</p>
      {item.thumbnailUrl && (
        <p style={{ margin: '5px 0 0', fontSize: '0.8em', color: '#777' }}>Thumbnail: Yes (placeholder)</p>
      )}
      {/* Placeholder for actual image/video thumbnail later */}
    </div>
  );
};

export default Thumbnail; 