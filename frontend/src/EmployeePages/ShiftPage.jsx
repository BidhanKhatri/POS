import React from 'react';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';

export default function ShiftPage() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          Employee
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B1D1A', margin: 0, letterSpacing: '-0.2px' }}>
          Shift
        </h1>
      </div>

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #DDD2CC',
          borderRadius: 12,
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#F5F0EC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AccessTimeOutlinedIcon sx={{ fontSize: 28, color: '#3E2723' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#2B1D1A', margin: 0 }}>
          Shift Management
        </p>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#6B5B57', margin: 0, maxWidth: 260, lineHeight: '20px' }}>
          Clock in, clock out, and view your shift history. Shift controls coming soon.
        </p>
      </div>

    </div>
  );
}
