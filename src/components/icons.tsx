import React from 'react';

// Define a more specific type for icon names if you have a known set
// export type IconName = 'spinner' | 'folder-open' | 'arrow-left' | 'refresh-cw' | 'arrow-down' | 'your-other-icon-names';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  آیکن: string; // or IconName if you define it
  // className is already part of HTMLAttributes
}

// This is a very basic placeholder. In a real app, you might use an icon library
// or have actual SVG paths for each icon.
export const جذاب_آیکن: React.FC<IconProps> = ({ آیکن, className, ...rest }) => {
  // For placeholder purposes, just render the name of the icon or a unicode character.
  
  let iconContent = `[${آیکن}]`; // Default placeholder
  switch (آیکن) {
    case 'spinner':
      iconContent = '🌀'; 
      break;
    case 'folder-open':
      iconContent = '📂';
      break;
    case 'arrow-left':
      iconContent = '←';
      break;
    case 'refresh-cw':
      iconContent = '🔄';
      break;
    case 'arrow-down':
      iconContent = '↓';
      break;
    // Add more cases as needed
  }

  return (
    <span 
      className={`icon icon-${آیکن} ${className || ''}`.trim()}
      role="img"
      aria-label={`${آیکن} icon`}
      {...rest} // Pass down other HTML span attributes
      style={{ display: 'inline-block', ...(rest.style || {}) }} // Combine with existing styles if any
    >
      {iconContent}
    </span>
  );
};

// If you plan to have many icons, consider a more scalable approach, like:
// 1. Using an icon library (e.g., react-icons, Font Awesome).
// 2. Having separate .svg files and a component that loads them dynamically.
// 3. Defining SVG paths directly in this component (if you were to use SVGs). 