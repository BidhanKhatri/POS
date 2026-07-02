import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FingerprintIcon       from '@mui/icons-material/Fingerprint';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import PointOfSaleIcon       from '@mui/icons-material/PointOfSale';
import useAuthStore, { getOrCreateDeviceId } from '../store/useAuthStore';
import { useWebAuthn } from '../hooks/useWebAuthn';
import { useLoading }  from '../context/LoadingContext';
import { API_URL as API } from '../config/api';

const FONT        = "'Plus Jakarta Sans', sans-serif";
const MAX_ATTEMPTS = 5;

const PAD = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['CLR','0','DEL'],
];

// ── helpers ──────────────────────────────────────────────────────────────────

async function callRefresh(rawRefreshToken) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetch(`${API}/api/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken: rawRefreshToken, deviceId }),
  });
  if (!res.ok) return null;
  return res.json(); // { user, token, refreshToken }
}

async function callVerifyPin(accessToken, pin) {
  const res = await fetch(`${API}/api/auth/verify-pin`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ pin }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function POSLockScreen() {
  const navigate = useNavigate();
  const { startLoading, stopLoading } = useLoading();

  const {
    user, token, trustedUser, refreshToken, hasBiometric,
    unlock, logout, switchAccount, setTrustedSession, applyRefresh,
  } = useAuthStore();

  const { supported, authenticating, loginWithBiometric } = useWebAuthn();

  const [pin,           setPin]           = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [bioError,      setBioError]      = useState('');
  const [attempts,      setAttempts]      = useState(0);

  const pinRef = useRef(pin);
  pinRef.current = pin;

  // Display from trustedUser (always persisted) so the name shows even before
  // a refresh has rehydrated the full user object.
  const display  = user || trustedUser;
  const initials = (display?.name || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const role      = display?.role || 'Employee';
  const homeRoute = (role === 'Manager' || role === 'Admin')
    ? '/manager/dashboard'
    : '/employee/terminal';

  // Dismiss splash screen as soon as lock screen is visible
  useEffect(() => { stopLoading(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── keyboard support ───────────────────────────────────────────────────────
  const handleKey = useCallback((key) => {
    if (loading || authenticating) return;
    if (key === 'DEL') { setPin(p => p.slice(0, -1)); setError(''); setBioError(''); }
    else if (key === 'CLR') { setPin(''); setError(''); setBioError(''); }
    else if (/^\d$/.test(key) && pinRef.current.length < 4) {
      setPin(p => p + key);
      setError('');
      setBioError('');
    }
  }, [loading, authenticating]);

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key))   handleKey(e.key);
      else if (e.key === 'Backspace') handleKey('DEL');
      else if (e.key === 'Escape')    handleKey('CLR');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey]);

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && !loading && !authenticating) submitPin(pin);
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PIN submit ─────────────────────────────────────────────────────────────
  const submitPin = async (enteredPin) => {
    setLoading(true);
    try {
      let accessToken = useAuthStore.getState().token;

      // If no token, try refresh first before verify-pin
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

      // JWT expired mid-session → refresh and retry once
      if (status === 401 && refreshToken) {
        const refreshed = await callRefresh(refreshToken);
        if (refreshed) {
          applyRefresh(refreshed.user, refreshed.token, refreshed.refreshToken);
          const retry = await callVerifyPin(refreshed.token, enteredPin);
          if (retry.data.success) {
            unlock();
            startLoading();
            navigate(homeRoute, { replace: true });
            return;
          }
          // Wrong PIN after refresh
          handlePinFailure();
          return;
        }
        // Refresh failed entirely
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
    if (next >= MAX_ATTEMPTS) {
      logout();
      navigate('/login', { replace: true });
      return;
    }
    setError(`Incorrect PIN — ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} left.`);
  };

  // ── biometric unlock ───────────────────────────────────────────────────────
  const handleBiometric = async () => {
    if (authenticating || loading) return;
    setBioError('');
    setError('');
    try {
      const data = await loginWithBiometric(display?.email);
      // data = { _id, name, email, role, isActive, employeeCode, token, refreshToken }
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
    // Best-effort: revoke refresh token on backend
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

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display:  'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(150deg, #1C0F0D 0%, #3E2723 55%, #4E342E 100%)',
      fontFamily: FONT,
      overflowY:  'auto',
      padding:    '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* ── Branding ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <PointOfSaleIcon sx={{ fontSize: 18, color: 'rgba(212,163,115,0.6)' }} />
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(212,163,115,0.6)',
          }}>
            Staffing POS
          </span>
        </div>

        {/* ── User identity ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 76, height: 76, borderRadius: 22,
            background: 'rgba(255,255,255,0.10)',
            border: '2px solid rgba(212,163,115,0.50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#fff',
            margin: '0 auto 14px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.30)',
            letterSpacing: '-0.5px',
          }}>
            {initials}
          </div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
            {display?.name || 'Employee'}
          </p>
          <p style={{
            margin: '5px 0 0', fontSize: 11, fontWeight: 700,
            color: 'rgba(212,163,115,0.75)', letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            {role}{display?.employeeCode ? ` · ${display.employeeCode}` : ''}
          </p>
        </div>

        {/* ── PIN dots ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: 13, height: 13, borderRadius: '50%',
              background: i < pin.length ? '#D4A373' : 'rgba(255,255,255,0.18)',
              border: `2px solid ${i < pin.length ? '#D4A373' : 'rgba(255,255,255,0.28)'}`,
              transition: 'background 0.12s, border-color 0.12s',
              boxShadow: i < pin.length ? '0 0 10px rgba(212,163,115,0.45)' : 'none',
            }} />
          ))}
        </div>

        {/* ── Error message ── */}
        {(error || bioError) && (
          <div style={{
            marginBottom: 14, padding: '8px 16px', borderRadius: 10,
            background: 'rgba(183,28,28,0.20)', border: '1px solid rgba(255,100,100,0.30)',
            fontSize: 12, fontWeight: 600, color: '#ff8a80',
            textAlign: 'center', maxWidth: 300, lineHeight: '17px',
          }}>
            {error || bioError}
          </div>
        )}

        {/* ── Numpad ── */}
        <div style={{ width: '100%', maxWidth: 300, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {PAD.flat().map((key, idx) => {
              if (!key) return <div key={idx} />;
              const isAction = key === 'DEL' || key === 'CLR';
              const disabled = loading || authenticating || (!isAction && pin.length >= 4);
              return (
                <button
                  key={key + idx}
                  onClick={() => handleKey(key)}
                  disabled={disabled}
                  style={{
                    height: 58, borderRadius: 14,
                    border:     isAction ? '1px solid rgba(255,255,255,0.13)' : '1px solid rgba(255,255,255,0.16)',
                    background: isAction ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)',
                    color: '#fff',
                    fontSize:   isAction ? 11 : 22,
                    fontWeight: isAction ? 700 : 500,
                    letterSpacing: isAction ? '0.06em' : 0,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: (loading && !isAction) ? 0.45 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.09s',
                    fontFamily: FONT,
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                  }}
                  onPointerDown={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'scale(0.96)'; }}
                  onPointerUp={e => { e.currentTarget.style.background = isAction ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)'; e.currentTarget.style.transform = 'none'; }}
                  onPointerLeave={e => { e.currentTarget.style.background = isAction ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {key === 'DEL'
                    ? <BackspaceOutlinedIcon sx={{ fontSize: 19, color: 'rgba(255,255,255,0.75)' }} />
                    : key}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Biometric button ── */}
        {supported && hasBiometric && (
          <button
            onClick={handleBiometric}
            disabled={authenticating || loading}
            style={{
              width: '100%', maxWidth: 300, height: 52,
              border: '1px solid rgba(212,163,115,0.40)',
              background: authenticating ? 'rgba(212,163,115,0.12)' : 'rgba(255,255,255,0.07)',
              borderRadius: 14, color: '#D4A373',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
              cursor: (authenticating || loading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 28, transition: 'background 0.12s',
              fontFamily: FONT, userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            onPointerDown={e => { e.currentTarget.style.background = 'rgba(212,163,115,0.20)'; }}
            onPointerUp={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            onPointerLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          >
            <FingerprintIcon sx={{ fontSize: 22, color: '#D4A373' }} />
            {authenticating ? 'Waiting for biometric…' : 'Face ID / Fingerprint'}
          </button>
        )}

        {/* ── Switch account ── */}
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', marginBottom: 18 }} />
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleSwitchAccount}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                color: 'rgba(255,255,255,0.42)',
                letterSpacing: '0.03em',
                fontFamily: FONT, padding: '6px 12px',
                borderRadius: 8, transition: 'color 0.14s',
                userSelect: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.80)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
            >
              Switch Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
