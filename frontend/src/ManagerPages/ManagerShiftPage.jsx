import React from 'react';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';

const SHIFT_STATS = [
  { label: 'Active Shifts',   value: '0', icon: AccessTimeOutlinedIcon, color: '#2E7D4F' },
  { label: 'Clocked In',      value: '0', icon: PeopleOutlinedIcon,     color: '#0277BD' },
  { label: 'Shifts Today',    value: '0', icon: TodayOutlinedIcon,       color: '#B26A00' },
  { label: 'Closed Shifts',   value: '0', icon: CheckCircleOutlineIcon, color: '#6B5B57' },
];

export default function ManagerShiftPage() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>

      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2, margin: 0 }}>
          Manager Portal
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B1D1A', margin: '2px 0 0', letterSpacing: '-0.2px' }}>
          Shift Management
        </h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {SHIFT_STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: '#ffffff', border: '1px solid #DDD2CC',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: '#F5F0EC',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon sx={{ fontSize: 22, color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px', lineHeight: 1 }}>
                {value}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Employee shift list placeholder */}
      <div style={{
        background: '#ffffff', border: '1px solid #DDD2CC',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          background: '#F3EDE9', borderBottom: '1px solid #DDD2CC',
          padding: '10px 16px',
          display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
          gap: 8,
        }}>
          {['Employee', 'Clock In', 'Clock Out', 'Status'].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#3E2723', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>

        {/* Empty state */}
        <div style={{
          padding: '48px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#F5F0EC',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PeopleOutlinedIcon sx={{ fontSize: 26, color: '#3E2723' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#2B1D1A', margin: 0 }}>No active shifts</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#6B5B57', margin: 0, maxWidth: 260, lineHeight: '20px' }}>
            Employee shift activity will appear here once staff clock in for the day.
          </p>
        </div>
      </div>

    </div>
  );
}
