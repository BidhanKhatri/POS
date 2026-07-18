import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { useWebAuthn } from '../hooks/useWebAuthn';
import useAuthStore from '../store/useAuthStore';
import { API_URL as API } from '../config/api';

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
};

const FONT = "'Plus Jakarta Sans', sans-serif";

const numKey =
  'flex items-center justify-center rounded-2xl select-none transition-all duration-150 ' +
  'bg-white border border-[#DDD2CC] ' +
  'shadow-[0_4px_0_#c4b8b2,0_6px_12px_rgba(0,0,0,0.06)] ' +
  'hover:bg-[#F5F0EC]/70 ' +
  'active:translate-y-[4px] active:shadow-[0_0px_0_#c4b8b2,0_2px_4px_rgba(0,0,0,0.04)]';

function getAutoDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'My Device';
}

/* ── PIN dots ── */
function PinDots({ pin, error: hasError }) {
  return (
    <div className="flex gap-5 justify-center">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="rounded-full border-2 transition-colors duration-150"
          style={{
            width: 18, height: 18,
            backgroundColor: hasError
              ? (i < pin.length ? C.error : 'transparent')
              : (i < pin.length ? C.primary : 'transparent'),
            borderColor: hasError ? C.error : (i < pin.length ? C.primary : C.border),
          }}
        />
      ))}
    </div>
  );
}

