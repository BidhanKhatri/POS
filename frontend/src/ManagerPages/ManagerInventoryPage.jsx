import React from 'react';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import SyncAltIcon from '@mui/icons-material/CompareArrowsOutlined';

const INV_STATS = [
  { label: 'Total Products', value: '9',  color: '#2B1D1A' },
  { label: 'Low Stock',      value: '0',  color: '#B26A00' },
  { label: 'Out of Stock',   value: '0',  color: '#B71C1C' },
];

const ACTIONS = [
  { label: 'Stock In',        sub: 'Record incoming inventory',  icon: AddCircleOutlineIcon,    color: '#2E7D4F' },
  { label: 'Stock Out',       sub: 'Record outgoing inventory',  icon: RemoveCircleOutlineIcon, color: '#B71C1C' },
  { label: 'Adjust Stock',    sub: 'Manual count correction',    icon: SyncAltIcon,             color: '#0277BD' },
];

export default function ManagerInventoryPage() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto' }}>

      {/* Page title */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>
          Manager Portal
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B1D1A', margin: 0, letterSpacing: '-0.2px' }}>
          Inventory
        </h1>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {INV_STATS.map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#ffffff', border: '1px solid #DDD2CC',
            borderRadius: 12, padding: '14px 12px',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#A09490', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {label}
            </p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.3px', lineHeight: 1 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <p style={{ fontSize: 11, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Actions
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {ACTIONS.map(({ label, sub, icon: Icon, color }) => (
          <button key={label} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#ffffff', border: '1px solid #DDD2CC',
            borderRadius: 12, padding: '14px 16px',
            cursor: 'pointer', textAlign: 'left', width: '100%',
            boxShadow: '0 1px 0 #e8e0db',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: '#F5F0EC',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon sx={{ fontSize: 22, color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2B1D1A' }}>{label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: '#6B5B57' }}>{sub}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 20, color: '#C4B5B0', fontWeight: 300 }}>›</span>
          </button>
        ))}
      </div>

      {/* Product list placeholder */}
      <div style={{
        background: '#ffffff', border: '1px solid #DDD2CC',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          background: '#F3EDE9', borderBottom: '1px solid #DDD2CC',
          padding: '10px 16px',
          display: 'grid', gridTemplateColumns: '1fr 64px 80px',
          gap: 8,
        }}>
          {['Product', 'Stock', 'Status'].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#3E2723', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>
        <div style={{
          padding: '40px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#F5F0EC',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Inventory2OutlinedIcon sx={{ fontSize: 26, color: '#3E2723' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#2B1D1A', margin: 0 }}>No products configured</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#6B5B57', margin: 0, maxWidth: 260, lineHeight: '20px' }}>
            Products and stock levels will appear here once the catalogue is set up.
          </p>
        </div>
      </div>

    </div>
  );
}
