import React, { useState } from 'react';
import { useMediaQuery } from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import BadgeOutlinedIcon         from '@mui/icons-material/BadgeOutlined';
import EmailOutlinedIcon         from '@mui/icons-material/EmailOutlined';
import WorkOutlineOutlinedIcon   from '@mui/icons-material/WorkOutlineOutlined';
import LockOutlinedIcon          from '@mui/icons-material/LockOutlined';
import LockResetOutlinedIcon     from '@mui/icons-material/LockResetOutlined';
import VisibilityOutlinedIcon    from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import useAuthStore from '../store/useAuthStore';

const API  = import.meta.env.VITE_API_BASE_URL ?? '';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border:  '#DDD2CC', surface: '#ffffff', bg:      '#F5F3F1', elevated: '#EFE7E2',
  hover:   '#F3EDE9', success: '#2E7D4F', error:   '#B71C1C',
};

const INFO_ROWS = [
  { key: 'employeeCode', label: 'Employee Code', icon: BadgeOutlinedIcon },
  { key: 'email',        label: 'Email',         icon: EmailOutlinedIcon },
  { key: 'role',         label: 'Role',           icon: WorkOutlineOutlinedIcon },
];

function PinInput({ label, value, onChange, placeholder = '••••' }) {
  const [show, setShow] = useState(false);
  const full = value.length >= 4;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </label>
        {full && (
          <button
            type="button"
            onClick={() => { onChange(''); setShow(false); }}
            style={{ fontSize: 10, fontWeight: 700, color: C.textSec, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONT, letterSpacing: '0.04em' }}
          >
            Clear
          </button>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={4}
          value={value}
          disabled={full}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 40px 10px 14px',
            border: `1.5px solid ${full ? C.primary : C.border}`, borderRadius: 9,
            fontSize: 18, fontWeight: 800, letterSpacing: '0.25em',
            color: C.textPri, background: full ? '#FAF7F5' : C.surface, outline: 'none',
            fontFamily: 'monospace', cursor: full ? 'not-allowed' : 'text',
            opacity: 1,
          }}
        />
        {!full && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: C.textDim, display: 'flex', alignItems: 'center' }}
          >
            {show
              ? <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
              : <VisibilityOutlinedIcon    sx={{ fontSize: 16 }} />}
          </button>
        )}
        {full && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 800, color: C.primary, background: 'rgba(62,39,35,0.09)', borderRadius: 6, padding: '2px 7px', letterSpacing: '0.04em' }}>
            ✓ 4
          </div>
        )}
      </div>
    </div>
  );
}