/* ── Numpad ── */
function NumPad({ pin, setPin, disabled }) {
  const add = (n) => { if (pin.length < 4 && !disabled) setPin(p => p + n); };
  const back = () => { if (!disabled) setPin(p => p.slice(0, -1)); };
  const clr  = () => { if (!disabled) setPin(''); };

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {[1,2,3,4,5,6,7,8,9].map(n => (
        <button key={n} onClick={() => add(n.toString())}
          className={`${numKey} ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
          style={{ height: 64, fontSize: 28, fontWeight: 700, color: C.textPri, lineHeight: '32px' }}>
          {n}
        </button>
      ))}
      <button onClick={clr}
        className={`flex items-center justify-center rounded-2xl select-none transition-all duration-150 active:translate-y-[4px] ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
        style={{ height: 64, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', background: C.error, color: '#fff', border: '1px solid #991717', boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }}>
        CLR
      </button>
      <button onClick={() => add('0')}
        className={`${numKey} ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
        style={{ height: 64, fontSize: 28, fontWeight: 700, color: C.textPri, lineHeight: '32px' }}>
        0
      </button>
      <button onClick={back}
        className={`flex items-center justify-center rounded-2xl select-none transition-all duration-150 active:translate-y-[4px] ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
        style={{ height: 64, background: '#F5F0EC', color: C.primary, border: `1px solid ${C.border}`, boxShadow: '0 4px 0 #c4b8b2' }}>
        <BackspaceOutlinedIcon sx={{ fontSize: 20 }} />
      </button>
    </div>
  );
}

/* ── Skip link ── */
function SkipLink({ onSkip }) {
  return (
    <button onClick={onSkip} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontSize: 13, fontWeight: 500, color: C.textDim, padding: '6px 0',
      fontFamily: FONT, textAlign: 'center', width: '100%',
    }}>
      Skip, set up later
    </button>
  );
}

/* ─────────── Shared frame ───────────
   Desktop: centers the step content as a modal card over a dimmed backdrop.
   Mobile: unchanged — full-screen layout, no backdrop/card. */
function StepFrame({ children }) {
  const isDesktop = useMediaQuery('(min-width:1024px)');

  if (isDesktop) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1300,
        background: 'rgba(43,29,26,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto',
          background: C.bg, borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)',
          padding: '40px 36px', fontFamily: FONT,
        }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-center px-5 py-10">
      {children}
    </div>
  );
}

/* ─────────── Step 1: Prompt ─────────── */
function PromptStep({ onSetUp, onSkip }) {
  return (
    <StepFrame>
      <div className="w-full max-w-sm flex flex-col items-center gap-7 text-center">
        <div style={{
          width: 92, height: 92, borderRadius: 26,
          background: 'rgba(62,39,35,0.09)',
          border: '1.5px solid rgba(62,39,35,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FingerprintIcon sx={{ fontSize: 48, color: C.primary }} />
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px', lineHeight: '30px' }}>
            Enable Biometric Login
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 14, color: C.textSec, lineHeight: '22px' }}>
            Sign in faster with Face ID, Touch ID, or your fingerprint — no PIN needed next time.
          </p>
        </div>

        <div style={{
          width: '100%',
          background: 'rgba(212,163,115,0.1)',
          border: '1px solid rgba(212,163,115,0.3)',
          borderRadius: 12, padding: '14px 16px', textAlign: 'left',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#8B6914', lineHeight: '19px', fontWeight: 500 }}>
            Your biometric data stays on your device. Only a secure cryptographic key is stored on our servers — we never see your fingerprint or face.
          </p>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={onSetUp} style={{
            width: '100%', minHeight: 52,
            background: C.primary, color: '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <FingerprintIcon sx={{ fontSize: 20 }} />
            Set Up Now
          </button>
          <SkipLink onSkip={onSkip} />
        </div>
      </div>
    </StepFrame>
  );
}

/* ─────────── Step 2: Login ─────────── */
function LoginStep({ email, setEmail, pin, setPin, onLogin, loading, error, onSkip }) {
  const canSubmit = email.trim() && pin.length === 4 && !loading;

  const handlePinDigit = (digit) => {
    setPin(prev => {
      const next = prev.length < 4 ? prev + digit : prev;
      if (next.length === 4 && email.trim() && !loading) {
        setTimeout(() => onLogin(next), 0);
      }
      return next;
    });
  };

  const handleSetPin = (valOrFn) => {
    if (typeof valOrFn === 'function') {
      setPin(prev => {
        const next = valOrFn(prev);
        if (next.length === 4 && email.trim() && !loading) {
          setTimeout(() => onLogin(next), 0);
        }
        return next;
      });
    } else {
      setPin(valOrFn);
    }
  };

  return (
    <StepFrame>
      <div className="w-full max-w-sm flex flex-col gap-5">
        <div className="text-center">
          <div style={{
            width: 56, height: 56, borderRadius: 15,
            background: 'rgba(62,39,35,0.09)',
            border: '1.5px solid rgba(62,39,35,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <FingerprintIcon sx={{ fontSize: 28, color: C.primary }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
            Confirm Your Identity
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: C.textSec, lineHeight: '19px' }}>
            Enter your PIN to link biometrics to your account
          </p>
        </div>

        {/* Email */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: 'inset 0 2px 4px rgba(62,39,35,0.05)',
        }}>
          <EmailOutlinedIcon sx={{ fontSize: 18, color: C.textDim, flexShrink: 0 }} />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 16, color: C.textPri, background: 'transparent', fontFamily: FONT,
            }}
          />
        </div>

        {/* PIN dots + error */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 4 }}>
          <PinDots pin={pin} error={!!error} />
          {error && (
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.error, textAlign: 'center' }}>
              {error}
            </p>
          )}
        </div>

        <NumPad pin={pin} setPin={handleSetPin} disabled={loading} />

        <button
          onClick={() => onLogin(pin)}
          disabled={!canSubmit}
          style={{
            width: '100%', minHeight: 50,
            background: canSubmit ? C.primary : '#D5CBC7',
            color: canSubmit ? '#fff' : '#A09490',
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, fontFamily: FONT,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Checking…' : 'Continue'}
        </button>

        <SkipLink onSkip={onSkip} />
      </div>
    </StepFrame>
  );
}

/* ─────────── Step 3: Register ─────────── */
function RegisterStep({ onRegister, registering, error, onSkip }) {
  return (
    <StepFrame>
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div style={{
          width: 96, height: 96, borderRadius: 26,
          background: error ? 'rgba(183,28,28,0.08)' : 'rgba(62,39,35,0.09)',
          border: `1.5px solid ${error ? 'rgba(183,28,28,0.25)' : 'rgba(62,39,35,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {error
            ? <WarningAmberOutlinedIcon sx={{ fontSize: 48, color: C.error }} />
            : <FingerprintIcon sx={{ fontSize: 48, color: registering ? C.accent : C.primary }} />
          }
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
            {error ? 'Setup Failed' : registering ? 'Waiting for Biometric…' : 'Add This Device'}
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: C.textSec, lineHeight: '20px' }}>
            {error
              ? error
              : registering
                ? 'Follow the prompt on your device to complete setup.'
                : 'Tap the button below to register your fingerprint, Face ID, or device PIN.'}
          </p>
        </div>

        {!registering && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={onRegister} style={{
              width: '100%', minHeight: 52,
              background: C.primary, color: '#fff',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <FingerprintIcon sx={{ fontSize: 20 }} />
              {error ? 'Try Again' : 'Add This Device'}
            </button>
            <SkipLink onSkip={onSkip} />
          </div>
        )}
      </div>
    </StepFrame>
  );
}

/* ─────────── Step 4: Done ─────────── */
function DoneStep() {
  return (
    <StepFrame>
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div style={{
          width: 92, height: 92, borderRadius: 26,
          background: 'rgba(46,125,79,0.11)',
          border: '1.5px solid rgba(46,125,79,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircleOutlinedIcon sx={{ fontSize: 48, color: C.success }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
            Biometric Login Enabled!
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: C.textSec, lineHeight: '19px' }}>
            You're all set. Taking you to the terminal…
          </p>
        </div>
      </div>
    </StepFrame>
  );
}

/* ─────────────────────────────────────────────
   Main BiometricOnboardingPage
───────────────────────────────────────────── */
export default function BiometricOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || '';

  const { token, setTrustedSession } = useAuthStore();
  const { supported, registering, registerBiometric } = useWebAuthn();

  // If already authenticated, skip prompt + login and go straight to registration
  const [step, setStep] = useState(() => token ? 'register' : 'prompt');
  const [email, setEmail] = useState(initialEmail);
  const [pin, setPin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [regError, setRegError] = useState('');

  const deviceName = getAutoDeviceName();

  const skipToLogin = useCallback(() => {
    navigate(token ? '/employee/terminal' : '/login', { replace: true });
  }, [navigate, token]);

  const skipToTerminal = useCallback(() => {
    navigate('/employee/terminal', { replace: true });
  }, [navigate]);

  // If device doesn't support WebAuthn, redirect immediately
  if (!supported) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleLogin = async (currentPin) => {
    const pinToUse = currentPin || pin;
    if (!email.trim() || pinToUse.length < 4) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), pin: pinToUse }),
      });
      const data = await res.json();

      if (res.status === 403 && data.accountStatus) {
        // Account pending/suspended — can't register biometrics yet
        const msgs = {
          PENDING:   'Your account is awaiting manager approval. Set up biometrics once it\'s approved.',
          SUSPENDED: 'Your account is suspended. Contact your manager.',
          REJECTED:  'Your account was not approved.',
        };
        setLoginError(msgs[data.accountStatus] || data.message);
        setPin('');
        return;
      }

      if (!res.ok) {
        setLoginError('Invalid email or PIN');
        setPin('');
        return;
      }

      // Success — store auth then advance to registration
      setTrustedSession(data, data.token, data.refreshToken);
      setPin('');
      setStep('register');
    } catch {
      setLoginError('Connection error. Please try again.');
      setPin('');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = useCallback(async () => {
    setRegError('');
    try {
      await registerBiometric(deviceName);
      setStep('done');
      // Auto-navigate after success
      setTimeout(() => navigate('/employee/terminal', { replace: true }), 2000);
    } catch (err) {
      setRegError(err.message || 'Biometric registration failed. Please try again.');
    }
  }, [registerBiometric, deviceName, navigate]);

  if (step === 'prompt') {
    return <PromptStep onSetUp={() => setStep('login')} onSkip={skipToLogin} />;
  }

  if (step === 'login') {
    return (
      <LoginStep
        email={email}
        setEmail={setEmail}
        pin={pin}
        setPin={setPin}
        onLogin={handleLogin}
        loading={loginLoading}
        error={loginError}
        onSkip={skipToLogin}
      />
    );
  }

  if (step === 'register') {
    return (
      <RegisterStep
        onRegister={handleRegister}
        registering={registering}
        error={regError}
        onSkip={skipToTerminal}
      />
    );
  }

  return <DoneStep />;
}
