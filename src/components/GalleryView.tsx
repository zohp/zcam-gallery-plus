import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import { GalleryItem } from '../types';
// import LazyThumbnail from './LazyThumbnail'; // Removed
import Thumbnail from './Thumbnail'; // Added
import { useContextMenu } from './ContextMenu';
import { جذاب_آیکن } from './icons'; // Assuming this is an icon component used somewhere

interface GalleryViewProps {
  items: GalleryItem[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onItemDoubleClick: (item: GalleryItem) => void;
  currentPath: string;
  sortBy: 'name' | 'date';
  onSortChange: (sortBy: 'name' | 'date') => void;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateBack: () => void;
  onSetIngestPath: () => void;
  width: number;
  height: number;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: GalleryItem[];
    selectedItems: string[];
    onContextMenu: (item: GalleryItem, index: number) => void;
    onDoubleClick: (item: GalleryItem) => void;
    onClick: (event: React.MouseEvent, item: GalleryItem, index: number) => void;
  };
}

const GalleryView: React.FC<GalleryViewProps> = ({
  items,
  selectedItems,
  onSelectionChange,
  onItemDoubleClick,
  currentPath,
  sortBy,
  onSortChange,
  isLoading,
  onRefresh,
  onNavigateBack,
  onSetIngestPath,
  width,
  height,
}) => {
  const { showContextMenu, hideContextMenu, contextMenu } = useContextMenu();

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // Default to date sort or if sortBy === 'date'
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA; // Sort descending by date
    });
  }, [items, sortBy]);

  const handleClick = useCallback(
    (event: React.MouseEvent, item: GalleryItem, index: number) => {
      hideContextMenu();
      const { metaKey, ctrlKey, shiftKey } = event;
      let newSelectedItems = [...selectedItems];

      if (shiftKey && selectedItems.length > 0) {
        const lastSelectedIndex = sortedItems.findIndex(
          (i) => i.id === selectedItems[selectedItems.length - 1]
        );
        if (lastSelectedIndex !== -1) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          newSelectedItems = sortedItems
            .slice(start, end + 1)
            .map((i) => i.id);
        } else {
          newSelectedItems = [item.id];
        }
      } else if (metaKey || ctrlKey) {
        if (newSelectedItems.includes(item.id)) {
          newSelectedItems = newSelectedItems.filter((id) => id !== item.id);
        } else {
          newSelectedItems.push(item.id);
        }
      } else {
        newSelectedItems = [item.id];
      }
      onSelectionChange(newSelectedItems);
    },
    [selectedItems, onSelectionChange, sortedItems, hideContextMenu]
  );

  const handleDoubleClick = useCallback(
    (item: GalleryItem) => {
      onItemDoubleClick(item);
    },
    [onItemDoubleClick]
  );

  const handleContextMenu = useCallback(
    (item: GalleryItem, index: number) => {
      if (!selectedItems.includes(item.id)) {
        onSelectionChange([item.id]);
      }
      showContextMenu(
        [
          { label: 'Open', action: () => onItemDoubleClick(item) },
          { label: 'Copy Path', action: () => navigator.clipboard.writeText(item.path) },
          // Add more context menu items as needed
        ],
        { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY }
      );
    },
    [selectedItems, onSelectionChange, showContextMenu, onItemDoubleClick]
  );
  
  // Row component remains the same, but uses Thumbnail directly
  const Row = ({ index, style, data }: RowProps) => {
    const item = data.items[index];
    const isSelected = data.selectedItems.includes(item.id);

    return (
      <div style={style} className="gallery-item-container" onClick={(e) => data.onClick(e, item, index)} onContextMenu={() => data.onContextMenu(item, index)} onDoubleClick={() => data.onDoubleClick(item)}>
        <Thumbnail
          item={item}
          isSelected={isSelected}
          // Pass any other props Thumbnail might need
        />
      </div>
    );
  };


  if (isLoading && items.length === 0) {
    return (
      <div className="gallery-view loading-placeholder">
        <جذاب_آیکن آیکن="spinner" className="animate-spin" />
        <p>Loading media...</p>
      </div>
    );
  }

  if (items.length === 0 && !isLoading) {
    return (
      <div className="gallery-view empty-placeholder">
        <جذاب_آیکن آیکن="folder-open" />
        <p>No items in this directory.</p>
        <p>Current ingest path: {currentPath}</p>
        <button onClick={onSetIngestPath} className="btn btn-primary">
          Set Ingest Path
        </button>
      </div>
    );
  }

  return (
    <div className="gallery-view" onClick={hideContextMenu}>
      <div className="gallery-controls">
        <button onClick={onNavigateBack} disabled={currentPath === '/' || currentPath === ''} className="btn">
          <جذاب_آیکن آیکن="arrow-left" /> Back
        </button>
        <span className="current-path truncate" title={currentPath}>Path: {currentPath}</span>
        <div className="sort-controls">
          <span>Sort by:</span>
          <button
            onClick={() => onSortChange('name')}
            className={`btn btn-sm ${sortBy === 'name' ? 'btn-active' : ''}`}
          >
            Name
          </button>
          <button
            onClick={() => onSortChange('date')}
            className={`btn btn-sm ${sortBy === 'date' ? 'btn-active' : ''}`}
          >
            Date {sortBy === 'date' ? <جذاب_آیکن آیکن="arrow-down" /> : ''}
          </button>
        </div>
        <button onClick={onRefresh} className="btn" disabled={isLoading}>
          {isLoading ? <جذاب_آیکن آیکن="spinner" className="animate-spin" /> : <جذاب_آیکن آیکن="refresh-cw" />}
          Refresh
        </button>
        <button onClick={onSetIngestPath} className="btn btn-primary">
          Set Ingest Path
        </button>
      </div>

      <FixedSizeList
        height={height - 100} // Adjusted for controls
        itemCount={sortedItems.length}
        itemSize={220 + 16} // Thumbnail height (200) + padding/margin + label
        width={width}
        itemData={{
          items: sortedItems,
          selectedItems,
          onContextMenu: handleContextMenu,
          onDoubleClick: handleDoubleClick,
          onClick: handleClick,
        }}
      >
        {Row}
      </FixedSizeList>
      {contextMenu}
    </div>
  );
};

export default GalleryView; 