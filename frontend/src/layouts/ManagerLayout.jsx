import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import AccessTimeOutlinedIcon            from '@mui/icons-material/AccessTimeOutlined';
import GridViewOutlinedIcon              from '@mui/icons-material/GridViewOutlined';
import Inventory2OutlinedIcon            from '@mui/icons-material/Inventory2Outlined';
import AdminPanelSettingsOutlinedIcon    from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutOutlinedIcon                from '@mui/icons-material/LogoutOutlined';
import useAuthStore from '../store/useAuthStore';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/manager/dashboard', icon: GridViewOutlinedIcon           },
  { label: 'Shift',     path: '/manager/shift',     icon: AccessTimeOutlinedIcon          },
  { label: 'Overrides', path: '/manager/overrides', icon: AdminPanelSettingsOutlinedIcon  },
  { label: 'Inventory', path: '/manager/inventory', icon: Inventory2OutlinedIcon          },
];

export default function ManagerLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const activeIndex = NAV_ITEMS.findIndex(
    ({ path }) => pathname === path || pathname.startsWith(path + '/')
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: '#F5F3F1',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ── Top header ── */}
      <header
        style={{
          background: 'linear-gradient(135deg, #2A1715 0%, #3E2723 100%)',
          borderBottom: '1px solid #1f100e',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.name}
              style={{
                width: 32, height: 32, borderRadius: 8, objectFit: 'cover',
                flexShrink: 0, border: '1.5px solid rgba(212,163,115,0.35)',
              }}
            />
          ) : (
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(212,163,115,0.18)',
                border: '1.5px solid rgba(212,163,115,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14, fontWeight: 700, color: '#D4A373',
              }}
            >
              {(user?.name || 'M').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: '17px', margin: 0 }}>
                {user?.name || 'Manager'}
              </p>
              {/* Manager role badge */}
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(212,163,115,0.20)',
                border: '1px solid rgba(212,163,115,0.40)',
                color: '#D4A373',
                textTransform: 'uppercase',
              }}>
                MGR
              </span>
            </div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.50)', margin: 0, letterSpacing: '0.04em' }}>
              {user?.employeeCode} · Manager Portal
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 7,
            background: 'rgba(212,163,115,0.12)',
            border: '1px solid rgba(212,163,115,0.25)',
            color: 'rgba(255,255,255,0.80)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
          }}
        >
          <LogoutOutlinedIcon sx={{ fontSize: 14 }} />
          LOG OUT
        </button>
      </header>

      {/* ── Page content ── */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 78 }}>
        <Outlet />
      </main>

      {/* ── Bottom navigation ── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 70,
          background: '#ffffff',
          borderTop: '1px solid #DDD2CC',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 100,
        }}
      >
        {/* Sliding active indicator */}
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: `${(activeIndex / NAV_ITEMS.length) * 100}%`,
            width: `${100 / NAV_ITEMS.length}%`,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <span
            style={{
              width: 48, height: 3,
              borderRadius: '0 0 4px 4px',
              background: '#D4A373',
            }}
          />
        </span>

        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = pathname === path || pathname.startsWith(path + '/');
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, background: 'none', border: 'none',
                cursor: 'pointer', padding: '8px 0 6px',
              }}
            >
              <Icon sx={{ fontSize: 28, color: active ? '#3E2723' : '#A09490', transition: 'color 0.2s' }} />
              <span style={{
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                color: active ? '#3E2723' : '#A09490',
                letterSpacing: '0.02em', lineHeight: '14px',
                transition: 'color 0.2s',
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
