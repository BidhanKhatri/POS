function CornerPanel({ children, color, borderColor = '#DDD2CC', bg = '#ffffff', style = {} }) {
  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        background: bg,
        ...style,
      }}
    >
      {/* Top Left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          borderTop: `1px solid ${color}`,
          borderLeft: `1px solid ${color}`,
          borderTopLeftRadius: 8,
          pointerEvents: 'none',
        }}
      />

      {/* Bottom Right */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 24,
          height: 24,
          borderBottom: `1px solid ${color}`,
          borderRight: `1px solid ${color}`,
          borderBottomRightRadius: 8,
          pointerEvents: 'none',
        }}
      />

      {children}
    </div>
  );
}

export default CornerPanel;