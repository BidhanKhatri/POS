import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LockOutlinedIcon       from '@mui/icons-material/LockOutlined';
import BackspaceOutlinedIcon  from '@mui/icons-material/BackspaceOutlined';
import useAuthStore from '../../store/useAuthStore';

const API  = import.meta.env.VITE_API_BASE_URL ?? '';
const FONT = "'Plus Jakarta Sans', sans-serif";
const MAX_ATTEMPTS = 3;

const C = {
  primary: '#3E2723', textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border:  '#DDD2CC', surface: '#ffffff', elevated: '#EFE7E2',
  error:   '#B71C1C', success: '#2E7D4F',
};

const PAD = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['',  '0', 'DEL'],
];

export default function LockOverlay() {
  const navigate  = useNavigate();
  const { user, token, unlock, logout } = useAuthStore();

  const [pin,      setPin]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [attempts, setAttempts] = useState(0);

  const initials = (user?.name || 'E')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleKey = useCallback((key) => {
    if (loading) return;
    if (key === 'DEL') {
      setPin((p) => p.slice(0, -1));
      setError('');
    } else if (key && pin.length < 4) {
      setPin((p) => p + key);
      setError('');
    }
  }, [loading, pin]);

  // Physical keyboard support
  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) handleKey(e.key);
      else if (e.key === 'Backspace') handleKey('DEL');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !loading) submit(pin);
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (enteredPin) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: enteredPin }),
      });
      const d = await r.json();
      if (d.success) {
        unlock();
        setPin('');
        setAttempts(0);
        setError('');
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setPin('');
        if (next >= MAX_ATTEMPTS) {
          logout();
          navigate('/login', { replace: true });
          return;
        }
        setError(`Incorrect PIN. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} remaining.`);
      }
    } catch {
      setPin('');
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(30,18,16,0.82)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      fontFamily: FONT,
    }}>
      <div style={{
        background: C.surface, borderRadius: 20,
        width: 'min(340px, 92vw)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: C.primary, padding: '28px 24px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px',
          }}>
            {initials}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {user?.name || 'Employee'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
              {user?.employeeCode}
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,0.12)',
          }}>
            <LockOutlinedIcon sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
              SESSION LOCKED
            </span>
          </div>
        </div>

        {/* PIN body */}
        <div style={{ padding: '20px 24px 24px' }}>
          <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 600, color: C.textSec, textAlign: 'center' }}>
            Enter your PIN to continue
          </p>

          {/* PIN dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i < pin.length ? C.primary : C.elevated,
                border: `2px solid ${i < pin.length ? C.primary : C.border}`,
                transition: 'background 0.15s, border-color 0.15s',
              }} />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <p style={{
              margin: '0 0 12px', fontSize: 12, fontWeight: 600, textAlign: 'center',
              color: C.error, background: 'rgba(183,28,28,0.07)',
              padding: '6px 10px', borderRadius: 8,
            }}>
              {error}
            </p>
          )}

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {PAD.flat().map((key, idx) => {
              if (!key) return <div key={idx} />;
              return (
                <button
                  key={key + idx}
                  onClick={() => handleKey(key)}
                  disabled={loading || (key !== 'DEL' && pin.length >= 4)}
                  style={{
                    height: 52, borderRadius: 11,
                    border: `1px solid ${C.border}`,
                    background: key === 'DEL' ? '#FAF7F5' : C.surface,
                    fontSize: key === 'DEL' ? 14 : 20,
                    fontWeight: 700, color: C.textPri,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.1s',
                    opacity: loading ? 0.5 : 1,
                    fontFamily: FONT,
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.background = C.elevated; }}
                  onMouseUp={(e)   => { e.currentTarget.style.background = key === 'DEL' ? '#FAF7F5' : C.surface; }}
                  onMouseLeave={(e)=> { e.currentTarget.style.background = key === 'DEL' ? '#FAF7F5' : C.surface; }}
                >
                  {key === 'DEL'
                    ? <BackspaceOutlinedIcon sx={{ fontSize: 18, color: C.textSec }} />
                    : key}
                </button>
              );
            })}
          </div>

          {/* Force logout link */}
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <button
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
              style={{
                fontSize: 11, fontWeight: 600, color: C.textDim,
                background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline', fontFamily: FONT,
              }}
            >
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
