import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

async function callRefresh(rawRefreshToken) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetch(`${API}/api/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rawRefreshToken, deviceId }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function callVerifyPin(accessToken, pin) {
  const res = await fetch(`${API}/api/auth/verify-pin`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body:    JSON.stringify({ pin }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function POSLockScreen() {
  const navigate   = useNavigate();
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
  const homeRoute = (role === 'Manager' || role === 'Admin') ? '/manager/dashboard' : '/employee/terminal';

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

  const handleKey = useCallback((key) => {
    if (loading || authenticating) return;
    if (key === 'DEL')          { setPin(p => p.slice(0, -1)); setError(''); setBioError(''); }
    else if (key === 'CLR')     { setPin(''); setError(''); setBioError(''); }
    else if (/^\d$/.test(key) && pinRef.current.length < 4) {
      setPin(p => p + key);
      setError('');
      setBioError('');
    }
  }, [loading, authenticating]);

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
          if (retry.data.success) { unlock(); startLoading(); navigate(homeRoute, { replace: true }); return; }
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
        navigate(homeRoute, { replace: true });
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
      navigate(homeRoute, { replace: true });
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
    <div className={shake ? 'pin-shake' : ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: '50%',
            backgroundColor: pinError
              ? (i < pin.length ? '#B71C1C' : 'transparent')
              : (i < pin.length ? '#3E2723' : 'transparent'),
            border: `2px solid ${pinError ? '#B71C1C' : '#9E8E8A'}`,
            transition: 'background-color 0.15s, border-color 0.15s',
          }} />
        ))}
      </div>
      {(error || bioError) && (
        <p style={{
          margin: '8px 0 0', textAlign: 'center',
          fontSize: 11, fontWeight: 600, color: '#B71C1C', letterSpacing: '0.02em',
        }}>
          {error || bioError}
        </p>
      )}
    </div>
  );

  const numKeyBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, userSelect: 'none', fontFamily: FONT,
    transition: 'all 0.12s', cursor: 'pointer',
  };

  const NumGrid = ({ keyH }) => {
    const digitStyle = (k) => pressedKey === k
      ? { transform: 'translateY(4px)', boxShadow: '0 0px 0 #c4b8b2, 0 2px 4px rgba(0,0,0,0.04)', background: '#F5F0EC' }
      : { boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)' };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, width: '100%', paddingBottom: 4 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n}
            onClick={() => { handleKey(n.toString()); flashKey(n.toString()); }}
            disabled={loading || authenticating || pin.length >= 4}
            style={{
              ...numKeyBase, height: keyH,
              fontSize: 32, fontWeight: 700, color: '#2B1D1A',
              background: '#FFFFFF', border: '1px solid #DDD2CC',
              opacity: (loading || authenticating) ? 0.4 : 1,
              ...digitStyle(n.toString()),
            }}
          >{n}</button>
        ))}

        <button
          onClick={() => { handleKey('CLR'); flashKey('clr'); }}
          disabled={loading || authenticating}
          style={{
            ...numKeyBase, height: keyH,
            fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
            background: '#B71C1C', color: '#fff', border: '1px solid #991717',
            opacity: (loading || authenticating) ? 0.4 : 1,
            ...(pressedKey === 'clr'
              ? { transform: 'translateY(4px)', boxShadow: '0 0px 0 #7a1111, 0 2px 4px rgba(183,28,28,0.12)', background: '#9a1515' }
              : { boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }),
          }}
        >CLR</button>

        <button
          onClick={() => { handleKey('0'); flashKey('0'); }}
          disabled={loading || authenticating || pin.length >= 4}
          style={{
            ...numKeyBase, height: keyH,
            fontSize: 32, fontWeight: 700, color: '#2B1D1A',
            background: '#FFFFFF', border: '1px solid #DDD2CC',
            opacity: (loading || authenticating) ? 0.4 : 1,
            ...digitStyle('0'),
          }}
        >0</button>

        <button
          onClick={() => { handleKey('DEL'); flashKey('backspace'); }}
          disabled={loading || authenticating}
          style={{
            ...numKeyBase, height: keyH,
            background: '#F5F0EC', color: '#3E2723', border: '1px solid #DDD2CC',
            opacity: (loading || authenticating) ? 0.4 : 1,
            ...(pressedKey === 'backspace'
              ? { transform: 'translateY(4px)', boxShadow: '0 0px 0 #c4b8b2, 0 2px 4px rgba(0,0,0,0.04)', background: '#EDE6DF' }
              : { boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)' }),
          }}
        >
          <BackspaceOutlinedIcon sx={{ fontSize: 20 }} />
        </button>
      </div>
    );
  };

  const ActionArea = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {supported && hasBiometric && (
        <button
          onClick={handleBiometric}
          disabled={authenticating || loading}
          style={{
            width: '100%', minHeight: 48,
            border: '1px solid #DDD2CC',
            background: authenticating ? '#F5F0EC' : '#FFFFFF',
            color: authenticating ? '#A09490' : '#3E2723',
            borderRadius: 8, fontFamily: FONT,
            fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
            cursor: (authenticating || loading) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 2px 0 #c4b8b2',
          }}
        >
          <FingerprintIcon sx={{ fontSize: 20, color: authenticating ? '#A09490' : '#3E2723' }} />
          {authenticating ? 'WAITING FOR BIOMETRIC…' : 'USE BIOMETRIC LOGIN'}
        </button>
      )}

      <div style={{ textAlign: 'center', paddingTop: 2 }}>
        <button
          onClick={handleSwitchAccount}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, color: '#A09490',
            padding: 0, fontFamily: FONT, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#3E2723'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#A09490'; }}
        >
          Switch Account
        </button>
      </div>
    </div>
  );

  // ── keypad card (shared by mobile + desktop right panel) ───────────────────

  const KeypadCard = ({ keyH, padding }) => (
    <div style={{
      background: '#FFFFFF', border: '1px solid #DDD2CC',
      borderRadius: 12, padding,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
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
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', height: '100dvh', overflow: 'hidden',
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
          {/* Orbs */}
          <div style={{ position: 'absolute', top: -100, right: -100, width: 320, height: 320, borderRadius: '50%', background: 'rgba(62,39,35,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 40,  left: -80,  width: 260, height: 260, borderRadius: '50%', background: 'rgba(62,39,35,0.04)', pointerEvents: 'none' }} />

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
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#F5F3F1', fontFamily: FONT, overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', minHeight: '100%', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* User identity card */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #DDD2CC', borderRadius: 12,
            padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 13, flexShrink: 0,
              background: 'rgba(62,39,35,0.08)', border: '1.5px solid rgba(62,39,35,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {display?.imageUrl
                ? <img src={display.imageUrl} alt={display.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 20, fontWeight: 900, color: '#3E2723', fontFamily: FONT }}>{initials}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px', fontFamily: FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {display?.name || 'Employee'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 600, color: '#8A7B77', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT }}>
                {role}{display?.employeeCode ? ` · ${display.employeeCode}` : ''}
              </p>
            </div>
            <LockOutlinedIcon sx={{ fontSize: 18, color: '#A09490', flexShrink: 0 }} />
          </div>

          {/* Keypad card */}
          <KeypadCard keyH={72} padding="24px 24px 28px" />

        </div>
      </div>
    </div>
  );
}
