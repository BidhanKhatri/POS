import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import PointOfSaleIcon               from '@mui/icons-material/PointOfSale';
import AccessTimeOutlinedIcon        from '@mui/icons-material/AccessTimeOutlined';
import GridViewOutlinedIcon          from '@mui/icons-material/GridViewOutlined';
import ReceiptLongOutlinedIcon       from '@mui/icons-material/ReceiptLongOutlined';
import Inventory2OutlinedIcon        from '@mui/icons-material/Inventory2Outlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SettingsOutlinedIcon          from '@mui/icons-material/SettingsOutlined';
import PersonOutlineOutlinedIcon     from '@mui/icons-material/PersonOutlineOutlined';
import PeopleOutlinedIcon            from '@mui/icons-material/PeopleOutlined';
import QrCodeScannerOutlinedIcon     from '@mui/icons-material/QrCodeScannerOutlined';
import LogoutOutlinedIcon            from '@mui/icons-material/LogoutOutlined';
import MenuIcon                      from '@mui/icons-material/Menu';
import CloseIcon                     from '@mui/icons-material/Close';
import useAuthStore from '../store/useAuthStore';

// ── Mobile bottom nav (primary 3 tabs) ────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Terminal',     path: '/employee/terminal',     icon: PointOfSaleIcon          },
  { label: 'Transactions', path: '/employee/transactions', icon: ReceiptLongOutlinedIcon  },
  { label: 'Dashboard',    path: '/employee/dashboard',    icon: GridViewOutlinedIcon     },
];

// ── Mobile right-side drawer ───────────────────────────────────────────────────
const MENU_ITEMS = [
  { label: 'Shift',             path: '/employee/shift',     icon: AccessTimeOutlinedIcon          },
  { label: 'Inventory',         path: '/employee/inventory', icon: Inventory2OutlinedIcon          },
  { label: 'Customers',         path: '/employee/customers', icon: PeopleOutlinedIcon              },
  { label: 'Barcode',           path: '/employee/barcode',   icon: QrCodeScannerOutlinedIcon       },
  { label: 'Overrides Request', path: '/employee/overrides', icon: AdminPanelSettingsOutlinedIcon  },
  { label: 'Settings',          path: '/employee/settings',  icon: SettingsOutlinedIcon            },
  { label: 'Profile',           path: '/employee/profile',   icon: PersonOutlineOutlinedIcon       },
];

// ── Desktop sidebar — all routes organised into sections ───────────────────────
const SIDEBAR_SECTIONS = [
  {
    label: 'POS',
    items: [
      { label: 'Terminal',     path: '/employee/terminal',     icon: PointOfSaleIcon          },
      { label: 'Transactions', path: '/employee/transactions', icon: ReceiptLongOutlinedIcon  },
      { label: 'Dashboard',    path: '/employee/dashboard',    icon: GridViewOutlinedIcon     },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Shift',             path: '/employee/shift',     icon: AccessTimeOutlinedIcon          },
      { label: 'Inventory',         path: '/employee/inventory', icon: Inventory2OutlinedIcon          },
      { label: 'Customers',         path: '/employee/customers', icon: PeopleOutlinedIcon              },
      { label: 'Barcode',           path: '/employee/barcode',   icon: QrCodeScannerOutlinedIcon       },
      { label: 'Overrides Request', path: '/employee/overrides', icon: AdminPanelSettingsOutlinedIcon  },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', path: '/employee/settings', icon: SettingsOutlinedIcon      },
      { label: 'Profile',  path: '/employee/profile',  icon: PersonOutlineOutlinedIcon },
    ],
  },
];

const SIDEBAR_W = 232;

