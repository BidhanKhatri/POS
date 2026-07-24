import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from '../context/SocketContext';
import { EVENTS } from '../socket/events';
import PointOfSaleIcon               from '@mui/icons-material/PointOfSale';
import AccessTimeOutlinedIcon        from '@mui/icons-material/AccessTimeOutlined';
import GridViewOutlinedIcon          from '@mui/icons-material/GridViewOutlined';
import ReceiptLongOutlinedIcon       from '@mui/icons-material/ReceiptLongOutlined';
import Inventory2OutlinedIcon        from '@mui/icons-material/Inventory2Outlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SettingsOutlinedIcon          from '@mui/icons-material/SettingsOutlined';
import PersonOutlineOutlinedIcon     from '@mui/icons-material/PersonOutlineOutlined';
// import QrCodeScannerOutlinedIcon     from '@mui/icons-material/QrCodeScannerOutlined'; // disabled for now — re-enable when barcode feature returns
import LogoutOutlinedIcon            from '@mui/icons-material/LogoutOutlined';
import LoginOutlinedIcon             from '@mui/icons-material/LoginOutlined';
import WarningAmberOutlinedIcon      from '@mui/icons-material/WarningAmberOutlined';
import MenuIcon                      from '@mui/icons-material/Menu';
import CloseIcon                     from '@mui/icons-material/Close';
import useAuthStore from '../store/useAuthStore';
import { useLoading } from '../context/LoadingContext';
import SessionMonitor from '../components/SessionLock/SessionMonitor';
import BiometricPromptModal from '../components/BiometricSetup/BiometricPromptModal';
import WorkTimer from '../components/WorkTimer';
import { localYMD } from '../utils/timezone';

// ── Mobile bottom nav (primary 3 tabs) ────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Terminal',  path: '/employee/terminal',  icon: PointOfSaleIcon         },
  { label: 'Schedule',  path: '/employee/shift',     icon: AccessTimeOutlinedIcon  },
  { label: 'Dashboard', path: '/employee/dashboard', icon: GridViewOutlinedIcon    },
];

// ── Mobile right-side drawer — grouped to match desktop sidebar ────────────────
const MENU_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { label: 'Transactions',      path: '/employee/transactions', icon: ReceiptLongOutlinedIcon         },
      { label: 'Inventory',         path: '/employee/inventory',    icon: Inventory2OutlinedIcon          },
      // { label: 'Barcode',           path: '/employee/barcode',      icon: QrCodeScannerOutlinedIcon       }, // disabled for now — re-enable when barcode feature returns
      { label: 'Overrides Request', path: '/employee/overrides',    icon: AdminPanelSettingsOutlinedIcon  },
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

// flat list used only for isMenuRoute detection
const MENU_ITEMS = MENU_SECTIONS.flatMap((s) => s.items);

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
      // { label: 'Barcode',           path: '/employee/barcode',   icon: QrCodeScannerOutlinedIcon       }, // disabled for now — re-enable when barcode feature returns
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

import { API_URL as API } from '../config/api';
const LOGO_CACHE_KEY = 'pos-store-logo-url';

