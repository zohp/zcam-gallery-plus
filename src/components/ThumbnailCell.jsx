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
      <Thumbnail item={item} isSelected={false /* This might need to be passed down if selection is used */} />
      {isDownloading && (
        <div style={{ position: 'absolute', bottom: '10px', left: '5%', right: '5%', zIndex: 1 }}>
          <ProgressBar progress={progress} />
        </div>
      )}
    </div>
  );
};

export default React.memo(ThumbnailCell); 