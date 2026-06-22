import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import GridViewOutlinedIcon              from '@mui/icons-material/GridViewOutlined';
import Inventory2OutlinedIcon            from '@mui/icons-material/Inventory2Outlined';
import AdminPanelSettingsOutlinedIcon    from '@mui/icons-material/AdminPanelSettingsOutlined';
import BarChartOutlinedIcon              from '@mui/icons-material/BarChartOutlined';
import ReceiptLongOutlinedIcon           from '@mui/icons-material/ReceiptLongOutlined';
import LogoutOutlinedIcon                from '@mui/icons-material/LogoutOutlined';
import ExpandMoreIcon                    from '@mui/icons-material/ExpandMore';
import AssessmentOutlinedIcon            from '@mui/icons-material/AssessmentOutlined';
import PersonOutlinedIcon                from '@mui/icons-material/PersonOutlined';
import GroupsOutlinedIcon                from '@mui/icons-material/GroupsOutlined';
import PeopleOutlinedIcon                from '@mui/icons-material/PeopleOutlined';
import QrCodeScannerOutlinedIcon         from '@mui/icons-material/QrCodeScannerOutlined';
import MenuIcon                          from '@mui/icons-material/Menu';
import CloseIcon                         from '@mui/icons-material/Close';
import useAuthStore from '../store/useAuthStore';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/manager/dashboard', icon: GridViewOutlinedIcon           },
  {
    label: 'Reports', path: '/manager/reports/overall', icon: BarChartOutlinedIcon,
    children: [
      { label: 'Overall Reports',    path: '/manager/reports/overall',     icon: AssessmentOutlinedIcon },
      { label: 'Individual Reports', path: '/manager/reports/individual',  icon: PersonOutlinedIcon     },
      { label: 'Group Reports',      path: '/manager/reports/group',       icon: GroupsOutlinedIcon     },
    ],
  },
  { label: 'Transactions', path: '/manager/transactions', icon: ReceiptLongOutlinedIcon      },
  { label: 'Overrides',   path: '/manager/overrides',   icon: AdminPanelSettingsOutlinedIcon },
  { label: 'Customers',  path: '/manager/customers',   icon: PeopleOutlinedIcon              },
  { label: 'Inventory',  path: '/manager/inventory',   icon: Inventory2OutlinedIcon          },
  { label: 'Barcodes',  path: '/manager/barcodes',    icon: QrCodeScannerOutlinedIcon       },
];

// Mobile bottom bar — only the 3 most-used destinations
const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard',     path: '/manager/dashboard',         icon: GridViewOutlinedIcon      },
  { label: 'Reports',       path: '/manager/reports/overall',   icon: BarChartOutlinedIcon      },
  { label: 'Transactions',  path: '/manager/transactions',      icon: ReceiptLongOutlinedIcon   },
];

// Mobile right-side drawer — everything else
const MOBILE_MENU_ITEMS = [
  { label: 'Overrides',  path: '/manager/overrides',  icon: AdminPanelSettingsOutlinedIcon },
  { label: 'Customers',  path: '/manager/customers',  icon: PeopleOutlinedIcon             },
  { label: 'Inventory',  path: '/manager/inventory',  icon: Inventory2OutlinedIcon         },
  { label: 'Barcodes',   path: '/manager/barcodes',   icon: QrCodeScannerOutlinedIcon      },
];

const SIDEBAR_W = 232;

