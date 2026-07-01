import { useState, useRef, useEffect, useCallback } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import toast from 'react-hot-toast';
import { API_URL as API } from '../config/api';

const RESEND_COUNTDOWN_S = 60;

const cardStyle = {
  background: 'linear-gradient(145deg, #ffffff 0%, #f5f0ec 100%)',
  border: '1px solid #DDD2CC',
  borderRadius: 12,
  padding: '24px 20px',
  boxShadow: '0 4px 0 #c8bdb8, 0 6px 16px rgba(62,39,35,0.10)',
  width: '100%',
};

function primaryBtnStyle(disabled) {
  return {
    width: '100%',
    minHeight: 48,
    background: '#3E2723',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.25px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.15s',
  };
}

const emailFieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    fontSize: 16,
    fontWeight: 500,
    '& fieldset': { borderColor: '#DDD2CC', borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: '#6D4C41' },
    '&.Mui-focused fieldset': { borderColor: '#3E2723', borderWidth: '2px' },
  },
  '& .MuiInputLabel-root': {
    fontSize: 16,
    fontWeight: 500,
    color: '#6B5B57',
    '&.Mui-focused': { color: '#3E2723' },
  },
  '& .MuiInputLabel-shrink': { fontWeight: 600, fontSize: 13 },
};

const numKey =
  'flex items-center justify-center rounded-2xl select-none transition-all duration-150 ' +
  'bg-white border border-divider-tone ' +
  'shadow-[0_4px_0_#c4b8b2,0_6px_12px_rgba(0,0,0,0.06)] ' +
  'hover:bg-surface-variant/70 ' +
  'active:translate-y-[4px] active:shadow-[0_0px_0_#c4b8b2,0_2px_4px_rgba(0,0,0,0.04)] cursor-pointer';