export default function EmployeeLayout() {
  const navigate    = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width:1024px)');

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  // ── Helpers shared between both layouts ──────────────────────────────────────
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  const isMenuRoute = MENU_ITEMS.some(({ path }) => isActive(path));
  const activeNavPath = NAV_ITEMS.find(({ path }) => isActive(path))?.path;
  const activeIndex   = NAV_ITEMS.findIndex(({ path }) => path === activeNavPath);
  const totalSlots    = NAV_ITEMS.length + 1;

  // ── Desktop: sidebar layout ──────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100dvh',
        background: '#F5F3F1',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* ── Left sidebar ── */}
        <aside style={{
          width: SIDEBAR_W,
          minWidth: SIDEBAR_W,
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          background: '#ffffff',
          borderRight: '1px solid #ECE6E1',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
        }}>

          {/* Brand */}
          <div style={{ padding: '24px 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: '#3E2723',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#D4A373', letterSpacing: '-0.5px' }}>E</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2B1D1A', lineHeight: '17px' }}>Employee</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.04em' }}>Portal</p>
              </div>
            </div>
          </div>

          {/* Sectioned nav */}
          <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
            {SIDEBAR_SECTIONS.map(({ label: sectionLabel, items }) => (
              <div key={sectionLabel} style={{ marginBottom: 6 }}>
                <p style={{
                  margin: '10px 0 4px 4px',
                  fontSize: 9, fontWeight: 700, color: '#C0B5B0',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>
                  {sectionLabel}
                </p>
                {items.map(({ label, path, icon: Icon }) => {
                  const active = isActive(path);
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      style={{
                        width: '100%',
                        position: 'relative',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        marginBottom: 2,
                        borderRadius: 10,
                        border: 'none',
                        background: active ? '#F2EBE5' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                    >
                      <Icon sx={{
                        fontSize: 18,
                        color: active ? '#3E2723' : '#B0A49F',
                        transition: 'color 0.15s',
                      }} />
                      <span style={{
                        fontSize: 13,
                        fontWeight: active ? 700 : 500,
                        color: active ? '#2B1D1A' : '#7A6E6A',
                        letterSpacing: '0.01em',
                        transition: 'color 0.15s',
                      }}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User card + clock-out */}
          <div style={{
            padding: '14px 16px 20px',
            borderTop: '1px solid #ECE6E1',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 10px',
              borderRadius: 10,
              background: '#F9F6F3',
              marginBottom: 8,
            }}>
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.name}
                  style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: '#3E2723',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 13, fontWeight: 700, color: '#D4A373',
                }}>
                  {(user?.name || 'E').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <p style={{
                  margin: 0, fontSize: 12, fontWeight: 700, color: '#2B1D1A',
                  lineHeight: '16px', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user?.name || 'Employee'}
                </p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.03em' }}>
                  {user?.employeeCode}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8,
                background: 'transparent',
                border: '1px solid #DDD5D0',
                color: '#8C7E7A',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
                transition: 'background 0.15s',
              }}
            >
              <LogoutOutlinedIcon sx={{ fontSize: 14, color: '#A09490' }} />
              Clock Out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{
          flex: 1,
          marginLeft: SIDEBAR_W,
          minHeight: '100dvh',
          overflowY: 'auto',
        }}>
          <Outlet />
        </main>
      </div>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────────
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
                width: 32, height: 32, borderRadius: 8, objectFit: 'cover',
                flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.20)',
              }}
            />
          ) : (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: 14, fontWeight: 700, color: '#fff',
            }}>
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
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 7,
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.16)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
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
        {activeIndex >= 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: `${(activeIndex / totalSlots) * 100}%`,
              width: `${100 / totalSlots}%`,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <span style={{
              width: 48, height: 3,
              borderRadius: '0 0 4px 4px',
              background: '#3E2723',
            }} />
          </span>
        )}

        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = isActive(path);
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

        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 4, background: 'none', border: 'none',
            cursor: 'pointer', padding: '8px 0 6px',
          }}
        >
          <MenuIcon sx={{ fontSize: 28, color: isMenuRoute ? '#3E2723' : '#A09490', transition: 'color 0.2s' }} />
          <span style={{
            fontSize: 11,
            fontWeight: isMenuRoute ? 700 : 500,
            color: isMenuRoute ? '#3E2723' : '#A09490',
            letterSpacing: '0.02em', lineHeight: '14px',
            transition: 'color 0.2s',
          }}>
            Menu
          </span>
        </button>
      </nav>

      {/* ── Backdrop ── */}
      <div
        onClick={() => setMenuOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(43,29,26,0.32)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* ── Right-side menu drawer ── */}
      <aside
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(70vw, 300px)',
          background: '#ffffff',
          zIndex: 201,
          boxShadow: '-8px 0 28px rgba(42,23,21,0.18)',
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 16px', borderBottom: '1px solid #DDD2CC',
        }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#2B1D1A' }}>Menu</p>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 9,
              border: '1px solid #DDD2CC', background: '#F5F0EC',
              color: '#3E2723', cursor: 'pointer',
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Drawer nav items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 0', overflowY: 'auto' }}>
          {MENU_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => goTo(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 18px',
                  background: active ? '#F5F0EC' : 'transparent',
                  borderLeft: active ? '3px solid #3E2723' : '3px solid transparent',
                  border: 'none',
                  borderLeftWidth: 3,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <Icon sx={{ fontSize: 20, color: active ? '#3E2723' : '#6B5B57' }} />
                <span style={{ fontSize: 14, fontWeight: active ? 700 : 600, color: active ? '#3E2723' : '#2B1D1A' }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
