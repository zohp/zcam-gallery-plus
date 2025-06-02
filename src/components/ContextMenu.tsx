import React, { useState, useCallback } from 'react';

interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuHook {
  showContextMenu: (items: ContextMenuItem[], position: ContextMenuPosition) => void;
  hideContextMenu: () => void;
  contextMenu: React.ReactNode;
}

export const useContextMenu = (): ContextMenuHook => {
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);

  const showContextMenu = useCallback((items: ContextMenuItem[], pos: ContextMenuPosition) => {
    setMenuItems(items);
    setPosition(pos);
  }, []);

  const hideContextMenu = useCallback(() => {
    setMenuItems([]);
    setPosition(null);
  }, []);

  // Basic placeholder rendering for the context menu
  const contextMenu = position && menuItems.length > 0 ? (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        padding: '5px 0',
        zIndex: 1000, // Ensure it's on top
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up, e.g., to GalleryView's hideContextMenu
    >
      {menuItems.map((item, index) => (
        <div
          key={index}
          onClick={() => {
            if (!item.disabled) {
              item.action();
              hideContextMenu();
            }
          }}
          style={{
            padding: '8px 15px',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            color: item.disabled ? '#aaa' : '#333',
            backgroundColor: item.disabled ? 'transparent' : 'white',
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            if (!item.disabled) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'white';
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  ) : null;

  return { showContextMenu, hideContextMenu, contextMenu };
}; 