// ── Step: Request OTP ──────────────────────────────────────────────────────────
function RequestStep({ email, setEmail, onSent, onBack }) {
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-pin/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Code sent — check your email', { style: { fontSize: 12 } });
      onSent();
    } catch (err) {
      toast.error(err.message || 'Failed to send code', { style: { fontSize: 12 } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[500px] flex flex-col gap-5">
      <BackLink onClick={onBack} />
      <div style={cardStyle}>
        <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#2B1D1A' }}>Reset Your PIN</p>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B5B57', lineHeight: '19px' }}>
          Enter your account email and we'll send a 6-digit code valid for 2 minutes.
        </p>
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          variant="outlined"
          sx={{ ...emailFieldSx, mb: '20px' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon sx={{ fontSize: 20, color: email ? '#3E2723' : '#A09490' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <button onClick={handleSend} disabled={loading || !email.trim()} style={primaryBtnStyle(loading || !email.trim())}>
          {loading ? 'Sending…' : 'Send Code'}
        </button>
      </div>
    </div>
  );
}

// ── Step: Verify OTP ───────────────────────────────────────────────────────────
function VerifyStep({ email, onVerified, onBack, onResend }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN_S);
  const refs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      refs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6 || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-pin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { triggerShake(); throw new Error(data.message); }
      onVerified(data.resetToken);
    } catch (err) {
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
      toast.error(err.message || 'Invalid code', { style: { fontSize: 12 } });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    await onResend();
    setOtp(['', '', '', '', '', '']);
    refs.current[0]?.focus();
    setCountdown(RESEND_COUNTDOWN_S);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const code = otp.join('');

  return (
    <div className="w-full max-w-[500px] flex flex-col gap-5">
      <BackLink onClick={onBack} />
      <div style={cardStyle}>
        <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#2B1D1A' }}>Enter Code</p>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B5B57', lineHeight: '19px' }}>
          A 6-digit code was sent to <strong style={{ color: '#3E2723' }}>{email}</strong>. It expires in 2 minutes.
        </p>

        <div className={`flex gap-2 justify-center mb-5 ${shake ? 'pin-shake' : ''}`} onPaste={handlePaste}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (refs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              autoFocus={idx === 0}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              style={{
                width: 46,
                height: 54,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: '#2B1D1A',
                border: `2px solid ${digit ? '#3E2723' : '#DDD2CC'}`,
                borderRadius: 10,
                background: '#FFFFFF',
                outline: 'none',
                boxShadow: digit ? '0 0 0 3px rgba(62,39,35,0.1)' : '0 2px 4px rgba(0,0,0,0.04)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          ))}
        </div>

        <button onClick={handleVerify} disabled={loading || code.length < 6} style={{ ...primaryBtnStyle(loading || code.length < 6), marginBottom: 14 }}>
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>

        <div style={{ textAlign: 'center' }}>
          {countdown > 0 ? (
            <span style={{ fontSize: 12, color: '#A09490' }}>Resend in {countdown}s</span>
          ) : (
            <button
              onClick={handleResend}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#3E2723', textDecoration: 'underline', padding: 0 }}
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step: Set New PIN ──────────────────────────────────────────────────────────
function ResetStep({ email, resetToken, onReset, onBack }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [pinError, setPinError] = useState(false);

  function triggerShake() {
    setPinError(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => setPinError(false), 1200);
  }

  const addDigit = useCallback((d) => { if (!loading) setPin(p => p.length < 4 ? p + d : p); }, [loading]);
  const backspace = useCallback(() => { if (!loading) setPin(p => p.slice(0, -1)); }, [loading]);
  const clear = useCallback(() => { if (!loading) setPin(''); }, [loading]);

  const handleReset = async () => {
    if (pin.length < 4 || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-pin/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), resetToken, newPin: pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        triggerShake();
        throw new Error(data.message);
      }
      onReset();
    } catch (err) {
      toast.error(err.message || 'Failed to update PIN', { style: { fontSize: 12 } });
      if (err.message?.toLowerCase().includes('expired')) onBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= '0' && e.key <= '9') addDigit(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') clear();
      else if (e.key === 'Enter' && pin.length === 4) handleReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pin, loading]);

  return (
    <div className="w-full max-w-[500px] flex flex-col gap-5">
      <BackLink onClick={onBack} />
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#2B1D1A' }}>Set New PIN</p>
          <p style={{ margin: 0, fontSize: 13, color: '#6B5B57' }}>Enter a new 4-digit PIN</p>
        </div>

        {/* PIN dots */}
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
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-4 w-full pb-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => addDigit(String(n))}
              className={`${numKey} ${loading ? 'opacity-40 pointer-events-none' : ''}`}
              style={{ height: 72, fontSize: 32, fontWeight: 700, color: '#2B1D1A' }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={clear}
            className="flex items-center justify-center rounded-2xl select-none transition-all duration-150 active:translate-y-[4px] cursor-pointer"
            style={{ height: 72, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', background: '#B71C1C', color: '#fff', border: '1px solid #991717', boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }}
          >
            CLR
          </button>
          <button
            onClick={() => addDigit('0')}
            className={`${numKey} ${loading ? 'opacity-40 pointer-events-none' : ''}`}
            style={{ height: 72, fontSize: 32, fontWeight: 700, color: '#2B1D1A' }}
          >
            0
          </button>
          <button
            onClick={backspace}
            className="flex items-center justify-center rounded-2xl select-none transition-all duration-150 active:translate-y-[4px] cursor-pointer"
            style={{ height: 72, background: '#F5F0EC', color: '#3E2723', border: '1px solid #DDD2CC', boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)' }}
          >
            <BackspaceOutlinedIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        <button onClick={handleReset} disabled={loading || pin.length < 4} style={primaryBtnStyle(loading || pin.length < 4)}>
          {loading ? 'Updating PIN…' : 'Set New PIN'}
        </button>
      </div>
    </div>
  );
}

// ── Step: Success ──────────────────────────────────────────────────────────────
function SuccessStep() {
  return (
    <div className="w-full max-w-[500px]">
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: 'rgba(46,125,79,0.10)', border: '1px solid rgba(46,125,79,0.25)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#2E7D4F' }} />
        </div>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#2B1D1A' }}>PIN Updated</p>
          <p style={{ margin: 0, fontSize: 13, color: '#6B5B57', lineHeight: '19px' }}>
            Your PIN has been reset. Redirecting to login…
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Shared: Back link ──────────────────────────────────────────────────────────
function BackLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#6B5B57', fontSize: 13, fontWeight: 600, padding: 0, alignSelf: 'flex-start' }}
    >
      <ArrowBackIcon sx={{ fontSize: 16 }} />
      Back to Login
    </button>
  );
}

// ── Root: ForgotPinFlow ────────────────────────────────────────────────────────
// Steps: request → verify → reset → success → (calls onSuccess)
export default function ForgotPinFlow({ initialEmail = '', onBack, onSuccess }) {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState(initialEmail);
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    if (step !== 'success') return;
    const t = setTimeout(() => onSuccess(email), 2000);
    return () => clearTimeout(t);
  }, [step]);

  const handleResend = async () => {
    try {
      const res = await fetch(`${API}/api/auth/forgot-pin/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('New code sent', { style: { fontSize: 12 } });
    } catch (err) {
      toast.error(err.message || 'Failed to resend code', { style: { fontSize: 12 } });
    }
  };

  if (step === 'request') return (
    <RequestStep
      email={email}
      setEmail={setEmail}
      onSent={() => setStep('verify')}
      onBack={onBack}
    />
  );

  if (step === 'verify') return (
    <VerifyStep
      email={email}
      onVerified={(token) => { setResetToken(token); setStep('reset'); }}
      onBack={onBack}
      onResend={handleResend}
    />
  );

  if (step === 'reset') return (
    <ResetStep
      email={email}
      resetToken={resetToken}
      onReset={() => setStep('success')}
      onBack={onBack}
    />
  );

  return <SuccessStep />;
}
