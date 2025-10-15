import React from 'react';

const ProgressBar = React.memo(function ProgressBar({ progress, style = {}, className = '' }) {
  // Clamp progress between 0 and 100
  const safeProgress = Math.max(0, Math.min(100, typeof progress === 'number' ? progress : 0));
  return (
    <div
      className={`progress-bar-container ${className}`}
      style={{
        width: 28,
        height: 3,
        background: '#222',
        borderRadius: 2,
        marginLeft: 2,
        marginTop: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      <div
        className="progress-bar"
        style={{
          width: `${safeProgress}%`,
          height: '100%',
          background: '#e53935',
          borderRadius: 2,
          transition: 'width 0.2s',
        }}
      />
    </div>
  );
});

export default ProgressBar; 