function OtpInput({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        style={{
          padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 9,
          fontSize: 22, fontWeight: 800, letterSpacing: '0.35em',
          color: C.textPri, background: C.surface, outline: 'none',
          fontFamily: 'monospace', textAlign: 'center', width: '100%', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  const isErr = type === 'error';
  return (
    <div style={{
      padding: '9px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
      background: isErr ? 'rgba(183,28,28,0.07)' : 'rgba(46,125,79,0.08)',
      color: isErr ? C.error : C.success,
      border: `1px solid ${isErr ? 'rgba(183,28,28,0.18)' : 'rgba(46,125,79,0.18)'}`,
    }}>
      {msg}
    </div>
  );
}

function ActionBtn({ onClick, disabled, loading, children, variant = 'primary' }) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: '10px 20px', borderRadius: 9, border: isPrimary ? 'none' : `1.5px solid ${C.border}`,
        background: isPrimary ? C.primary : C.surface,
        color: isPrimary ? '#fff' : C.textSec,
        fontSize: 13, fontWeight: 700, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1, fontFamily: FONT,
        transition: 'opacity 0.15s',
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

// ── Change PIN panel ──────────────────────────────────────────────────────────
function ChangePinPanel({ token, onSwitchToReset }) {
  const [cur, setCur]   = useState('');
  const [nxt, setNxt]   = useState('');
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState({ type: '', text: '' });

  const submit = async () => {
    setMsg({ type: '', text: '' });
    if (cur.length !== 4 || nxt.length !== 4) {
      return setMsg({ type: 'error', text: 'Both PINs must be exactly 4 digits.' });
    }
    if (cur === nxt) {
      return setMsg({ type: 'error', text: 'New PIN must differ from current PIN.' });
    }
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/profile/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPin: cur, newPin: nxt }),
      });
      const d = await r.json();
      if (d.success) {
        setMsg({ type: 'success', text: 'PIN changed successfully.' });
        setCur(''); setNxt('');
      } else {
        setMsg({ type: 'error', text: d.message || 'Failed to change PIN.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PinInput label="Current PIN" value={cur} onChange={setCur} />
      <PinInput label="New PIN"     value={nxt} onChange={setNxt} />
      <StatusMsg type={msg.type} msg={msg.text} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={onSwitchToReset}
          style={{ fontSize: 12, fontWeight: 600, color: C.textSec, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: FONT }}
        >
          Forgot PIN?
        </button>
        <ActionBtn onClick={submit} loading={busy} disabled={cur.length !== 4 || nxt.length !== 4}>
          Change PIN
        </ActionBtn>
      </div>
    </div>
  );
}

// ── Reset PIN (OTP) panel ─────────────────────────────────────────────────────
function ResetPinPanel({ token, onSwitchToChange }) {
  const [step, setStep] = useState(1); // 1 = request OTP, 2 = verify + set
  const [otp,  setOtp]  = useState('');
  const [nxt,  setNxt]  = useState('');
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState({ type: '', text: '' });

  const requestOtp = async () => {
    setMsg({ type: '', text: '' });
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/profile/forgot-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) {
        setMsg({ type: 'success', text: d.message });
        setStep(2);
      } else {
        setMsg({ type: 'error', text: d.message || 'Failed to send OTP.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const resetPin = async () => {
    setMsg({ type: '', text: '' });
    if (otp.length !== 6) return setMsg({ type: 'error', text: 'Enter the 6-digit OTP from your email.' });
    if (nxt.length !== 4) return setMsg({ type: 'error', text: 'New PIN must be exactly 4 digits.' });
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/profile/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp, newPin: nxt }),
      });
      const d = await r.json();
      if (d.success) {
        setMsg({ type: 'success', text: 'PIN reset successfully. You can now use your new PIN.' });
        setStep(1); setOtp(''); setNxt('');
      } else {
        setMsg({ type: 'error', text: d.message || 'Failed to reset PIN.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {step === 1 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'rgba(62,39,35,0.05)', borderRadius: 10, border: `1px solid ${C.elevated}` }}>
            <MarkEmailReadOutlinedIcon sx={{ fontSize: 18, color: C.primary, flexShrink: 0, mt: '1px' }} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: C.textSec, lineHeight: 1.5 }}>
              A 6-digit OTP will be sent to your registered email address. It expires in 2 minutes.
            </p>
          </div>
          <StatusMsg type={msg.type} msg={msg.text} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={onSwitchToChange}
              style={{ fontSize: 12, fontWeight: 600, color: C.textSec, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: FONT }}
            >
              ← Back to Change PIN
            </button>
            <ActionBtn onClick={requestOtp} loading={busy}>
              Send OTP
            </ActionBtn>
          </div>
        </>
      ) : (
        <>
          <StatusMsg type={msg.type} msg={msg.text} />
          <OtpInput label="6-Digit OTP" value={otp} onChange={setOtp} />
          <PinInput label="New PIN"     value={nxt}  onChange={setNxt} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setStep(1); setOtp(''); setNxt(''); setMsg({ type: '', text: '' }); }}
              style={{ fontSize: 12, fontWeight: 600, color: C.textSec, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: FONT }}
            >
              Resend OTP
            </button>
            <ActionBtn onClick={resetPin} loading={busy} disabled={otp.length !== 6 || nxt.length !== 4}>
              Reset PIN
            </ActionBtn>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const user      = useAuthStore((s) => s.user);
  const { token } = useAuthStore();
  const isDesktop = useMediaQuery('(min-width:1024px)');

  const [pinMode, setPinMode] = useState('change'); // 'change' | 'reset'

  const initials = (user?.name || 'E').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  // ── Profile info block ───────────────────────────────────────────────────
  const profileCard = (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Avatar hero */}
      <div style={{ padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}`, background: '#FAF7F5' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, background: C.elevated,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 900, color: C.primary, letterSpacing: '-0.5px',
          border: `2px solid ${C.border}`,
        }}>
          {initials}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.textPri }}>{user?.name || 'Employee'}</p>
          {user?.employeeCode && (
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em' }}>
              {user.employeeCode}
            </p>
          )}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
          padding: '3px 10px', borderRadius: 20,
          background: 'rgba(62,39,35,0.09)', color: C.primary,
        }}>
          {user?.role || 'Employee'}
        </span>
      </div>

      {/* Info rows */}
      {INFO_ROWS.map(({ key, label, icon: Icon }, i) => (
        <div key={key} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 18px',
          borderBottom: i < INFO_ROWS.length - 1 ? `1px solid #F0E8E4` : 'none',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon sx={{ fontSize: 16, color: C.primary }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ margin: '1px 0 0', fontSize: 14, fontWeight: 700, color: C.textPri, wordBreak: 'break-all' }}>
              {user?.[key] || '—'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Security / PIN block ─────────────────────────────────────────────────
  const securityCard = (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, background: '#FAF7F5', display: 'flex', alignItems: 'center', gap: 8 }}>
        {pinMode === 'change'
          ? <LockOutlinedIcon      sx={{ fontSize: 14, color: C.primary }} />
          : <LockResetOutlinedIcon sx={{ fontSize: 14, color: C.primary }} />}
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textPri }}>
          {pinMode === 'change' ? 'Change PIN' : 'Reset PIN via Email'}
        </p>
      </div>

      <div style={{ padding: '18px 18px' }}>
        {pinMode === 'change' ? (
          <ChangePinPanel token={token} onSwitchToReset={() => setPinMode('reset')} />
        ) : (
          <ResetPinPanel  token={token} onSwitchToChange={() => setPinMode('change')} />
        )}
      </div>
    </div>
  );

  const wrapper = isDesktop
    ? { padding: '28px 32px 40px', fontFamily: FONT, minHeight: '100dvh' }
    : { padding: '20px 16px 32px', maxWidth: 520, margin: '0 auto', fontFamily: FONT };

  return (
    <div style={wrapper}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AccountCircleOutlinedIcon sx={{ fontSize: 22, color: C.primary }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
            Profile
          </h1>
        </div>
      </div>

      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
          {profileCard}
          {securityCard}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {profileCard}
          {securityCard}
        </div>
      )}
    </div>
  );
}
