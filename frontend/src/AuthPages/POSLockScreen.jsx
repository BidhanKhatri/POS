import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FingerprintIcon       from '@mui/icons-material/Fingerprint';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import LockOutlinedIcon      from '@mui/icons-material/LockOutlined';
import PointOfSaleIcon       from '@mui/icons-material/PointOfSale';
import { useMediaQuery }     from '@mui/material';
import useAuthStore, { getOrCreateDeviceId } from '../store/useAuthStore';
import { useWebAuthn } from '../hooks/useWebAuthn';
import { useLoading }  from '../context/LoadingContext';
import { API_URL as API } from '../config/api';

const FONT        = "'Plus Jakarta Sans', sans-serif";
const MAX_ATTEMPTS = 5;

// ── helpers ───────────────────────────────────────────────────────────────────

// Slow/stalled connections must not leave the keypad disabled forever —
// give up after 15s so the user gets a clear error and can retry.
const NETWORK_TIMEOUT_MS = 15000;
function withTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function callRefresh(rawRefreshToken) {
  const deviceId = getOrCreateDeviceId();
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: rawRefreshToken, deviceId }),
      signal,
    });
    if (!res.ok) return null;
    return res.json();
  } finally {
    clear();
  }
}

async function callVerifyPin(accessToken, pin) {
  const { signal, clear } = withTimeout();
  try {
    const res = await fetch(`${API}/api/auth/verify-pin`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body:    JSON.stringify({ pin }),
      signal,
    });
    return { ok: res.ok, status: res.status, data: await res.json() };
  } finally {
    clear();
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function POSLockScreen() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const isDesktop  = useMediaQuery('(min-width:1024px)');
  const { startLoading, stopLoading } = useLoading();
  const [storeLogo] = useState(() => localStorage.getItem('pos-store-logo-url'));

  const {
    user, token, trustedUser, refreshToken, hasBiometric,
    unlock, logout, switchAccount, setTrustedSession, applyRefresh,
  } = useAuthStore();

  const { supported, authenticating, loginWithBiometric } = useWebAuthn();

  const [pin,        setPin]        = useState('');
  const [loading,    setLoading]    = useState(false);
  const [pinError,   setPinError]   = useState(false);
  const [shake,      setShake]      = useState(false);
  const [error,      setError]      = useState('');
  const [bioError,   setBioError]   = useState('');
  const [attempts,   setAttempts]   = useState(0);
  const [pressedKey, setPressedKey] = useState(null);

  const pinRef = useRef(pin);
  pinRef.current = pin;

  const display   = user || trustedUser;
  const initials  = (display?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const role      = display?.role || 'Employee';

  // Always compute the post-unlock redirect from a specific, freshly-verified
  // user object rather than the `display` above — that can be
  // sourced from a stale `trustedUser` left on this device by a different
  // role's earlier login (this component only re-renders after submitPin's
  // async work settles, so a stale closure would otherwise win the race).
  const routeFor = (u) => {
    const r = u?.role || 'Employee';
    return (r === 'Manager' || r === 'Admin') ? '/manager/dashboard' : '/employee/terminal';
  };

  // Preserve whatever route the user was on when the terminal locked
  // (idle timeout, app backgrounded, etc.) instead of always bouncing to
  // the role's home route — but only if that route still belongs to the
  // freshly-verified user's role area, so a stale trustedUser from a
  // different role's earlier login on this device can't leak into it.
  const preserveRoute = (u) => {
    const r = u?.role || 'Employee';
    const isManagerArea = r === 'Manager' || r === 'Admin';
    const currentPath = `${location.pathname}${location.search}`;
    if (isManagerArea && location.pathname.startsWith('/manager')) return currentPath;
    if (!isManagerArea && location.pathname.startsWith('/employee')) return currentPath;
    return routeFor(u);
  };

  useEffect(() => { stopLoading(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const flashKey = (key) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 140);
  };

  const triggerShake = () => {
    setPinError(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => setPinError(false), 1200);
  };

  // ── key handler ───────────────────────────────────────────────────────────

  // PIN entry stays responsive even while a verify request is in flight
  // (slow/stalled network) — the auto-submit effect below already guards
  // against a duplicate submit via its own `!loading` check.
  const handleKey = useCallback((key) => {
    if (authenticating) return;
    if (key === 'DEL')          { setPin(p => p.slice(0, -1)); setError(''); setBioError(''); }
    else if (key === 'CLR')     { setPin(''); setError(''); setBioError(''); }
    else if (/^\d$/.test(key) && pinRef.current.length < 4) {
      setPin(p => p + key);
      setError('');
      setBioError('');
    }
  }, [authenticating]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (/^\d$/.test(e.key))        { handleKey(e.key); flashKey(e.key); }
      else if (e.key === 'Backspace') { handleKey('DEL'); flashKey('backspace'); }
      else if (e.key === 'Escape')    { handleKey('CLR'); flashKey('clr'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey]);

  useEffect(() => {
    if (pin.length === 4 && !loading && !authenticating) submitPin(pin);
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PIN submit ─────────────────────────────────────────────────────────────

  const submitPin = async (enteredPin) => {
    setLoading(true);
    try {
      let accessToken = useAuthStore.getState().token;

      if (!accessToken && refreshToken) {
        const refreshed = await callRefresh(refreshToken);
        if (refreshed) {
          applyRefresh(refreshed.user, refreshed.token, refreshed.refreshToken);
          accessToken = refreshed.token;
        }
      }
      if (!accessToken) {
        setError('Session expired. Please switch account and log in again.');
        setPin('');
        return;
      }

      const { ok, status, data } = await callVerifyPin(accessToken, enteredPin);

      if (status === 401 && refreshToken) {
        const refreshed = await callRefresh(refreshToken);
        if (refreshed) {
          applyRefresh(refreshed.user, refreshed.token, refreshed.refreshToken);
          const retry = await callVerifyPin(refreshed.token, enteredPin);
          if (retry.data.success) { unlock(); startLoading(); navigate(preserveRoute(refreshed.user), { replace: true }); return; }
          handlePinFailure();
          return;
        }
        setError('Your session has expired. Please switch account.');
        setPin('');
        setTimeout(() => switchAccount(), 1800);
        return;
      }

      if (ok && data.success) {
        unlock();
        startLoading();
        // Route off the freshly verified identity in the store, not the
        // `display`/`homeRoute` computed at render time — those can still
        // reflect a stale trustedUser left over from a different role's
        // login on this device (e.g. Manager) when this session's `user`
        // was null until the refresh/verify above just repopulated it.
        navigate(preserveRoute(useAuthStore.getState().user), { replace: true });
      } else {
        handlePinFailure();
      }
    } catch {
      setPin('');
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinFailure = () => {
    const next = attempts + 1;
    setAttempts(next);
    setPin('');
    triggerShake();
    if (next >= MAX_ATTEMPTS) { logout(); navigate('/login', { replace: true }); return; }
    setError(`Incorrect PIN — ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} left.`);
  };

  // ── biometric ──────────────────────────────────────────────────────────────

  const handleBiometric = async () => {
    if (authenticating || loading) return;
    setBioError('');
    setError('');
    try {
      const data = await loginWithBiometric(display?.email);
      const { token: bioToken, refreshToken: bioRefresh, ...userFields } = data;
      setTrustedSession(userFields, bioToken, bioRefresh ?? refreshToken);
      startLoading();
      navigate(preserveRoute(userFields), { replace: true });
    } catch (err) {
      setBioError(err.message || 'Biometric failed. Enter your PIN instead.');
    }
  };

  // ── switch account ─────────────────────────────────────────────────────────

  const handleSwitchAccount = async () => {
    const { refreshToken: rt } = useAuthStore.getState();
    if (rt) {
      const deviceId = getOrCreateDeviceId();
      fetch(`${API}/api/auth/logout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: rt, deviceId }),
      }).catch(() => {});
    }
    switchAccount();
  };

  // ── sub-components ─────────────────────────────────────────────────────────

  const PinDots = () => (
    <div className={`flex flex-col items-center ${shake ? 'pin-shake' : ''}`}>
      <div className="flex gap-5 justify-center">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-full border-2 transition-colors duration-150"
            style={{
              width: 18, height: 18,
              backgroundColor: pinError
                ? (i < pin.length ? '#B71C1C' : 'transparent')
                : (i < pin.length ? '#3E2723' : 'transparent'),
              borderColor: pinError ? '#B71C1C' : '#9E8E8A',
            }}
          />
        ))}
      </div>
      {error && (
        <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#B71C1C', letterSpacing: '0.02em' }}>
          {error}
        </p>
      )}
    </div>
  );

  // Same button language as LoginScreen: the 3D shadow + `active:translate-y`
  // press is native CSS (:active fires the instant a finger touches down,
  // no JS/state round-trip needed) — this is what actually fixes the input
  // lag, not just a visual match. `pressedKey`/flashKey stays only for the
  // physical-keyboard path below, which has no :active pseudo-class to lean on.
  const numKey =
    'flex items-center justify-center rounded-2xl select-none transition-all duration-150 ' +
    'bg-white border border-divider-tone ' +
    'shadow-[0_4px_0_#c4b8b2,0_6px_12px_rgba(0,0,0,0.06)] ' +
    'hover:bg-surface-variant/70 ' +
    'active:translate-y-[4px] active:shadow-[0_0px_0_#c4b8b2,0_2px_4px_rgba(0,0,0,0.04)]';
  const disabledKey = 'opacity-40 pointer-events-none';

  const NumGrid = ({ keyH }) => {
    const digitPressed = (k) => pressedKey === k
      ? { transform: 'translateY(4px)', boxShadow: '0 0px 0 #c4b8b2, 0 2px 4px rgba(0,0,0,0.04)', background: '#F5F0EC' }
      : {};
    const keyDisabled = authenticating || loading;

    return (
      <div className="grid grid-cols-3 gap-3 w-full pb-1">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n}
            onClick={() => handleKey(n.toString())}
            disabled={keyDisabled || pin.length >= 4}
            className={`${numKey} ${keyDisabled ? disabledKey : 'cursor-pointer'}`}
            style={{ height: keyH, fontSize: 26, fontWeight: 700, color: '#2B1D1A', fontFamily: FONT, ...digitPressed(n.toString()) }}
          >{n}</button>
        ))}

        <button
          onClick={() => handleKey('CLR')}
          disabled={keyDisabled}
          className={`flex items-center justify-center rounded-2xl select-none transition-all duration-150 active:translate-y-[4px] ${keyDisabled ? disabledKey : 'cursor-pointer'}`}
          style={{
            height: keyH, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', fontFamily: FONT,
            background: '#B71C1C', color: '#fff', border: '1px solid #991717',
            ...(pressedKey === 'clr'
              ? { transform: 'translateY(4px)', boxShadow: '0 0px 0 #7a1111, 0 2px 4px rgba(183,28,28,0.12)', background: '#9a1515' }
              : { boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }),
          }}
        >CLR</button>

        <button
          onClick={() => handleKey('0')}
          disabled={keyDisabled || pin.length >= 4}
          className={`${numKey} ${keyDisabled ? disabledKey : 'cursor-pointer'}`}
          style={{ height: keyH, fontSize: 26, fontWeight: 700, color: '#2B1D1A', fontFamily: FONT, ...digitPressed('0') }}
        >0</button>

        <button
          onClick={() => handleKey('DEL')}
          disabled={keyDisabled}
          className={`flex items-center justify-center rounded-2xl select-none transition-all duration-150 active:translate-y-[4px] ${keyDisabled ? disabledKey : 'cursor-pointer'}`}
          style={{
            height: keyH, background: '#F5F0EC', color: '#3E2723', border: '1px solid #DDD2CC',
            ...(pressedKey === 'backspace'
              ? { transform: 'translateY(4px)', boxShadow: '0 0px 0 #c4b8b2, 0 2px 4px rgba(0,0,0,0.04)', background: '#EDE6DF' }
              : { boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)' }),
          }}
        >
          <BackspaceOutlinedIcon sx={{ fontSize: 19 }} />
        </button>
      </div>
    );
  };

  // Compact, tap-to-unlock biometric option — small icon button + label in a
  // single row (not a big stacked icon+caption) so it costs minimal vertical
  // space, placed at the bottom of the card below "Switch Account". Not
  // auto-triggered on mount: WebAuthn's navigator.credentials.get() needs a
  // fresh user gesture in most browsers, so firing it automatically on load
  // would just throw NotAllowedError instead of actually being quicker.
  const BiometricUnlock = () => {
    if (!(supported && hasBiometric)) return null;
    const busy = authenticating || loading;
    return (
      <div className="flex flex-col items-center w-full" style={{ gap: 4 }}>
        <button
          onClick={handleBiometric}
          disabled={busy}
          className="flex items-center justify-center select-none rounded-full active:translate-y-[1px] transition-all duration-150"
          style={{
            gap: 6, padding: '5px 12px',
            background: busy ? '#F5F0EC' : 'rgba(62,39,35,0.06)',
            border: `1px solid ${busy ? '#DDD2CC' : 'rgba(62,39,35,0.18)'}`,
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          <FingerprintIcon sx={{ fontSize: 15, color: busy ? '#A09490' : '#3E2723' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: busy ? '#A09490' : '#3E2723', letterSpacing: '0.03em', fontFamily: FONT }}>
            {authenticating ? 'Waiting for biometric…' : 'Unlock with biometrics'}
          </span>
        </button>
        {bioError && (
          <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, color: '#B71C1C', textAlign: 'center', fontFamily: FONT }}>
            {bioError}
          </p>
        )}
      </div>
    );
  };

  const ActionArea = () => (
    <div className="flex flex-col items-center w-full" style={{ gap: 8 }}>
      <button
        onClick={handleSwitchAccount}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 500, color: '#A09490',
          padding: 0, fontFamily: FONT, transition: 'color 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#3E2723'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#A09490'; }}
      >
        Switch Account
      </button>
      <BiometricUnlock />
    </div>
  );

  // ── keypad card (shared by mobile + desktop right panel) ───────────────────

  const KeypadCard = ({ keyH, padding, gap = 16 }) => (
    <div style={{
      background: '#FFFFFF', border: '1px solid #DDD2CC',
      borderRadius: 12, padding,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap,
    }}>
      <PinDots />
      <NumGrid keyH={keyH} />
      <ActionArea />
    </div>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────

  if (isDesktop) {
    return (
      <div style={{
        // top:0 + explicit height (JS-verified --app-100vh, see main.jsx)
        // instead of inset:0 — inset:0 implicitly relies on the browser's
        // internal fixed-positioning bottom-edge resolution, which is what
        // was leaving a blank gap below the screen on some PWA launches.
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        display: 'flex', height: 'var(--app-100vh, 100dvh)', overflow: 'hidden',
        fontFamily: FONT, background: '#F5F3F1',
      }}>
        {/* Left panel */}
        <div style={{
          width: '42%', minWidth: 340, maxWidth: 520,
          background: '#EDE6DF', borderRight: '1px solid #DDD2CC',
          display: 'flex', flexDirection: 'column',
          padding: '44px 40px 36px',
          position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 13px', borderRadius: 20, width: 'fit-content',
            background: 'rgba(62,39,35,0.08)', border: '1px solid rgba(62,39,35,0.14)',
          }}>
            <LockOutlinedIcon sx={{ fontSize: 9, color: '#3E2723' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#3E2723', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: FONT }}>
              Terminal Locked
            </span>
          </div>

          {/* Center */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {/* Avatar */}
            <div style={{
              width: 90, height: 90, borderRadius: 24, marginBottom: 20,
              background: 'rgba(62,39,35,0.08)', border: '2px solid rgba(62,39,35,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(62,39,35,0.12)',
            }}>
              {display?.imageUrl
                ? <img src={display.imageUrl} alt={display.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 32, fontWeight: 900, color: '#3E2723', letterSpacing: '-0.5px', fontFamily: FONT }}>{initials}</span>
              }
            </div>

            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.5px', textAlign: 'center', fontFamily: FONT }}>
              {display?.name || 'Employee'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: '#8A7B77', letterSpacing: '0.10em', textTransform: 'uppercase', textAlign: 'center', fontFamily: FONT }}>
              {role}{display?.employeeCode ? ` · ${display.employeeCode}` : ''}
            </p>

            <div style={{ width: 48, height: 2, borderRadius: 1, background: 'rgba(62,39,35,0.20)', margin: '24px 0' }} />

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 290 }}>
              {[
                {
                  label: 'Trusted Device',
                  desc: '30-day session active',
                  svg: (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="9" width="18" height="12" rx="2" stroke="#3E2723" strokeWidth="1.8"/>
                      <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="#3E2723" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  ),
                },
                {
                  label: 'PIN Protected',
                  desc: 'Enter your 4-digit PIN to unlock',
                  svg: (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="3" stroke="#3E2723" strokeWidth="1.8"/>
                      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#3E2723" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  ),
                },
                {
                  label: 'Quick Access',
                  desc: 'No re-login required',
                  svg: (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#3E2723" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                },
              ].map(({ label, desc, svg }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  padding: '11px 15px', borderRadius: 11,
                  background: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(62,39,35,0.10)',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(62,39,35,0.08)', border: '1px solid rgba(62,39,35,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {svg}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2B1D1A', lineHeight: '17px', fontFamily: FONT }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#8A7B77', lineHeight: '15px', fontFamily: FONT }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p style={{ margin: 0, textAlign: 'center', fontSize: 11, color: '#A09490', letterSpacing: '0.04em', fontFamily: FONT }}>
            © {new Date().getFullYear()} POS System · All rights reserved
          </p>
        </div>

        {/* Right panel */}
        <div style={{
          flex: 1, minWidth: 0, background: '#F5F3F1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflowY: 'auto', padding: '40px 32px',
        }}>
          <div style={{ width: '100%', maxWidth: 500 }}>
            <KeypadCard keyH={76} padding="32px" />
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────

  return (
    <div style={{
      // top:0 + explicit height (JS-verified --app-100vh, see main.jsx)
      // instead of inset:0 — see the desktop layout above for why.
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      height: 'var(--app-100vh, 100dvh)',
      background: '#F5F3F1', fontFamily: FONT, overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', minHeight: '100%', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '14px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* User identity card */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #DDD2CC', borderRadius: 12,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: 'rgba(62,39,35,0.08)', border: '1.5px solid rgba(62,39,35,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {display?.imageUrl
                ? <img src={display.imageUrl} alt={display.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 16, fontWeight: 900, color: '#3E2723', fontFamily: FONT }}>{initials}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px', fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {display?.name || 'Employee'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10.5, fontWeight: 600, color: '#8A7B77', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT }}>
                {role}{display?.employeeCode ? ` · ${display.employeeCode}` : ''}
              </p>
            </div>
            <LockOutlinedIcon sx={{ fontSize: 16, color: '#A09490', flexShrink: 0 }} />
          </div>

          {/* Keypad card */}
          <KeypadCard keyH={56} padding="16px 16px 18px" gap={14} />

        </div>
      </div>
    </div>
  );
}
