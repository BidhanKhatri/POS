import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import useAuthStore from '../store/useAuthStore';

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#6B5B57' }}>
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export default function EmployeeTerminal() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleClockOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const quickActions = [
    {
      icon: <AccessTimeIcon sx={{ fontSize: 28 }} />,
      label: 'Start Shift',
      sub: 'Begin your work session',
      color: '#3E2723',
    },
    {
      icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 28 }} />,
      label: 'New Sale',
      sub: 'Open point-of-sale screen',
      color: '#3E2723',
    },
    {
      icon: <BadgeOutlinedIcon sx={{ fontSize: 28 }} />,
      label: 'My Activity',
      sub: 'View your shift history',
      color: '#3E2723',
    },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface">

      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.12)' }}
            >
              <PointOfSaleIcon sx={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: '18px' }}>
                {user?.name || 'Employee'}
              </p>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.06em' }}>
                {user?.employeeCode} · {user?.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Clock />
            <button
              onClick={handleClockOut}
              className="flex items-center gap-1.5 rounded-lg transition-colors"
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              <LogoutOutlinedIcon sx={{ fontSize: 15 }} />
              CLOCK OUT
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 flex flex-col gap-6">

        {/* Welcome banner */}
        <div
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f5f0ec 100%)',
            border: '1px solid #DDD2CC',
            borderRadius: 12,
            padding: '20px 24px',
            boxShadow: '0 2px 0 #c8bdb8, 0 4px 12px rgba(62,39,35,0.07)',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            Employee Terminal
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B1D1A', lineHeight: '30px', letterSpacing: '-0.2px' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#6B5B57', marginTop: 4, lineHeight: '20px' }}>
            You're clocked in. Select an action below to get started.
          </p>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="flex flex-col items-start rounded-xl border transition-all text-left"
              style={{
                padding: '18px 20px',
                background: '#ffffff',
                borderColor: '#DDD2CC',
                boxShadow: '0 2px 0 #DDD2CC, 0 4px 10px rgba(62,39,35,0.05)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#3E2723'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD2CC'}
            >
              <span style={{ color: action.color, marginBottom: 10 }}>{action.icon}</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#2B1D1A', lineHeight: '20px' }}>{action.label}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#8A7B77', marginTop: 2, lineHeight: '18px' }}>{action.sub}</p>
            </button>
          ))}
        </div>

        {/* Status footer */}
        <div
          className="flex items-center justify-center gap-2 rounded-xl"
          style={{
            padding: '12px 16px',
            background: '#f5f0ec',
            border: '1px solid #EDE4DF',
          }}
        >
          <span
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#2E7D4F',
              boxShadow: '0 0 0 2px rgba(46,125,79,0.2)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B5B57', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Terminal active — {user?.email}
          </span>
        </div>

      </main>
    </div>
  );
}
