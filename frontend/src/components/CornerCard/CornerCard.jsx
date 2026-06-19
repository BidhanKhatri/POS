import React from 'react';

export default function CornerCard({
  children,
  borderColor = '#DDD2CC',
  accentColor = 'rgba(93, 64, 55, 0.45)',
  borderRadius = 14,
  cornerSize = 32,
  cornerHeight = 32,
  style = {},
}) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#fff',
        border: `1px solid ${borderColor}`,
        borderRadius,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Top Left Corner */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: cornerSize,
          height: cornerHeight,
          borderTop: `2px solid ${accentColor}`,
          borderLeft: `2px solid ${accentColor}`,
          borderTopLeftRadius: borderRadius,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Bottom Right Corner */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: cornerSize,
          height: cornerHeight,
          borderBottom: `2px solid ${accentColor}`,
          borderRight: `2px solid ${accentColor}`,
          borderBottomRightRadius: borderRadius,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {children}
    </div>
  );
}