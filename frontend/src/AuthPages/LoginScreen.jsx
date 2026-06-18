import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, InputAdornment } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import useAuthStore from '../store/useAuthStore';
import { useWebAuthn } from '../hooks/useWebAuthn';

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60;

/* ─────────────────────────────────────────────
   Main LoginScreen
───────────────────────────────────────────── */
const LoginScreen = () => {
  const navigate = useNavigate();
  const { lastEmail, setLastEmail, setUser, setToken } = useAuthStore();
  const { supported, authenticating, loginWithBiometric } = useWebAuthn();

  const [email, setEmail] = useState(lastEmail || '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  // Error / shake state
  const [shake, setShake] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Lockout
  const [attempts, setAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lockoutRef = useRef(null);

  const isLocked = lockoutSeconds > 0;

  // Countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    lockoutRef.current = setInterval(() => {
      setLockoutSeconds((s) => {
        if (s <= 1) {
          clearInterval(lockoutRef.current);
          setAttempts(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(lockoutRef.current);
  }, [lockoutSeconds > 0]);

  const triggerShake = () => {
    setPinError(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => setPinError(false), 1200);
  };

  const handleNumber = (num) => {
    if (pin.length < 4 && !isLocked && !loading) setPin(prev => prev + num);
  };
  const handleClear = () => { if (!isLocked && !loading) setPin(''); };
  const handleBackspace = () => { if (!isLocked && !loading) setPin(prev => prev.slice(0, -1)); };

  // Keyboard support
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isLocked || loading) return;
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
      else if (e.key === 'Backspace') handleBackspace();
      else if (e.key === 'Escape' || e.key === 'Delete') handleClear();
      else if (e.key === 'Enter') handleClockIn();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, isLocked, loading, email]);

  const handleClockIn = async () => {
    if (isLocked || loading) return;
    if (!email.trim()) return;
    if (pin.length < 4) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), pin }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login failed');

      // Success — persist email and user in store, redirect by role
      setLastEmail(email.trim());
      setUser(data);
      setToken(data.token);
      navigate('/employee/terminal', { replace: true });
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      triggerShake();

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutSeconds(LOCKOUT_SECONDS);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (authenticating) return;
    setBiometricError('');
    try {
      const data = await loginWithBiometric(email.trim() || undefined);
      setLastEmail(data.email || email.trim());
      setUser(data);
      setToken(data.token);
      navigate('/employee/terminal', { replace: true });
    } catch (err) {
      setBiometricError(err.message || 'Biometric login failed. Try your PIN instead.');
    }
  };

  /* ── PIN dot row — red on error, normal otherwise ── */
  const PinDots = () => (
    <div className={shake ? 'pin-shake' : ''}>
      <div className="flex gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-full border-2 transition-colors duration-150"
            style={{
              width: 18,
              height: 18,
              backgroundColor: pinError
                ? (i < pin.length ? '#B71C1C' : 'transparent')
                : (i < pin.length ? 'var(--color-primary)' : 'transparent'),
              borderColor: pinError ? '#B71C1C' : 'var(--color-outline)',
            }}
          />
        ))}
      </div>

      {/* Attempt / lockout feedback */}
      <div style={{ marginTop: (isLocked || (attempts > 0 && attempts < MAX_ATTEMPTS)) ? 6 : 0, textAlign: 'center' }}>
        {isLocked ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#B71C1C', letterSpacing: '0.02em' }}>
            Too many attempts — try again in {lockoutSeconds}s
          </span>
        ) : attempts > 0 && attempts < MAX_ATTEMPTS ? (
          <span style={{ fontSize: 11, fontWeight: 500, color: '#B71C1C', letterSpacing: '0.02em' }}>
            Incorrect PIN — {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} left
          </span>
        ) : null}
      </div>
    </div>
  );

  /* ── Numpad key style ── */
  const numKey =
    'flex items-center justify-center rounded-2xl select-none transition-all duration-150 ' +
    'bg-white border border-divider-tone ' +
    'shadow-[0_4px_0_#c4b8b2,0_6px_12px_rgba(0,0,0,0.06)] ' +
    'hover:bg-surface-variant/70 ' +
    'active:translate-y-[4px] active:shadow-[0_0px_0_#c4b8b2,0_2px_4px_rgba(0,0,0,0.04)]';

  const disabledKey = 'opacity-40 pointer-events-none';

  /* ── Numpad grid ── */
  const NumGrid = ({ keyH }) => (
    <div className="grid grid-cols-3 gap-4 w-full pb-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button
          key={n}
          onClick={() => handleNumber(n.toString())}
          className={`${numKey} ${isLocked || loading ? disabledKey : 'cursor-pointer'}`}
          style={{ height: keyH, fontSize: 32, fontWeight: 700, color: '#2B1D1A', lineHeight: '36px' }}
        >
          {n}
        </button>
      ))}

      <button
        onClick={handleClear}
        className={`flex items-center justify-center rounded-2xl select-none transition-all duration-150 active:translate-y-[4px] ${isLocked || loading ? disabledKey : 'cursor-pointer'}`}
        style={{ height: keyH, fontSize: 13, fontWeight: 700, lineHeight: '16px', letterSpacing: '0.1em', background: '#B71C1C', color: '#fff', border: '1px solid #991717', boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }}
      >
        CLR
      </button>

      <button
        onClick={() => handleNumber('0')}
        className={`${numKey} ${isLocked || loading ? disabledKey : 'cursor-pointer'}`}
        style={{ height: keyH, fontSize: 32, fontWeight: 700, color: '#2B1D1A', lineHeight: '36px' }}
      >
        0
      </button>

      <button
        onClick={handleBackspace}
        className={`flex items-center justify-center rounded-2xl select-none transition-all duration-150 active:translate-y-[4px] ${isLocked || loading ? disabledKey : 'cursor-pointer'}`}
        style={{ height: keyH, background: '#F5F0EC', color: '#3E2723', border: '1px solid #DDD2CC', boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)' }}
      >
        <BackspaceOutlinedIcon sx={{ fontSize: 20 }} />
      </button>
    </div>
  );

  /* ── Action buttons ── */
  const ActionButtons = () => (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-3 w-full">
        <button
          onClick={handleClockIn}
          disabled={isLocked || loading || pin.length < 4 || !email.trim()}
          className="flex-1 flex items-center justify-center gap-2 rounded transition-opacity"
          style={{
            minHeight: 48,
            paddingTop: 14,
            paddingBottom: 14,
            backgroundColor: '#3E2723',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: '20px',
            letterSpacing: '0.25px',
            opacity: (isLocked || loading || pin.length < 4 || !email.trim()) ? 0.5 : 1,
            cursor: (isLocked || loading || pin.length < 4 || !email.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 17 }} />
          {loading ? 'CHECKING…' : isLocked ? `LOCKED ${lockoutSeconds}s` : 'CLOCK IN'}
        </button>

        <button
          className="flex-1 flex items-center justify-center gap-2 rounded border border-primary bg-transparent hover:bg-surface-variant transition-colors cursor-pointer"
          style={{
            minHeight: 48,
            paddingTop: 14,
            paddingBottom: 14,
            color: '#3E2723',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: '20px',
            letterSpacing: '0.25px',
          }}
          onClick={() => navigate('/signup')}
        >
          <PersonAddAltIcon sx={{ fontSize: 17 }} />
          SIGN UP
        </button>
      </div>

      {/* Biometric login — only shown when device supports WebAuthn */}
      {supported && (
        <div className="flex flex-col gap-1 w-full">
          <button
            onClick={handleBiometricLogin}
            disabled={authenticating || isLocked}
            className="w-full flex items-center justify-center gap-2 rounded transition-all"
            style={{
              minHeight: 44,
              border: '1px solid #DDD2CC',
              background: authenticating ? '#F5F0EC' : '#ffffff',
              color: authenticating ? '#A09490' : '#3E2723',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.1em',
              cursor: (authenticating || isLocked) ? 'not-allowed' : 'pointer',
              opacity: isLocked ? 0.4 : 1,
              boxShadow: '0 2px 0 #c4b8b2',
            }}
          >
            <FingerprintIcon sx={{ fontSize: 20, color: authenticating ? '#A09490' : '#3E2723' }} />
            {authenticating ? 'WAITING FOR BIOMETRIC…' : 'USE BIOMETRIC LOGIN'}
          </button>
          {biometricError && (
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#B71C1C', textAlign: 'center' }}>
              {biometricError}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[500px] flex flex-col gap-5">

          {/* Status bar */}
          <div className="flex items-center justify-center gap-2 py-4 px-4 bg-surface border border-divider-tone rounded-xl sm:rounded-full">
            <LockOutlinedIcon sx={{ fontSize: 16 }} className="text-on-surface-variant" />
            <span
              className="text-on-surface-variant uppercase"
              style={{ fontSize: 12, fontWeight: 600, lineHeight: '16px', letterSpacing: '0.12em' }}
            >
              Terminal Secure — Please Enter PIN
            </span>
          </div>

          {/* Email field — 3D elevated card */}
          <div
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f5f0ec 100%)',
              border: '1px solid #DDD2CC',
              borderRadius: 12,
              padding: '20px 20px 16px',
              boxShadow: '0 4px 0 #c8bdb8, 0 6px 16px rgba(62,39,35,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ fontSize: 20, color: email ? '#3E2723' : '#A09490' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: 14,
                  fontWeight: 500,
                  boxShadow: 'inset 0 2px 4px rgba(62,39,35,0.06)',
                  '& fieldset': { borderColor: '#DDD2CC', borderWidth: '1.5px' },
                  '&:hover fieldset': { borderColor: '#6D4C41' },
                  '&.Mui-focused fieldset': { borderColor: '#3E2723', borderWidth: '2px' },
                },
                '& .MuiInputLabel-root': {
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#6B5B57',
                  '&.Mui-focused': { color: '#3E2723' },
                },
                '& .MuiInputLabel-shrink': { fontWeight: 600, fontSize: 13 },
              }}
            />
          </div>

          {/* Keypad card */}
          <div className="bg-surface border border-divider-tone rounded-xl p-6 sm:p-8 lg:p-12 flex flex-col items-center gap-6">
            <PinDots />
            <NumGrid keyH={72} />
            <ActionButtons />
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
