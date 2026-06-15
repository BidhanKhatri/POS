import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import useAuthStore from '../store/useAuthStore';

const NAV_ITEMS = [
  { label: 'Terminal', path: '/employee/terminal', icon: PointOfSaleIcon },
  { label: 'Shift',    path: '/employee/shift',    icon: AccessTimeOutlinedIcon },
  { label: 'Dashboard',path: '/employee/dashboard',icon: GridViewOutlinedIcon },
  { label: 'Inventory',path: '/employee/inventory',icon: Inventory2OutlinedIcon },
];

export default function EmployeeLayout() {
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
          background: '#3E2723',
          borderBottom: '1px solid #2A1715',
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
                width: 32,
                height: 32,
                borderRadius: 8,
                objectFit: 'cover',
                flexShrink: 0,
                border: '1.5px solid rgba(255,255,255,0.20)',
              }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: 0,
              }}
            >
              {(user?.name || 'E').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: '17px', margin: 0 }}>
              {user?.name || 'Employee'}
            </p>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.55)', margin: 0, letterSpacing: '0.04em' }}>
              {user?.employeeCode}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 11px',
            borderRadius: 7,
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.16)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.04em',
          }}
        >
          <LogoutOutlinedIcon sx={{ fontSize: 14 }} />
          CLOCK OUT
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
          bottom: 0,
          left: 0,
          right: 0,
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
              width: 48,
              height: 3,
              borderRadius: '0 0 4px 4px',
              background: '#3E2723',
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 0 6px',
              }}
            >
              <Icon
                sx={{
                  fontSize: 28,
                  color: active ? '#3E2723' : '#A09490',
                  transition: 'color 0.2s',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#3E2723' : '#A09490',
                  letterSpacing: '0.02em',
                  lineHeight: '14px',
                  transition: 'color 0.2s',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
