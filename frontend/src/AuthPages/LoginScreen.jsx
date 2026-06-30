import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextField, InputAdornment } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import useAuthStore from '../store/useAuthStore';
import { useWebAuthn } from '../hooks/useWebAuthn';
import { useLoading } from '../context/LoadingContext';
import toast, { Toaster } from 'react-hot-toast';

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60;

/* ── Account status screens (shown instead of the keypad) ── */
function AccountStatusScreen({ accountStatus, message, onBack }) {
  const isPending    = accountStatus === 'PENDING';
  const isEmsRequired = accountStatus === 'EMS_REQUIRED';
  const color      = isPending ? '#D4A373' : isEmsRequired ? '#0277BD' : '#B71C1C';
  const bgColor    = isPending ? 'rgba(212,163,115,0.1)' : isEmsRequired ? 'rgba(2,119,189,0.07)' : 'rgba(183,28,28,0.07)';
  const borderColor = isPending ? 'rgba(212,163,115,0.35)' : isEmsRequired ? 'rgba(2,119,189,0.22)' : 'rgba(183,28,28,0.25)';

  const headings = {
    PENDING:      'Awaiting Approval',
    SUSPENDED:    'Account Suspended',
    REJECTED:     'Access Denied',
    EMS_REQUIRED: 'Wrong Email',
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
        <div style={{
          width: 68, height: 68, borderRadius: 18,
          background: bgColor, border: `1.5px solid ${borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPending
            ? <HourglassEmptyOutlinedIcon sx={{ fontSize: 34, color }} />
            : <BlockOutlinedIcon sx={{ fontSize: 34, color }} />}
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.3px' }}>
            {headings[accountStatus] ?? 'Access Denied'}
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6B5B57', lineHeight: '19px', maxWidth: 320 }}>
            {message}
          </p>
        </div>

        {isPending && (
          <div style={{
            width: '100%', background: 'rgba(2,119,189,0.05)',
            border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '12px 16px', textAlign: 'left',
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#01579B', lineHeight: '18px', fontWeight: 500 }}>
              A manager will review your account in the <strong>Manager Portal → Accounts</strong> section. Check back later or contact your supervisor.
            </p>
          </div>
        )}

        {isEmsRequired && (
          <div style={{
            width: '100%', background: 'rgba(2,119,189,0.05)',
            border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '12px 16px', textAlign: 'left',
          }}>
            <p style={{ margin: 0, fontSize: 12, color: '#01579B', lineHeight: '18px', fontWeight: 500 }}>
              This portal is linked to <strong>Staffing Betit</strong>. Sign up using the email address registered in your EMS account, then set your PIN to access the terminal.
            </p>
          </div>
        )}

        <button
          onClick={onBack}
          style={{
            width: '100%', minHeight: 46, background: '#3E2723', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main LoginScreen
───────────────────────────────────────────── */
const LoginScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastEmail, setLastEmail, setUser, setToken, hasBiometric } = useAuthStore();
  const { supported, authenticating, loginWithBiometric } = useWebAuthn();
  const { startLoading } = useLoading();

  // If arriving from email verification, the verified email takes priority over lastEmail
  const incomingEmail = location.state?.verifiedEmail || '';
  const [email, setEmail] = useState(incomingEmail || lastEmail || '');

  // Persist the verified email into the store so it survives refreshes
  useEffect(() => {
    if (incomingEmail) setLastEmail(incomingEmail);
  }, []);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  // Account status gate (PENDING / REJECTED / SUSPENDED / EMS_REQUIRED)
  const [accountStatusBlock, setAccountStatusBlock] = useState(null);

  // Persistent error message shown in the keypad card
  const [errorMsg, setErrorMsg] = useState('');

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

      if (res.status === 403 && data.accountStatus) {
        setAccountStatusBlock({ accountStatus: data.accountStatus, message: data.message });
        setPin('');
        return;
      }

      if (!res.ok) throw new Error(data.message || 'Login failed');

      // Success — persist email and user in store, redirect by role
      setErrorMsg('');
      setLastEmail(email.trim());
      setUser(data);
      setToken(data.token);
      startLoading();
      navigate('/employee/terminal', { replace: true });
    } catch (err) {
      const msg = err.message || 'Login failed';
      setErrorMsg(msg);
      toast.error(msg, {
        duration: 2500,
        style: { fontSize: 11, padding: '8px 12px', maxWidth: 280 },
      });

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
      startLoading();
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

      {/* Biometric login — only shown when device supports WebAuthn AND user has registered a passkey */}
      {supported && hasBiometric && (
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

  if (accountStatusBlock) {
    return (
      <AccountStatusScreen
        accountStatus={accountStatusBlock.accountStatus}
        message={accountStatusBlock.message}
        onBack={() => setAccountStatusBlock(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface">
      <Toaster position="top-center" toastOptions={{ style: { marginTop: 36 } }} />

      {/* Status pill — fixed at top centre */}
      <div className="flex justify-center" style={{ position: 'fixed', top: 14, left: 0, right: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div className="flex items-center gap-1.5 bg-surface border border-divider-tone rounded-full" style={{ padding: '5px 14px' }}>
          <LockOutlinedIcon sx={{ fontSize: 11 }} className="text-on-surface-variant" />
          <span
            className="text-on-surface-variant uppercase"
            style={{ fontSize: 10, fontWeight: 600, lineHeight: '14px', letterSpacing: '0.1em' }}
          >
            Terminal Secure — Please Enter PIN
          </span>
        </div>
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-[500px] flex flex-col gap-5">

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

            {/* Persistent error — cleared on next successful attempt */}
            {errorMsg && (
              <div style={{
                width: '100%',
                background: 'rgba(183,28,28,0.06)',
                border: '1px solid rgba(183,28,28,0.22)',
                borderRadius: 8,
                padding: '9px 13px',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#B71C1C', lineHeight: '16px',
                }}>
                  {errorMsg}
                </span>
              </div>
            )}

            <ActionButtons />
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
