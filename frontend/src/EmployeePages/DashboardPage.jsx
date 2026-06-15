import React from 'react';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import useAuthStore from '../store/useAuthStore';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Sales Today',   value: '$0.00' },
    { label: 'Transactions',  value: '0' },
    { label: 'Shift Hours',   value: '0h 0m' },
  ];

  return (
    <div style={{ padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
          Employee
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B1D1A', margin: 0, letterSpacing: '-0.2px' }}>
          Dashboard
        </h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {stats.map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: '#ffffff',
              border: '1px solid #DDD2CC',
              borderRadius: 10,
              padding: '14px 12px',
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', margin: '0 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {label}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#2B1D1A', margin: 0, letterSpacing: '-0.3px' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Activity placeholder */}
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
          <GridViewOutlinedIcon sx={{ fontSize: 28, color: '#3E2723' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#2B1D1A', margin: 0 }}>
          No activity yet
        </p>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#6B5B57', margin: 0, maxWidth: 260, lineHeight: '20px' }}>
          Your sales and shift summary will appear here once you start your first session.
        </p>
      </div>

    </div>
  );
}
