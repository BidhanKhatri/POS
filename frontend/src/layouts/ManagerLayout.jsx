import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
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
import CalendarMonthOutlinedIcon         from '@mui/icons-material/CalendarMonthOutlined';
import ManageAccountsOutlinedIcon        from '@mui/icons-material/ManageAccountsOutlined';
import SettingsOutlinedIcon              from '@mui/icons-material/SettingsOutlined';
import MenuIcon                          from '@mui/icons-material/Menu';
import CloseIcon                         from '@mui/icons-material/Close';
import ChevronLeftIcon                   from '@mui/icons-material/ChevronLeft';
import useAuthStore from '../store/useAuthStore';

// ─── Navigation structure ─────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    group: 'Finance',
    items: [
      { label: 'Transactions', path: '/manager/transactions', icon: ReceiptLongOutlinedIcon      },
      {
        label: 'Reports', path: '/manager/reports/overall', icon: BarChartOutlinedIcon,
        children: [
          { label: 'Overall',    path: '/manager/reports/overall',    icon: AssessmentOutlinedIcon },
          { label: 'Individual', path: '/manager/reports/individual', icon: PersonOutlinedIcon     },
          { label: 'Group',      path: '/manager/reports/group',      icon: GroupsOutlinedIcon     },
        ],
      },
      { label: 'Overrides', path: '/manager/overrides', icon: AdminPanelSettingsOutlinedIcon },
    ],
  },
  {
    group: 'Accounts',
    items: [
      { label: 'Employees', path: '/manager/employee',  icon: ManageAccountsOutlinedIcon },
      { label: 'Customers', path: '/manager/customers', icon: PeopleOutlinedIcon         },
    ],
  },
  {
    group: 'Inventory',
    items: [
      { label: 'Inventory', path: '/manager/inventory', icon: Inventory2OutlinedIcon     },
      { label: 'Barcodes',  path: '/manager/barcodes',  icon: QrCodeScannerOutlinedIcon  },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Schedule', path: '/manager/scheduling', icon: CalendarMonthOutlinedIcon  },
      { label: 'Groups',   path: '/manager/groups',     icon: GroupsOutlinedIcon         },
    ],
  },
  {
    group: 'Administration',
    items: [
      { label: 'Settings', path: '/manager/settings', icon: SettingsOutlinedIcon         },
    ],
  },
];

// Mobile bottom bar — quick-access shortcuts
const MOBILE_NAV_ITEMS = [
  { label: 'Dashboard',    path: '/manager/dashboard',       icon: GridViewOutlinedIcon    },
  { label: 'Reports',      path: '/manager/reports/overall', icon: BarChartOutlinedIcon    },
  { label: 'Transactions', path: '/manager/transactions',    icon: ReceiptLongOutlinedIcon },
];

function findActiveGroup(pathname) {
  for (const { group, items } of NAV_GROUPS) {
    for (const item of items) {
      if (item.children) {
        if (item.children.some(c => pathname === c.path || pathname.startsWith(c.path + '/'))) return group;
      } else {
        if (pathname === item.path || pathname.startsWith(item.path + '/')) return group;
      }
    }
  }
  return null;
}