export default function EmployeeLayout() {
  const navigate    = useNavigate();
  const { pathname } = useLocation();
  const { user, logout, token } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(57);
  const headerRef = useRef(null);
  const drawerRef = useRef(null);
  const isDesktop = useMediaQuery('(min-width:1024px)');
  const { stopLoading } = useLoading();
  const qc = useQueryClient();

  const { data: logoData } = useQuery({
    queryKey: ['settings-logo'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/settings/logo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? res.json() : null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });
  const storeLogo = logoData?.data?.url ?? localStorage.getItem(LOGO_CACHE_KEY) ?? null;

  const { data: storeNameData } = useQuery({
    queryKey: ['settings-store-name'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/settings/store-name`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? res.json() : { storeName: '' };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });
  const storeName = storeNameData?.storeName?.trim() || 'POS';

  const ROLE_SHORT = { Admin: 'Admin', Manager: 'Manager', Employee: 'EMP' };
  const roleLabel = ROLE_SHORT[user?.role] || 'EMP';

  // Safety net: dismiss the splash at most 1.2s after any navigation
  useEffect(() => {
    const t = setTimeout(stopLoading, 1200);
    return () => clearTimeout(t);
  }, [pathname, stopLoading]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    // ResizeObserver's contentRect excludes padding — but the header's
    // safe-area padding-top (env(safe-area-inset-top), added in standalone
    // PWA mode for the notch/status bar) is real height that the drawer
    // needs to sit below. Read the actual border-box height instead so the
    // drawer's top offset is never short, which was hiding its own "Menu"
    // title/close button under the header on notched devices.
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lock body scroll when drawer is open. `overflow:hidden` alone doesn't
  // reliably block touch/rubber-band scrolling on mobile Safari, but pinning
  // the body with `position:fixed` (the previous approach here) has its own
  // real-device bug: toggling it can trigger iOS's PWA toolbar/viewport to
  // resize, which reflows the fixed bottom nav and leaves a gap at the
  // bottom safe-area. Instead, block background touch-scroll directly via a
  // `touchmove` listener on `document`, letting anything inside the drawer
  // itself (which has `ref={drawerRef}`) scroll normally — no position/top/
  // layout changes on `body` at all, so nothing can reflow or shift.
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    // Belt-and-suspenders alongside the CSS `overscrollBehavior: 'contain'`
    // on the drawer's own scroll container: without this, dragging the
    // drawer's internal list past its own scroll limit can chain the
    // gesture up to the document, triggering iOS's elastic rubber-band
    // bounce on the (sticky) header — which visually "stretches" away from
    // the drawer since the drawer itself is `position:fixed` and unaffected.
    document.documentElement.style.overscrollBehavior = 'none';
    const preventBackgroundTouch = (e) => {
      if (drawerRef.current && drawerRef.current.contains(e.target)) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventBackgroundTouch, { passive: false });
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.removeEventListener('touchmove', preventBackgroundTouch);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setLogoutModalOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  // ── Header shift badge ────────────────────────────────────────────────────────
  // Local calendar date, NOT toISOString()'s UTC date — using UTC here made
  // "today" wrong for any employee timezone offset enough to already be a
  // different calendar day in UTC (e.g. still "yesterday" in UTC just after
  // local midnight ahead of UTC, or already "tomorrow" in UTC while still
  // evening behind UTC), which meant a correctly-scheduled shift for the
  // employee's real local day could go undetected.
  const todayYMD     = localYMD();
  const yesterdayYMD = localYMD(new Date(Date.now() - 86400000));

  const { data: _activeShiftData } = useQuery({
    queryKey: ['emp-layout-active-shift'],
    queryFn: () => fetch(`${API}/api/shifts/active`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: !!token,
  });

  // Fetch yesterday + today so overnight shifts spanning midnight are detectable
  const { data: _todaySchedData } = useQuery({
    queryKey: ['emp-layout-today-sched', todayYMD],
    queryFn: () => fetch(`${API}/api/staffing/my-schedule?startDate=${yesterdayYMD}&endDate=${todayYMD}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    staleTime: 5 * 60_000,
    refetchInterval: 60_000,
    enabled: !!token,
  });

  // EMS attendance sync — invalidate instantly instead of waiting up to the
  // 30s/60s refetchInterval above.
  useSocketEvent(EVENTS.EMS_CLOCK_IN, () => {
    qc.invalidateQueries({ queryKey: ['emp-layout-active-shift'] });
    qc.invalidateQueries({ queryKey: ['emp-layout-today-sched'] });
  });
  useSocketEvent(EVENTS.EMS_CLOCK_OUT, () => {
    qc.invalidateQueries({ queryKey: ['emp-layout-active-shift'] });
    qc.invalidateQueries({ queryKey: ['emp-layout-today-sched'] });
  });

  const _hdrShift          = _activeShiftData?.data ?? null;
  const _hdrSchedulesToday = (_todaySchedData?.data ?? []).filter(s => s.date === todayYMD);
  const _hdrSchedulesYest  = (_todaySchedData?.data ?? []).filter(s => s.date === yesterdayYMD);

  const _isStale = (() => {
    if (!_hdrShift?.clockInTime) return false;
    const clockInDate = new Date(_hdrShift.clockInTime);
    const now = new Date();
    const clockedInToday = (
      clockInDate.getFullYear() === now.getFullYear() &&
      clockInDate.getMonth()    === now.getMonth()    &&
      clockInDate.getDate()     === now.getDate()
    );
    if (clockedInToday) return false;
    // Check if we are still within an overnight scheduled window
    if (_hdrShift.scheduledEnd) {
      const [h, m] = _hdrShift.scheduledEnd.split(':').map(Number);
      const endDT = new Date(clockInDate.getFullYear(), clockInDate.getMonth(), clockInDate.getDate(), h, m, 0, 0);
      const clockInHHmm = clockInDate.getHours() * 60 + clockInDate.getMinutes();
      if (h * 60 + m <= clockInHHmm) endDT.setDate(endDT.getDate() + 1); // overnight
      if (now <= endDT) return false;
    }
    return true;
  })();

  // Work timer visibility — actively clocked in (open shift), within a
  // non-stale window, with a parseable checkInTime. `_activeShiftData`
  // being undefined (still loading) leaves _hdrShift null, so the timer
  // naturally stays hidden until the existing query resolves — no separate
  // "loading" check needed.
  const showWorkTimer = user?.role === 'Employee' && !!_hdrShift?.clockInTime &&
    !_isStale && !Number.isNaN(new Date(_hdrShift.clockInTime).getTime());

  const _schedState = (() => {
    const now = new Date();
    // Check yesterday's overnight shifts extending into today
    for (const s of _hdrSchedulesYest) {
      const [sy, sm, sd] = s.date.split('-').map(Number);
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const startDT = new Date(sy, sm - 1, sd, startH, startM, 0, 0);
      let endDT = new Date(sy, sm - 1, sd, endH, endM, 0, 0);
      if (endDT <= startDT) {
        endDT.setDate(endDT.getDate() + 1);
        if (now <= endDT) return 'IN_WINDOW';
      }
    }
    if (!_hdrSchedulesToday.length) return 'NO_SHIFT';
    const s = _hdrSchedulesToday[0];
    const [sy, sm, sd] = s.date.split('-').map(Number);
    const [startH, startM] = s.startTime.split(':').map(Number);
    const [endH, endM] = s.endTime.split(':').map(Number);
    const startDT = new Date(sy, sm - 1, sd, startH, startM, 0, 0);
    let endDT = new Date(sy, sm - 1, sd, endH, endM, 0, 0);
    if (endDT <= startDT) endDT.setDate(endDT.getDate() + 1); // overnight
    if (now < startDT) return 'UPCOMING';
    if (now <= endDT)  return 'IN_WINDOW';
    return 'PAST';
  })();

  const _fmt12 = (t) => {
    const [h, m] = (t || '00:00').split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const hdrBadge = (() => {
    const pillStyle = (extra) => ({ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap', border: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", ...extra });

    if (_isStale) return (
      <button onClick={() => navigate('/employee/shift')} style={pillStyle({ background: 'rgba(178,106,0,0.25)', color: '#FFB74D', border: '1px solid rgba(178,106,0,0.45)', cursor: 'pointer' })}>
        <WarningAmberOutlinedIcon sx={{ fontSize: 12 }} />
        Recover
      </button>
    );

    // Clocked in — WorkTimer (rendered alongside) takes over as the sole
    // indicator here instead of a static "Clocked In" text pill.
    if (_hdrShift) return null;

    if (_schedState === 'IN_WINDOW') return (
      <button onClick={() => navigate('/employee/shift')} style={pillStyle({ background: 'rgba(46,125,79,0.22)', color: '#81C784', border: '1px solid rgba(46,125,79,0.40)', cursor: 'pointer' })}>
        <LoginOutlinedIcon sx={{ fontSize: 12 }} />
        Clock In
      </button>
    );

    if (_schedState === 'UPCOMING') return (
      <div style={pillStyle({ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'default' })}>
        {_fmt12(_hdrSchedulesToday[0]?.startTime)}
      </div>
    );

    if (_schedState === 'PAST') return (
      <div style={pillStyle({ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.38)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'default' })}>
        Shift Ended
      </div>
    );

    // No shift scheduled today — nothing to show; the header stays quiet
    // until the employee has a shift to act on.
    return null;
  })();

  // ── Helpers shared between both layouts ──────────────────────────────────────
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  const isMenuRoute = MENU_ITEMS.some(({ path }) => isActive(path));
  const activeNavPath = NAV_ITEMS.find(({ path }) => isActive(path))?.path;
  const activeIndex   = NAV_ITEMS.findIndex(({ path }) => path === activeNavPath);
  const totalSlots    = NAV_ITEMS.length + 1;

  // ── Shared across both layouts ───────────────────────────────────────────────
  const FONT = "'Plus Jakarta Sans', sans-serif";

  const renderLogoutModal = () => {
    if (!logoutModalOpen) return null;
    return (
      <div
        onClick={() => setLogoutModalOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(30,18,14,0.45)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px', fontFamily: FONT,
        }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: '#fff', borderRadius: 18, padding: '28px 24px 24px',
          maxWidth: 320, width: '100%', textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(178,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M16 17l5-5-5-5M21 12H9" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.2px' }}>
            Log Out?
          </h3>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6B5B57', lineHeight: 1.55 }}>
            Are you sure you want to log out of your session?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setLogoutModalOpen(false)}
              style={{
                flex: 1, minHeight: 44, borderRadius: 10,
                border: '1.5px solid #DDD2CC', background: '#F5F3F1',
                color: '#6B5B57', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              style={{
                flex: 1, minHeight: 44, borderRadius: 10,
                border: 'none', background: '#C0392B',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
                boxShadow: '0 3px 0 #7b1f14',
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Desktop: sidebar layout ──────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <>
      <SessionMonitor />
      <BiometricPromptModal />
      {renderLogoutModal()}
      <div className="pos-min-vh-fill" style={{
        display: 'flex',
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
                flexShrink: 0, overflow: 'hidden',
              }}>
                {storeLogo
                  ? <img src={storeLogo} alt="Store" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 14, fontWeight: 800, color: '#D4A373', letterSpacing: '-0.5px' }}>E</span>
                }
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
              onClick={() => setLogoutModalOpen(true)}
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
              Log Out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="pos-min-vh-fill" style={{
          flex: 1,
          marginLeft: SIDEBAR_W,
          overflowY: 'auto',
        }}>
          <Outlet />
        </main>
      </div>
      </>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────────
  return (
    <>
    <SessionMonitor />
    <BiometricPromptModal />
    {renderLogoutModal()}
    <div
      className="pos-min-vh-fill"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#F5F3F1',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ── Top header ── */}
      <header
        ref={headerRef}
        className="pos-safe-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 700,
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
          {/* Store logo replaces the employee initial in the header */}
          <div style={{
            width: 34, height: 34, borderRadius: 9, overflow: 'hidden',
            background: storeLogo ? 'transparent' : 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {storeLogo
              ? <img src={storeLogo} alt="Store" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  {(user?.name || 'E').charAt(0).toUpperCase()}
                </span>
            }
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: '17px', margin: 0 }}>
              {storeName}
            </p>
            <p style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(255,255,255,0.55)', margin: 0, letterSpacing: '0.03em' }}>
              {user?.name || 'Employee'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Role flag */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 9px', borderRadius: 6, background: 'rgba(212,163,115,0.18)', border: '1px solid rgba(212,163,115,0.4)', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#D4A373', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{roleLabel}</span>
          </div>

          {/* Live work timer — actively clocked in, within a non-stale shift.
              Reuses the existing header active-shift query (_hdrShift/_isStale)
              above instead of a second fetch. Isolated into its own component
              so its once-a-second tick only re-renders WorkTimer, not this
              whole header. */}
          {showWorkTimer && <WorkTimer checkInTime={_hdrShift.clockInTime} />}

          {hdrBadge}
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="pos-safe-main" style={{ flex: 1, paddingBottom: 78 }}>
        <Outlet />
      </main>

      {/* ── Bottom navigation ── */}
      <nav
        className="pos-safe-bottom-nav"
        style={{
          position: 'fixed',
          // Anchored from the always-reliable `top: 0` edge instead of
          // `bottom: 0` — bottom:0 depends on the browser's internal fixed-
          // positioning viewport height being correct at paint time, which
          // is exactly the value that was going stale on some PWA cold
          // launches (leaving a blank gap below the nav). `top: 0` has no
          // such ambiguity, so combining it with our own JS-verified
          // --app-100vh height sidesteps the bug entirely instead of
          // hoping the browser's bottom-edge resolution is correct.
          // Must mirror the standalone-mode height override below (70px +
          // safe-area) exactly, or this and the real height diverge.
          top: 'calc(var(--app-100vh, 100dvh) - 70px - env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0,
          height: 70,
          background: '#ffffff',
          borderTop: '1px solid #DDD2CC',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 600,
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
              className="pos-touch-icon"
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
          className="pos-touch-icon"
          onClick={() => setMenuOpen(prev => !prev)}
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
          position: 'fixed', inset: 0, zIndex: 650,
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
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: headerHeight, right: 0, bottom: 0,
          width: 'min(70vw, 300px)',
          background: '#ffffff',
          zIndex: 651,
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
          padding: '36px 16px 18px', borderBottom: '1px solid #DDD2CC',
        }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#2B1D1A' }}>Menu</p>
          <button
            className="pos-touch-icon"
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

        {/* User card + logout */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #DDD2CC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 10, background: '#F9F6F3', marginBottom: 10 }}>
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={user.name} style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#3E2723', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#D4A373' }}>
                {(user?.name || 'E').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#2B1D1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Employee'}</p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#A09490', letterSpacing: '0.03em' }}>{user?.employeeCode}</p>
            </div>
          </div>
          <button className="pos-touch-row" onClick={() => { setMenuOpen(false); setLogoutModalOpen(true); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 12px', borderRadius: 9, background: 'rgba(183,28,28,0.06)', border: '1px solid rgba(183,28,28,0.22)', color: '#B71C1C', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}>
            <LogoutOutlinedIcon sx={{ fontSize: 16, color: '#B71C1C' }} />
            Sign Out
          </button>
        </div>

        {/* Drawer nav items — grouped */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '6px 0 16px' }}>
          {MENU_SECTIONS.map(({ label: sectionLabel, items }, si) => (
            <div key={sectionLabel}>
              {si > 0 && (
                <div style={{ height: 1, background: '#EFE7E2', margin: '6px 0' }} />
              )}
              <p style={{
                margin: '10px 18px 4px',
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
                    className="pos-touch-row"
                    onClick={() => goTo(path)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 18px',
                      background: active ? '#F5F0EC' : 'transparent',
                      borderLeft: `3px solid ${active ? '#3E2723' : 'transparent'}`,
                      border: 'none',
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
          ))}
        </div>
      </aside>
    </div>
    </>
  );
}
