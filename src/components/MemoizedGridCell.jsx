import React from 'react';
import Thumbnail from './Thumbnail';
import ProgressBar from './ProgressBar';

const ThumbnailCell = ({ item, style, onDoubleClick, onContextMenu, onClick, downloadProgress }) => {
  const progress = downloadProgress[item.name];
  const isDownloading = progress !== undefined && progress >= 0 && progress < 100;

  return (
    <div
      style={style}
      className="gallery-item-container"
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onClick={onClick}
    >
      <Thumbnail item={item} isSelected={false} />
      {isDownloading && (
        <div style={{ position: 'absolute', bottom: '10px', left: '5%', right: '5%', zIndex: 1 }}>
          <ProgressBar progress={progress} />
        </div>
      )}
    </div>
  );
};

const MemoizedGridCell = ({ columnIndex, rowIndex, style, data }) => {
  const { items, onDoubleClick, onContextMenu, onClick, downloadProgress, columnCount } = data;
  const index = rowIndex * columnCount + columnIndex;

  if (index >= items.length) {
    return null; // Do not render anything if the index is out of bounds
  }

  const item = items[index];

  return (
    <ThumbnailCell
      item={item}
      style={style}
      onDoubleClick={() => onDoubleClick(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      onClick={(e) => onClick(e, item)}
      downloadProgress={downloadProgress}
    />
  );
};

export default React.memo(MemoizedGridCell);