const SIDEBAR_EXPANDED  = 232;
const SIDEBAR_COLLAPSED = 64;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export default function ManagerLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const isDesktop = useMediaQuery('(min-width:1024px)');

  const { data: syncData } = useQuery({
    queryKey: ['settings-sync'],
    queryFn: () => fetch('/api/settings/sync-staffing', { headers: { Authorization: `Bearer ${useAuthStore.getState().token}` } }).then(r => r.ok ? r.json() : { syncStaffingBetit: false }),
    staleTime: 0,
    enabled: !!user,
  });
  const syncEnabled = syncData?.syncStaffingBetit ?? false;

  const SYNCED_PATHS = new Set(['/manager/reports/group', '/manager/employee', '/manager/groups', '/manager/scheduling']);

  const reportsActive = pathname.startsWith('/manager/reports');
  const [reportsOpen,  setReportsOpen]  = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const [openGroups, setOpenGroups] = useState(() => {
    const active = findActiveGroup(pathname);
    return active ? { [active]: true } : {};
  });

  const toggleGroup = (group) =>
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));

  useEffect(() => {
    if (reportsActive) setReportsOpen(true);
  }, [reportsActive]);

  // When collapsing, close the reports submenu
  useEffect(() => {
    if (collapsed) setReportsOpen(false);
  }, [collapsed]);

  useEffect(() => {
    const active = findActiveGroup(pathname);
    if (active) setOpenGroups(prev => ({ ...prev, [active]: true }));
  }, [pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const activeIndex = MOBILE_NAV_ITEMS.findIndex(
    ({ path }) => pathname === path || pathname.startsWith(path + '/')
  );

  const isMenuRoute = MOBILE_NAV_ITEMS.every(
    ({ path }) => pathname !== path && !pathname.startsWith(path + '/')
  ) && pathname !== '/manager/dashboard';

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  // ── Desktop sidebar ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <>
      <style>{`
        .mgr-nav-btn:hover:not(.mgr-nav-btn--active) { background: #F7F2EE !important; }
        .mgr-nav-btn:hover:not(.mgr-nav-btn--active) span { color: #3E2723 !important; }
        .mgr-nav-btn:hover:not(.mgr-nav-btn--active) .MuiSvgIcon-root { color: #3E2723 !important; }
        .mgr-sub-btn:hover:not(.mgr-sub-btn--active) { background: #F7F2EE !important; }
        .mgr-sub-btn:hover:not(.mgr-sub-btn--active) span { color: #3E2723 !important; }
        .mgr-sub-btn:hover:not(.mgr-sub-btn--active) .MuiSvgIcon-root { color: #3E2723 !important; }
        .mgr-logout-btn:hover { background: #F2EBE5 !important; border-color: #C4B5AE !important; color: #3E2723 !important; }
        .mgr-logout-btn:hover .MuiSvgIcon-root { color: #3E2723 !important; }
        .mgr-toggle-btn:hover { background: #F2EBE5 !important; border-color: #C4B5AE !important; }
        .mgr-toggle-btn:hover .MuiSvgIcon-root { color: #3E2723 !important; }
        .mgr-nav-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .mgr-nav-scroll::-webkit-scrollbar { display: none; }
        .mgr-label { transition: opacity 0.18s ${EASE}, transform 0.22s ${EASE}; }
      `}</style>
      <div style={{
        display: 'flex',
        minHeight: '100dvh',
        background: '#F5F3F1',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* ── Sidebar ── */}
        {/* overflow: visible so the toggle button can bleed past the right edge when collapsed */}
        <aside style={{
          width: sidebarW,
          minWidth: sidebarW,
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          transition: `width 0.3s ${EASE}, min-width 0.3s ${EASE}`,
        }}>

          {/* Inner content wrapper — clips the animating text/labels */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff', borderRight: '1px solid #ECE6E1' }}>

          {/* Brand */}
          <div style={{ padding: '18px 14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F0EAE5' }}>
            {/* M icon */}
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#3E2723', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#D4A373', letterSpacing: '-0.5px' }}>M</span>
            </div>
            {/* Manager Portal text — fades + shrinks when collapsed */}
            <div style={{ flex: 1, overflow: 'hidden', maxWidth: collapsed ? 0 : 200, opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? 'none' : 'auto', whiteSpace: 'nowrap', transition: `max-width 0.3s ${EASE}, opacity 0.18s ${EASE}` }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2B1D1A', lineHeight: '17px' }}>Manager</p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.04em' }}>Portal</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="mgr-nav-scroll" style={{ flex: 1, padding: collapsed ? '4px 8px' : '4px 12px', overflowY: 'auto', transition: `padding 0.3s ${EASE}` }}>

            {/* Dashboard */}
            {(() => {
              const active = pathname === '/manager/dashboard' || pathname.startsWith('/manager/dashboard/');
              return (
                <button
                  onClick={() => navigate('/manager/dashboard')}
                  title={collapsed ? 'Dashboard' : undefined}
                  className={`mgr-nav-btn${active ? ' mgr-nav-btn--active' : ''}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: collapsed ? '10px 0' : '10px 12px', marginBottom: 10, borderRadius: 10, border: 'none', background: active ? '#F2EBE5' : 'transparent', cursor: 'pointer', textAlign: 'left', justifyContent: collapsed ? 'center' : 'flex-start', transition: `padding 0.3s ${EASE}, gap 0.3s ${EASE}` }}
                >
                  <GridViewOutlinedIcon sx={{ fontSize: 18, color: active ? '#3E2723' : '#B0A49F', flexShrink: 0, transition: 'color 0.15s' }} />
                  <span className="mgr-label" style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#2B1D1A' : '#7A6E6A', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: collapsed ? 0 : 'none', opacity: collapsed ? 0 : 1, transform: collapsed ? 'translateX(-8px)' : 'translateX(0)', pointerEvents: collapsed ? 'none' : 'auto', transition: `max-width 0.3s ${EASE}, opacity 0.18s ${EASE}, transform 0.22s ${EASE}` }}>
                    Dashboard
                  </span>
                </button>
              );
            })()}

            {/* Grouped sections */}
            {NAV_GROUPS.map(({ group, items }, gi) => (
              <div key={group}>
                {/* Group divider / label */}
                {gi > 0 && (
                  <div style={{ height: 1, background: '#F0EAE5', margin: collapsed ? '8px 4px' : '10px 4px 8px', transition: `margin 0.3s ${EASE}` }} />
                )}
                <div className="mgr-label" style={{ margin: '0 0 4px 4px', height: 14, opacity: collapsed ? 0 : 1, transform: collapsed ? 'translateX(-8px)' : 'translateX(0)', pointerEvents: 'none', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#C0B5B0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{group}</p>
                </div>

                {items.map(({ label, path, icon: Icon, children }) => {
                  const hasChildren = Boolean(children?.length);
                  const active = hasChildren
                    ? children.some(c => pathname === c.path || pathname.startsWith(c.path + '/'))
                    : pathname === path || pathname.startsWith(path + '/');

                  if (hasChildren) {
                    return (
                      <div key={path} style={{ marginBottom: 2 }}>
                        <button
                          onClick={() => collapsed ? navigate(path) : setReportsOpen(o => !o)}
                          title={collapsed ? label : undefined}
                          className={`mgr-nav-btn${active ? ' mgr-nav-btn--active' : ''}`}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: collapsed ? '10px 0' : '10px 12px', borderRadius: 10, border: 'none', background: active ? '#F2EBE5' : 'transparent', cursor: 'pointer', textAlign: 'left', justifyContent: collapsed ? 'center' : 'flex-start', transition: `padding 0.3s ${EASE}, gap 0.3s ${EASE}` }}
                        >
                          <Icon sx={{ fontSize: 18, color: active ? '#3E2723' : '#B0A49F', flexShrink: 0, transition: 'color 0.15s' }} />
                          <span className="mgr-label" style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#2B1D1A' : '#7A6E6A', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: collapsed ? 0 : 'none', opacity: collapsed ? 0 : 1, transform: collapsed ? 'translateX(-8px)' : 'translateX(0)', pointerEvents: collapsed ? 'none' : 'auto', transition: `max-width 0.3s ${EASE}, opacity 0.18s ${EASE}, transform 0.22s ${EASE}` }}>
                            {label}
                          </span>
                          <ExpandMoreIcon className="mgr-label" sx={{ fontSize: 16, color: active ? '#3E2723' : '#B0A49F', transform: reportsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: `transform 0.25s ${EASE}, color 0.15s, opacity 0.18s`, opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 'none', overflow: 'hidden' }} />
                        </button>

                        {/* Sub-items — only in expanded mode */}
                        <div style={{ overflow: 'hidden', maxHeight: !collapsed && reportsOpen ? `${children.length * 44}px` : '0px', transition: `max-height 0.28s ${EASE}` }}>
                          <div style={{ display: 'flex', paddingLeft: 20, paddingTop: 2, paddingBottom: 4 }}>
                            <div style={{ width: 1, borderRadius: 2, background: '#E2D5CC', flexShrink: 0, marginRight: 12, marginLeft: 8 }} />
                            <div style={{ flex: 1 }}>
                              {children.map(({ label: childLabel, path: childPath, icon: ChildIcon }) => {
                                const childActive = pathname === childPath || pathname.startsWith(childPath + '/');
                                const showSync = syncEnabled && SYNCED_PATHS.has(childPath);
                                return (
                                  <button key={childPath} onClick={() => navigate(childPath)} className={`mgr-sub-btn${childActive ? ' mgr-sub-btn--active' : ''}`}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', marginBottom: 1, borderRadius: 8, border: 'none', background: childActive ? '#F2EBE5' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>
                                    <ChildIcon sx={{ fontSize: 15, color: childActive ? '#3E2723' : '#B0A49F', flexShrink: 0, transition: 'color 0.15s' }} />
                                    <span style={{ fontSize: 12, fontWeight: childActive ? 700 : 500, color: childActive ? '#2B1D1A' : '#7A6E6A', letterSpacing: '0.01em', transition: 'color 0.15s', flex: 1 }}>{childLabel}</span>
                                    {showSync && <span style={{ fontSize: 9, fontWeight: 700, color: '#2E7D4F', background: '#E8F5EE', border: '1px solid #C8E6C9', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', flexShrink: 0 }}>SYNCED</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const showSync = syncEnabled && SYNCED_PATHS.has(path);
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      title={collapsed ? label : undefined}
                      className={`mgr-nav-btn${active ? ' mgr-nav-btn--active' : ''}`}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, padding: collapsed ? '10px 0' : '10px 12px', marginBottom: 2, borderRadius: 10, border: 'none', background: active ? '#F2EBE5' : 'transparent', cursor: 'pointer', textAlign: 'left', justifyContent: collapsed ? 'center' : 'flex-start', transition: `padding 0.3s ${EASE}, gap 0.3s ${EASE}` }}
                    >
                      <Icon sx={{ fontSize: 18, color: active ? '#3E2723' : '#B0A49F', flexShrink: 0, transition: 'color 0.15s' }} />
                      <span className="mgr-label" style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#2B1D1A' : '#7A6E6A', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: collapsed ? 0 : 'none', opacity: collapsed ? 0 : 1, transform: collapsed ? 'translateX(-8px)' : 'translateX(0)', pointerEvents: collapsed ? 'none' : 'auto', transition: `max-width 0.3s ${EASE}, opacity 0.18s ${EASE}, transform 0.22s ${EASE}` }}>
                        {label}
                      </span>
                      {showSync && !collapsed && <span className="mgr-label" style={{ fontSize: 9, fontWeight: 700, color: '#2E7D4F', background: '#E8F5EE', border: '1px solid #C8E6C9', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', flexShrink: 0, opacity: collapsed ? 0 : 1, maxWidth: collapsed ? 0 : 'none', transition: `opacity 0.18s ${EASE}, max-width 0.3s ${EASE}` }}>SYNCED</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User + logout */}
          <div style={{ padding: collapsed ? '14px 8px 20px' : '14px 16px 20px', borderTop: '1px solid #ECE6E1', transition: `padding 0.3s ${EASE}` }}>
            {/* Avatar row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '8px 0' : '10px 10px', borderRadius: 10, background: '#F9F6F3', marginBottom: 8, justifyContent: collapsed ? 'center' : 'flex-start', transition: `padding 0.3s ${EASE}` }}>
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={user.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div title={collapsed ? (user?.name || 'Manager') : undefined} style={{ width: 32, height: 32, borderRadius: 8, background: '#3E2723', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#D4A373', cursor: collapsed ? 'default' : 'auto' }}>
                  {(user?.name || 'M').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="mgr-label" style={{ overflow: 'hidden', flex: 1, opacity: collapsed ? 0 : 1, transform: collapsed ? 'translateX(-8px)' : 'translateX(0)', pointerEvents: collapsed ? 'none' : 'auto', whiteSpace: 'nowrap' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#2B1D1A', lineHeight: '16px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Manager'}</p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.03em' }}>{user?.employeeCode || 'Manager'}</p>
              </div>
            </div>

            {/* Sign-out */}
            <button
              onClick={handleLogout}
              title={collapsed ? 'Sign out' : undefined}
              className="mgr-logout-btn"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: collapsed ? 0 : 6, padding: '8px 12px', borderRadius: 8, background: 'transparent', border: '1px solid #DDD5D0', color: '#8C7E7A', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em', transition: `gap 0.3s ${EASE}, background 0.15s, border-color 0.15s, color 0.15s` }}
            >
              <LogoutOutlinedIcon sx={{ fontSize: 14, color: '#A09490' }} />
              <span className="mgr-label" style={{ opacity: collapsed ? 0 : 1, transform: collapsed ? 'translateX(-8px)' : 'translateX(0)', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: collapsed ? 0 : 80, pointerEvents: collapsed ? 'none' : 'auto' }}>
                Sign out
              </span>
            </button>
          </div>

          </div>{/* end inner content wrapper */}

          {/* ── Toggle button — floats on right edge, 50% in / 50% out when collapsed ── */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="mgr-toggle-btn"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              position: 'absolute',
              top: 22,
              right: collapsed ? -13 : 12,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid #E2D5CC',
              boxShadow: '0 2px 8px rgba(62,39,35,0.13)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1,
              transition: `right 0.3s ${EASE}, background 0.15s, border-color 0.15s`,
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 15, color: '#A09490', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: `transform 0.3s ${EASE}, color 0.15s` }} />
          </button>

        </aside>

        {/* Main content */}
        <main style={{ flex: 1, marginLeft: sidebarW, minHeight: '100dvh', overflowY: 'auto', transition: `margin-left 0.3s ${EASE}` }}>
          <Outlet />
        </main>
      </div>
      </>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#F5F3F1', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Top header */}
      <header style={{ background: 'linear-gradient(135deg, #2A1715 0%, #3E2723 100%)', borderBottom: '1px solid #1f100e', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt={user.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(212,163,115,0.35)' }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(212,163,115,0.18)', border: '1.5px solid rgba(212,163,115,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: '#D4A373' }}>
              {(user?.name || 'M').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: '17px', margin: 0 }}>{user?.name || 'Manager'}</p>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.50)', margin: 0, letterSpacing: '0.04em' }}>{user?.employeeCode}</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, background: 'rgba(212,163,115,0.12)', border: '1px solid rgba(212,163,115,0.25)', color: 'rgba(255,255,255,0.80)', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }}>
          <LogoutOutlinedIcon sx={{ fontSize: 14 }} />
          LOG OUT
        </button>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 78 }}>
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 70, background: '#ffffff', borderTop: '1px solid #DDD2CC', display: 'flex', alignItems: 'stretch', zIndex: 100 }}>
        {activeIndex >= 0 && (
          <span style={{ position: 'absolute', top: 0, left: `${(activeIndex / (MOBILE_NAV_ITEMS.length + 1)) * 100}%`, width: `${100 / (MOBILE_NAV_ITEMS.length + 1)}%`, display: 'flex', justifyContent: 'center', pointerEvents: 'none', transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <span style={{ width: 48, height: 3, borderRadius: '0 0 4px 4px', background: '#D4A373' }} />
          </span>
        )}

        {MOBILE_NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = pathname === path || pathname.startsWith(path + '/');
          return (
            <button key={path} onClick={() => navigate(path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 6px' }}>
              <Icon sx={{ fontSize: 28, color: active ? '#3E2723' : '#A09490', transition: 'color 0.2s' }} />
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#3E2723' : '#A09490', letterSpacing: '0.02em', lineHeight: '14px', transition: 'color 0.2s' }}>{label}</span>
            </button>
          );
        })}

        <button onClick={() => setMenuOpen(true)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 6px' }}>
          <MenuIcon sx={{ fontSize: 28, color: isMenuRoute ? '#3E2723' : '#A09490', transition: 'color 0.2s' }} />
          <span style={{ fontSize: 11, fontWeight: isMenuRoute ? 700 : 500, color: isMenuRoute ? '#3E2723' : '#A09490', letterSpacing: '0.02em', lineHeight: '14px', transition: 'color 0.2s' }}>Menu</span>
        </button>
      </nav>

      {/* Backdrop */}
      <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(43,29,26,0.32)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? 'auto' : 'none', transition: 'opacity 0.3s ease' }} />

      {/* Right-side menu drawer */}
      <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(75vw, 300px)', background: '#ffffff', zIndex: 201, boxShadow: '-8px 0 28px rgba(42,23,21,0.18)', transform: menuOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)', display: 'flex', flexDirection: 'column' }}>

        {/* Drawer header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 16px', borderBottom: '1px solid #DDD2CC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#3E2723', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#D4A373' }}>M</span>
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#2B1D1A' }}>Menu</p>
          </div>
          <button onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, border: '1px solid #DDD2CC', background: '#F5F0EC', color: '#3E2723', cursor: 'pointer' }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* User card */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #DDD2CC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 10, background: '#F9F6F3' }}>
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={user.name} style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#3E2723', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#D4A373' }}>
                {(user?.name || 'M').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#2B1D1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Manager'}</p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.03em' }}>{user?.employeeCode || 'Manager'}</p>
            </div>
          </div>
        </div>

        {/* Grouped drawer nav */}
        <div className="mgr-nav-scroll" style={{ flex: 1, overflowY: 'auto', padding: '6px 0 8px' }}>

          {/* Dashboard shortcut */}
          {(() => {
            const active = pathname === '/manager/dashboard' || pathname.startsWith('/manager/dashboard/');
            return (
              <button onClick={() => goTo('/manager/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 18px', background: active ? '#F5F0EC' : 'transparent', borderLeft: `3px solid ${active ? '#3E2723' : 'transparent'}`, border: 'none', borderLeftWidth: 3, textAlign: 'left', cursor: 'pointer' }}>
                <GridViewOutlinedIcon sx={{ fontSize: 20, color: active ? '#3E2723' : '#6B5B57' }} />
                <span style={{ fontSize: 14, fontWeight: active ? 700 : 600, color: active ? '#3E2723' : '#2B1D1A' }}>Dashboard</span>
              </button>
            );
          })()}

          {/* Group sections */}
          {NAV_GROUPS.map(({ group, items }, gi) => {
            const groupIsOpen = openGroups[group] !== false;
            const groupHasActive = items.some(item =>
              item.children
                ? item.children.some(c => pathname === c.path || pathname.startsWith(c.path + '/'))
                : pathname === item.path || pathname.startsWith(item.path + '/')
            );

            return (
              <div key={group}>
                {gi === 0 && <div style={{ height: 1, background: '#F0EAE5', margin: '6px 14px' }} />}
                <button onClick={() => toggleGroup(group)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 18px 5px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: groupHasActive ? '#A07850' : '#C0B5B0', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{group}</span>
                  <ExpandMoreIcon sx={{ fontSize: 14, color: '#C0B5B0', transform: groupIsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)' }} />
                </button>

                <div style={{ overflow: 'hidden', maxHeight: groupIsOpen ? `${items.length * 52}px` : '0px', transition: 'max-height 0.26s cubic-bezier(0.4,0,0.2,1)' }}>
                  {items.map(({ label, path, icon: Icon, children }) => {
                    const hasChildren = Boolean(children?.length);
                    const active = hasChildren
                      ? children.some(c => pathname === c.path || pathname.startsWith(c.path + '/'))
                      : pathname === path || pathname.startsWith(path + '/');

                    if (hasChildren) {
                      return (
                        <div key={path}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px 4px', opacity: 0.65 }}>
                            <Icon sx={{ fontSize: 18, color: '#6B5B57' }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#4A3A36' }}>{label}</span>
                          </div>
                          {children.map(({ label: cl, path: cp, icon: CI }) => {
                            const ca = pathname === cp || pathname.startsWith(cp + '/');
                            const showSyncChild = syncEnabled && SYNCED_PATHS.has(cp);
                            return (
                              <button key={cp} onClick={() => goTo(cp)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 18px 10px 42px', background: ca ? '#F5F0EC' : 'transparent', borderLeft: `3px solid ${ca ? '#3E2723' : 'transparent'}`, border: 'none', borderLeftWidth: 3, textAlign: 'left', cursor: 'pointer' }}>
                                <CI sx={{ fontSize: 17, color: ca ? '#3E2723' : '#6B5B57' }} />
                                <span style={{ fontSize: 13, fontWeight: ca ? 700 : 500, color: ca ? '#3E2723' : '#2B1D1A', flex: 1 }}>{cl}</span>
                                {showSyncChild && <span style={{ fontSize: 9, fontWeight: 700, color: '#2E7D4F', background: '#E8F5EE', border: '1px solid #C8E6C9', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', flexShrink: 0, marginRight: 4 }}>SYNCED</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    }

                    const showSyncItem = syncEnabled && SYNCED_PATHS.has(path);
                    return (
                      <button key={path} onClick={() => goTo(path)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 18px', background: active ? '#F5F0EC' : 'transparent', borderLeft: `3px solid ${active ? '#3E2723' : 'transparent'}`, border: 'none', borderLeftWidth: 3, textAlign: 'left', cursor: 'pointer' }}>
                        <Icon sx={{ fontSize: 20, color: active ? '#3E2723' : '#6B5B57' }} />
                        <span style={{ fontSize: 14, fontWeight: active ? 700 : 600, color: active ? '#3E2723' : '#2B1D1A', flex: 1 }}>{label}</span>
                        {showSyncItem && <span style={{ fontSize: 9, fontWeight: 700, color: '#2E7D4F', background: '#E8F5EE', border: '1px solid #C8E6C9', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.05em', flexShrink: 0, marginRight: 4 }}>SYNCED</span>}
                      </button>
                    );
                  })}
                  {gi < NAV_GROUPS.length - 1 && <div style={{ height: 1, background: '#F0EAE5', margin: '4px 14px 2px' }} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sign out */}
        <div style={{ padding: '12px 14px 24px', borderTop: '1px solid #DDD2CC' }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 9, background: 'transparent', border: '1px solid #DDD5D0', color: '#8C7E7A', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }}>
            <LogoutOutlinedIcon sx={{ fontSize: 14, color: '#A09490' }} />
            Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}