export default function ManagerLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const isDesktop = useMediaQuery('(min-width:1024px)');

  const reportsActive = pathname.startsWith('/manager/reports');
  const [reportsOpen, setReportsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  /* keep submenu open when navigating into a reports sub-path */
  useEffect(() => {
    if (reportsActive) setReportsOpen(true);
  }, [reportsActive]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const activeIndex = MOBILE_NAV_ITEMS.findIndex(
    ({ path }) => pathname === path || pathname.startsWith(path + '/')
  );

  const isMenuRoute = MOBILE_MENU_ITEMS.some(
    ({ path }) => pathname === path || pathname.startsWith(path + '/')
  );

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  /* ── Desktop: sidebar layout ── */
  if (isDesktop) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100dvh',
        background: '#F5F3F1',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Sidebar */}
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
                <span style={{ fontSize: 14, fontWeight: 800, color: '#D4A373', letterSpacing: '-0.5px' }}>M</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2B1D1A', lineHeight: '17px' }}>Manager</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.04em' }}>Portal</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
            <p style={{ margin: '0 0 6px 4px', fontSize: 9, fontWeight: 700, color: '#C0B5B0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Navigation
            </p>
            {NAV_ITEMS.map(({ label, path, icon: Icon, children }) => {
              const active = pathname === path || pathname.startsWith(path + '/');
              const hasChildren = Boolean(children?.length);

              if (hasChildren) {
                return (
                  <div key={path} style={{ marginBottom: 2 }}>
                    {/* Toggle button */}
                    <button
                      onClick={() => setReportsOpen(o => !o)}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: active ? '#F2EBE5' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                    >
                      <Icon sx={{ fontSize: 18, color: active ? '#3E2723' : '#B0A49F', transition: 'color 0.15s' }} />
                      <span style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: active ? 700 : 500,
                        color: active ? '#2B1D1A' : '#7A6E6A',
                        letterSpacing: '0.01em',
                        transition: 'color 0.15s',
                      }}>
                        {label}
                      </span>
                      <ExpandMoreIcon sx={{
                        fontSize: 16,
                        color: active ? '#3E2723' : '#B0A49F',
                        transform: reportsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), color 0.15s',
                      }} />
                    </button>

                    {/* Submenu with smooth height animation */}
                    <div style={{
                      overflow: 'hidden',
                      maxHeight: reportsOpen ? `${children.length * 44}px` : '0px',
                      transition: 'max-height 0.28s cubic-bezier(0.4,0,0.2,1)',
                    }}>
                      {/* Vertical guide line + sub-items */}
                      <div style={{ display: 'flex', paddingLeft: 20, paddingTop: 2, paddingBottom: 4 }}>
                        {/* Left vertical line */}
                        <div style={{
                          width: 1,
                          borderRadius: 2,
                          background: '#E2D5CC',
                          flexShrink: 0,
                          marginRight: 12,
                          marginLeft: 8,
                        }} />
                        <div style={{ flex: 1 }}>
                          {children.map(({ label: childLabel, path: childPath, icon: ChildIcon }) => {
                            const childActive = pathname === childPath || pathname.startsWith(childPath + '/');
                            return (
                              <button
                                key={childPath}
                                onClick={() => navigate(childPath)}
                                style={{
                                  width: '100%',
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '9px 10px',
                                  marginBottom: 1,
                                  borderRadius: 8,
                                  border: 'none',
                                  background: childActive ? '#F2EBE5' : 'transparent',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'background 0.15s',
                                }}
                              >
                                <ChildIcon sx={{
                                  fontSize: 15,
                                  color: childActive ? '#3E2723' : '#B0A49F',
                                  flexShrink: 0,
                                  transition: 'color 0.15s',
                                }} />
                                <span style={{
                                  fontSize: 12,
                                  fontWeight: childActive ? 700 : 500,
                                  color: childActive ? '#2B1D1A' : '#7A6E6A',
                                  letterSpacing: '0.01em',
                                  transition: 'color 0.15s',
                                }}>
                                  {childLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const active2 = pathname === path || pathname.startsWith(path + '/');
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    marginBottom: 2,
                    borderRadius: 10,
                    border: 'none',
                    background: active2 ? '#F2EBE5' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                >
                  <Icon sx={{
                    fontSize: 18,
                    color: active2 ? '#3E2723' : '#B0A49F',
                    transition: 'color 0.15s',
                  }} />
                  <span style={{
                    fontSize: 13,
                    fontWeight: active2 ? 700 : 500,
                    color: active2 ? '#2B1D1A' : '#7A6E6A',
                    letterSpacing: '0.01em',
                    transition: 'color 0.15s',
                  }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* User + logout */}
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
                  {(user?.name || 'M').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#2B1D1A', lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'Manager'}
                </p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.03em' }}>
                  {user?.employeeCode || 'Manager'}
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
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
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

  /* ── Mobile layout (unchanged) ── */
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
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: '17px', margin: 0 }}>
              {user?.name || 'Manager'}
            </p>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.50)', margin: 0, letterSpacing: '0.04em' }}>
              {user?.employeeCode}
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
        {/* Sliding active indicator — only on bottom-nav routes */}
        {activeIndex >= 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: `${(activeIndex / (MOBILE_NAV_ITEMS.length + 1)) * 100}%`,
              width: `${100 / (MOBILE_NAV_ITEMS.length + 1)}%`,
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
        )}

        {MOBILE_NAV_ITEMS.map(({ label, path, icon: Icon }) => {
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

        {/* Hamburger — opens right-side drawer */}
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
          position: 'fixed',
          inset: 0,
          zIndex: 200,
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
          padding: '18px 16px',
          borderBottom: '1px solid #DDD2CC',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#3E2723',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#D4A373' }}>M</span>
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#2B1D1A' }}>Menu</p>
          </div>
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

        {/* User card inside drawer */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #DDD2CC' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 10px', borderRadius: 10, background: '#F9F6F3',
          }}>
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={user.name}
                style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: 8, background: '#3E2723',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#D4A373',
              }}>
                {(user?.name || 'M').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#2B1D1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Manager'}
              </p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.03em' }}>
                {user?.employeeCode || 'Manager'}
              </p>
            </div>
          </div>
        </div>

        {/* Drawer nav items */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 0', overflowY: 'auto' }}>
          {MOBILE_MENU_ITEMS.map(({ label, path, icon: Icon }) => {
            const active = pathname === path || pathname.startsWith(path + '/');
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

        {/* Sign out at bottom of drawer */}
        <div style={{ padding: '12px 14px 24px', borderTop: '1px solid #DDD2CC' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 12px', borderRadius: 9,
              background: 'transparent',
              border: '1px solid #DDD5D0',
              color: '#8C7E7A',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            <LogoutOutlinedIcon sx={{ fontSize: 14, color: '#A09490' }} />
            Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}
