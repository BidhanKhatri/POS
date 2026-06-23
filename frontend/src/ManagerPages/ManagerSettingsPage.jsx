import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, useMediaQuery } from '@mui/material';
import SyncOutlinedIcon              from '@mui/icons-material/SyncOutlined';
import EmailOutlinedIcon             from '@mui/icons-material/EmailOutlined';
import CheckCircleOutlineIcon        from '@mui/icons-material/CheckCircleOutlined';
import InfoOutlinedIcon              from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon      from '@mui/icons-material/WarningAmberOutlined';
import SendOutlinedIcon              from '@mui/icons-material/SendOutlined';
import DnsOutlinedIcon               from '@mui/icons-material/DnsOutlined';
import LockOutlinedIcon              from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon            from '@mui/icons-material/PersonOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import DeleteOutlineOutlinedIcon     from '@mui/icons-material/DeleteOutlineOutlined';
import KeyOutlinedIcon               from '@mui/icons-material/KeyOutlined';
import BackspaceOutlinedIcon         from '@mui/icons-material/BackspaceOutlined';
import CloseOutlinedIcon             from '@mui/icons-material/CloseOutlined';
import AddOutlinedIcon               from '@mui/icons-material/AddOutlined';
import RefreshOutlinedIcon           from '@mui/icons-material/RefreshOutlined';
import FingerprintOutlinedIcon       from '@mui/icons-material/FingerprintOutlined';
import useAuthStore from '../store/useAuthStore';
import BiometricSetup from '../components/BiometricSetup/BiometricSetup';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

const C = {
  primary: '#3E2723', primaryLt: '#5A3A33',
  accent: '#D4A373', bg: '#F5F3F1', surface: '#ffffff',
  elevated: '#EFE7E2', border: '#DDD2CC',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
};

const TABS = [
  { key: 'email',     label: 'Email Config',        icon: EmailOutlinedIcon },
  { key: 'managers',  label: 'Manager Management',  icon: AdminPanelSettingsOutlinedIcon },
  { key: 'biometric', label: 'Biometric',           icon: FingerprintOutlinedIcon },
];

/* ── Reusable toggle switch ── */
function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label="Toggle"
      style={{
        position: 'relative', width: 46, height: 26, borderRadius: 13,
        background: enabled ? C.success : C.border,
        border: 'none', cursor: disabled ? 'wait' : 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: enabled ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

/* ── Setting row ── */
function SettingRow({ icon: Icon, iconColor, iconBg, title, description, control }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 20, color: iconColor }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{title}</p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: C.textSec, lineHeight: '16px' }}>{description}</p>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

/* ── Info banner ── */
function InfoBanner({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)',
      borderRadius: 10, padding: '11px 14px',
    }}>
      <InfoOutlinedIcon sx={{ fontSize: 15, color: C.info, flexShrink: 0, marginTop: '1px' }} />
      <p style={{ margin: 0, fontSize: 12, color: '#01579B', fontWeight: 500, lineHeight: '18px' }}>
        {children}
      </p>
    </div>
  );
}

/* ── Email config field ── */
function EmailField({ label, name, value, onChange, placeholder, type = 'text', icon: Icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon sx={{ fontSize: 13, color: C.textDim }} />}
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#fff', borderRadius: 8,
        border: `${focused ? 1.5 : 1}px solid ${focused ? C.primary : C.border}`,
        boxShadow: focused ? `0 0 0 3px rgba(62,39,35,0.07)` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s', overflow: 'hidden',
      }}>
        {Icon && (
          <span style={{ paddingLeft: 11, display: 'flex', alignItems: 'center', color: focused ? C.primary : '#A09490', flexShrink: 0 }}>
            <Icon sx={{ fontSize: 16 }} />
          </span>
        )}
        <input
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            padding: '10px 12px', fontSize: 13, color: C.textPri, lineHeight: '18px',
          }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   TAB: Sync Data
══════════════════════════════════ */
function SyncDataTab({ token }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [syncEnabled, setSyncEnabled]   = useState(false);
  const [syncLoading, setSyncLoading]   = useState(true);
  const [syncToggling, setSyncToggling] = useState(false);
  const [saved, setSaved]               = useState(false);

  useEffect(() => {
    setSyncLoading(true);
    fetch(`${API}/api/settings/sync-staffing`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setSyncEnabled(d.syncStaffingBetit ?? false))
      .catch(() => {})
      .finally(() => setSyncLoading(false));
  }, [token]);

  const toggleSync = async () => {
    setSyncToggling(true);
    setSaved(false);
    try {
      const res = await fetch(`${API}/api/settings/sync-staffing`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ syncStaffingBetit: !syncEnabled }),
      });
      const data = await res.json();
      setSyncEnabled(data.syncStaffingBetit);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
    } finally {
      setSyncToggling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoBanner>
        When <strong>Sync Staffing Betit</strong> is enabled, new employee signups are verified against your
        Staffing Betit (EMS) account before a POS account is created. Employees must use their registered
        work email and verify it via email link.
      </InfoBanner>

      <SettingRow
        icon={SyncOutlinedIcon}
        iconColor={syncEnabled ? C.success : C.textDim}
        iconBg={syncEnabled ? 'rgba(46,125,79,0.10)' : C.elevated}
        title="Sync Staffing Betit"
        description={
          syncEnabled
            ? 'Signups must use a valid Staffing Betit work email — email verification required'
            : 'Any email is accepted — no EMS validation on signup'
        }
        control={
          <Toggle
            enabled={syncEnabled}
            onToggle={toggleSync}
            disabled={syncLoading || syncToggling}
          />
        }
      />

      {saved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(46,125,79,0.08)', border: '1px solid rgba(46,125,79,0.25)',
          borderRadius: 8, padding: '9px 14px',
        }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 15, color: C.success }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.success }}>Setting saved successfully.</span>
        </div>
      )}

      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px',
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: C.textPri, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          How it works
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { n: '1', text: 'Employee visits the signup page and enters their Staffing Betit work email.' },
            { n: '2', text: 'POS verifies the email against Staffing Betit in real time.' },
            { n: '3', text: 'A verification link is sent to the employee\'s inbox (expires in 15 minutes).' },
            { n: '4', text: 'After clicking the link, the account is created as Active — no manager approval needed.' },
          ].map(({ n, text }) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: C.primary,
              }}>{n}</span>
              <p style={{ margin: 0, fontSize: 12, color: C.textSec, lineHeight: '18px' }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   TAB: Email Config
══════════════════════════════════ */
function EmailConfigTab({ token }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [form, setForm] = useState({
    smtpHost: '', smtpPort: '587', smtpSecure: false,
    smtpUser: '', smtpPass: '', smtpFrom: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg]         = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/settings/email-config`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        if (d.config) setForm(prev => ({ ...prev, ...d.config }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/settings/email-config`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      setMsg({ type: 'success', text: 'Email configuration saved.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleTest = async () => {
    setTesting(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/settings/email-config/test`, {
        method: 'POST', headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Test failed');
      setMsg({ type: 'success', text: 'Test email sent! Check your inbox.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setTesting(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <span style={{ fontSize: 13, color: C.textDim }}>Loading configuration…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoBanner>
        Configure the SMTP server used to send verification emails, receipts, and scheduled reports.
        These values map to the <strong>SMTP_*</strong> environment variables in the backend — saving here
        updates the live settings without a server restart.
      </InfoBanner>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Section label */}
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          SMTP Server
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
          <EmailField label="Host" name="smtpHost" value={form.smtpHost} onChange={onChange} placeholder="smtp.resend.com" icon={DnsOutlinedIcon} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Port</span>
            <input
              name="smtpPort"
              value={form.smtpPort}
              onChange={onChange}
              placeholder="587"
              type="number"
              style={{
                width: 72, border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none',
                padding: '10px 10px', fontSize: 13, color: C.textPri, background: '#fff',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <EmailField label="Username" name="smtpUser" value={form.smtpUser} onChange={onChange} placeholder="resend" icon={PersonOutlinedIcon} />
          <EmailField label="Password / API Key" name="smtpPass" value={form.smtpPass} onChange={onChange} placeholder="re_••••••••" type="password" icon={LockOutlinedIcon} />
        </div>

        <EmailField label="From Address" name="smtpFrom" value={form.smtpFrom} onChange={onChange} placeholder="POS System <noreply@yourdomain.com>" icon={EmailOutlinedIcon} />

        {/* TLS toggle row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.elevated, borderRadius: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Use TLS / SSL</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>Enable for port 465. Leave off for port 587 (STARTTLS).</p>
          </div>
          <Toggle
            enabled={form.smtpSecure}
            onToggle={() => setForm(prev => ({ ...prev, smtpSecure: !prev.smtpSecure }))}
          />
        </div>
      </div>

      {/* Feedback */}
      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: msg.type === 'success' ? 'rgba(46,125,79,0.08)' : 'rgba(183,28,28,0.07)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(46,125,79,0.25)' : 'rgba(183,28,28,0.22)'}`,
          borderRadius: 8, padding: '9px 14px',
        }}>
          {msg.type === 'success'
            ? <CheckCircleOutlineIcon sx={{ fontSize: 15, color: C.success }} />
            : <WarningAmberOutlinedIcon sx={{ fontSize: 15, color: C.error }} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: msg.type === 'success' ? C.success : C.error }}>
            {msg.text}
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, minHeight: 44, background: C.primary, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !form.smtpHost}
          style={{
            flex: 1, minHeight: 44, background: C.surface, color: C.primary,
            border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: (testing || !form.smtpHost) ? 'not-allowed' : 'pointer',
            opacity: (testing || !form.smtpHost) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <SendOutlinedIcon sx={{ fontSize: 15 }} />
          {testing ? 'Sending…' : 'Send Test Email'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   Manager PIN Dialog (for delete)
══════════════════════════════════ */
function ManagerPinDialog({ open, target, onClose, onConfirm, error, submitting }) {
  const [pin, setPin]     = useState('');
  const [shake, setShake] = useState(false);
  const isMobile = useMediaQuery('(max-width:480px)');

  useEffect(() => { if (open) setPin(''); }, [open]);

  useEffect(() => {
    if (pin.length === 4) {
      const t = setTimeout(() => onConfirm(pin), 120);
      return () => clearTimeout(t);
    }
  }, [pin]);

  const push  = (d) => { if (!submitting) setPin(p => p.length >= 4 ? p : p + d); };
  const del   = () => { if (!submitting) setPin(p => p.slice(0, -1)); };
  const clear = () => { if (!submitting) setPin(''); };
  const handleClose = () => { setPin(''); onClose(); };

  const ROWS = [['1','2','3'],['4','5','6'],['7','8','9']];
  const sz = isMobile ? 68 : 72;

  const keyBtn = (label, onClick, variant = 'digit') => {
    const isDigit = variant === 'digit';
    return (
      <button
        key={String(label)}
        onClick={onClick}
        disabled={submitting}
        style={{
          width: sz, height: sz, borderRadius: 14,
          border: `1px solid ${isDigit ? C.border : 'transparent'}`,
          background: isDigit ? C.surface : C.bg,
          fontSize: isDigit ? (isMobile ? 20 : 22) : 12,
          fontWeight: isDigit ? 700 : 600,
          color: isDigit ? C.textPri : C.textSec,
          cursor: submitting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDigit ? `0 3px 0 ${C.border}` : 'none',
          transition: 'box-shadow 0.1s',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          flexShrink: 0, opacity: submitting ? 0.5 : 1,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        style: {
          borderRadius: 20,
          width: isMobile ? '96vw' : 720,
          maxWidth: 720,
          margin: 'auto',
          boxShadow: '0 24px 80px rgba(42,23,21,0.22), 0 8px 24px rgba(42,23,21,0.12)',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
      slotProps={{ backdrop: { style: { backdropFilter: 'blur(3px)', background: 'rgba(42,23,21,0.35)' } } }}
    >
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.error} 0%, #7B1010 100%)`,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <LockOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Manager PIN Verification
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Remove Manager Account
            </p>
          </div>
        </div>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.6 }}>
          <CloseOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
        </button>
      </div>

      {/* Two-column body */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* LEFT */}
        <div style={{
          flex: 1, padding: isMobile ? '18px 18px 0' : '22px 24px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
          borderBottom: isMobile ? `1px solid ${C.border}` : 'none',
        }}>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Manager Details
            </p>
            {target && (
              <>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{target.name}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.primary }}>{target.employeeCode || '—'}</p>
                  </div>
                  <div style={{ background: 'rgba(183,28,28,0.06)', border: '1px solid rgba(183,28,28,0.18)', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.error, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.error }}>Permanent Remove</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* PIN bars */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Enter Your 4-Digit PIN
            </p>
            <div className={shake ? 'pin-shake' : ''} style={{
              display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 12,
              background: C.bg,
              border: `1.5px solid ${error ? C.error : pin.length === 4 ? C.error : C.border}`,
              transition: 'border-color 0.15s',
            }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  flex: 1, height: 14, borderRadius: 4,
                  background: i < pin.length ? C.error : C.border,
                  transition: 'background 0.12s',
                }} />
              ))}
            </div>
            {error && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: C.error }}>{error}</p>}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: isMobile ? 18 : 0 }}>
            <button
              onClick={handleClose}
              disabled={submitting}
              style={{
                flex: 1, height: 44, borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.surface,
                fontSize: 13, fontWeight: 600, color: C.textSec,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (pin.length < 4) { setShake(true); setTimeout(() => setShake(false), 450); return; }
                onConfirm(pin);
              }}
              disabled={submitting || pin.length < 4}
              style={{
                flex: 2, height: 44, borderRadius: 10,
                border: pin.length === 4 ? `2px solid ${C.error}` : `1px solid ${C.border}`,
                background: pin.length === 4 ? C.error : C.elevated,
                fontSize: 13, fontWeight: 700,
                color: pin.length === 4 ? '#fff' : C.textDim,
                cursor: submitting || pin.length < 4 ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.65 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: pin.length === 4 ? '0 3px 0 #7B0000' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <KeyOutlinedIcon sx={{ fontSize: 15 }} />
              {submitting ? 'Verifying…' : 'Confirm Remove'}
            </button>
          </div>
        </div>

        {/* RIGHT — numpad */}
        <div style={{
          padding: isMobile ? '18px' : '20px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: C.bg,
        }}>
          {ROWS.map(row => (
            <div key={row[0]} style={{ display: 'flex', gap: 8 }}>
              {row.map(d => keyBtn(d, () => push(d), 'digit'))}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            {keyBtn('CLR', clear, 'action')}
            {keyBtn('0', () => push('0'), 'digit')}
            {keyBtn(<BackspaceOutlinedIcon sx={{ fontSize: 18 }} />, del, 'action')}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/* ── Standalone form field (must live outside tab to avoid remount on re-render) ── */
function MgrFormField({ label, name, type = 'text', placeholder, icon: Icon, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {Icon && <Icon sx={{ fontSize: 12, color: C.textDim }} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#fff', borderRadius: 8,
        border: `${focused ? 1.5 : 1}px solid ${focused ? C.primary : C.border}`,
        boxShadow: focused ? `0 0 0 3px rgba(62,39,35,0.07)` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s', overflow: 'hidden',
      }}>
        {Icon && (
          <span style={{ paddingLeft: 10, display: 'flex', alignItems: 'center', color: focused ? C.primary : C.textDim, flexShrink: 0 }}>
            <Icon sx={{ fontSize: 15 }} />
          </span>
        )}
        <input
          name={name}
          value={value}
          onChange={onChange}
          type={type}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            padding: '10px 12px', fontSize: 13, color: C.textPri,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   TAB: Manager Management
══════════════════════════════════ */
function ManagerManagementTab({ token, currentUserId }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [managers, setManagers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);

  // Create form state
  const [form, setForm]           = useState({ name: '', email: '', pin: '', confirmPin: '' });
  const [creating, setCreating]   = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  // Delete PIN flow
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError]   = useState('');
  const [deleting, setDeleting]         = useState(false);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/accounts?role=Manager,Admin`, { headers: authHeaders });
      const data = await res.json();
      setManagers(data.data ?? []);
    } catch {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchManagers(); }, [fetchManagers]);

  const onFormChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateMsg(null);
    if (!form.name || !form.email || !form.pin) {
      return setCreateMsg({ type: 'error', text: 'All fields are required.' });
    }
    if (!/^\d{4}$/.test(form.pin)) {
      return setCreateMsg({ type: 'error', text: 'PIN must be exactly 4 digits.' });
    }
    if (form.pin !== form.confirmPin) {
      return setCreateMsg({ type: 'error', text: 'PINs do not match.' });
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/accounts/manager`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ name: form.name, email: form.email, pin: form.pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create manager.');
      setManagers(prev => [data.data, ...prev]);
      setForm({ name: '', email: '', pin: '', confirmPin: '' });
      setShowForm(false);
      setCreateMsg({ type: 'success', text: `Manager "${data.data.name}" created successfully.` });
      setTimeout(() => setCreateMsg(null), 4000);
    } catch (err) {
      setCreateMsg({ type: 'error', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async (pin) => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`${API}/api/accounts/${deleteTarget._id}`, {
        method: 'DELETE', headers: authHeaders,
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deletion failed.');
      setManagers(prev => prev.filter(m => m._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '10px 14px' }}>
        <InfoOutlinedIcon sx={{ fontSize: 15, color: C.info, flexShrink: 0, marginTop: '1px' }} />
        <p style={{ margin: 0, fontSize: 12, color: '#01579B', fontWeight: 500, lineHeight: '18px' }}>
          Manager accounts are created as <strong>Active</strong> immediately and bypass the normal signup flow. Removing a manager requires your own PIN for confirmation.
        </p>
      </div>

      {/* Create manager header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Managers & Admins</p>
        <button
          onClick={() => { setShowForm(f => !f); setCreateMsg(null); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8,
            background: showForm ? C.elevated : C.primary,
            border: 'none', color: showForm ? C.textSec : '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {showForm
            ? <CloseOutlinedIcon sx={{ fontSize: 15 }} />
            : <AddOutlinedIcon sx={{ fontSize: 15 }} />}
          {showForm ? 'Cancel' : 'Add Manager'}
        </button>
      </div>

      {/* Create manager form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '18px 20px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}
        >
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            New Manager Account
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MgrFormField label="Full Name"     name="name"       placeholder="Jane Smith"        icon={PersonOutlinedIcon} value={form.name}       onChange={onFormChange} />
            <MgrFormField label="Email"         name="email"      placeholder="jane@company.com"  icon={EmailOutlinedIcon}  value={form.email}      onChange={onFormChange} type="email" />
            <MgrFormField label="PIN (4-digit)" name="pin"        placeholder="••••"              icon={LockOutlinedIcon}   value={form.pin}        onChange={onFormChange} type="password" />
            <MgrFormField label="Confirm PIN"   name="confirmPin" placeholder="••••"              icon={LockOutlinedIcon}   value={form.confirmPin} onChange={onFormChange} type="password" />
          </div>

          {createMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: createMsg.type === 'success' ? 'rgba(46,125,79,0.08)' : 'rgba(183,28,28,0.07)',
              border: `1px solid ${createMsg.type === 'success' ? 'rgba(46,125,79,0.25)' : 'rgba(183,28,28,0.22)'}`,
              borderRadius: 8, padding: '8px 12px',
            }}>
              {createMsg.type === 'success'
                ? <CheckCircleOutlineIcon sx={{ fontSize: 14, color: C.success }} />
                : <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: C.error }} />}
              <span style={{ fontSize: 12, fontWeight: 600, color: createMsg.type === 'success' ? C.success : C.error }}>
                {createMsg.text}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              height: 42, borderRadius: 9, border: 'none',
              background: C.primary, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: creating ? 'wait' : 'pointer',
              opacity: creating ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16 }} />
            {creating ? 'Creating…' : 'Create Manager Account'}
          </button>
        </form>
      )}

      {/* Success toast when form is hidden */}
      {!showForm && createMsg?.type === 'success' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(46,125,79,0.08)', border: '1px solid rgba(46,125,79,0.25)',
          borderRadius: 8, padding: '9px 14px',
        }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 14, color: C.success }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.success }}>{createMsg.text}</span>
        </div>
      )}

      {/* Manager list */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: 'hidden', position: 'relative', minHeight: 120,
      }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${C.elevated}`, borderTop: `3px solid ${C.primary}`, animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {managers.length} manager{managers.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={fetchManagers}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: C.textDim, opacity: loading ? 0.4 : 1 }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 13, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 540, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#F3EDE9' }}>
                {['Manager', 'Code', 'Role', 'Joined', 'Remove'].map((h, i) => (
                  <th key={h} style={{
                    padding: '9px 16px', textAlign: i === 4 ? 'right' : 'left',
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 10, fontWeight: 700, color: C.textDim,
                    letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && managers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 24px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textDim }}>No managers found</p>
                  </td>
                </tr>
              )}
              {managers.map(m => {
                const isSelf = String(m._id) === String(currentUserId);
                const joined = m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                return (
                  <tr
                    key={m._id}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background 0.12s' }}
                  >
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                          background: C.elevated, border: `1.5px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: C.primary, textTransform: 'uppercase',
                        }}>
                          {(m.name ?? '?').charAt(0)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{m.name}</p>
                            {isSelf && (
                              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: C.success, background: 'rgba(46,125,79,0.09)', border: '1px solid rgba(46,125,79,0.25)', borderRadius: 4, padding: '1px 6px' }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', background: C.elevated, borderRadius: 5, padding: '2px 7px' }}>
                        {m.employeeCode ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: m.role === 'Admin' ? C.warning : C.textSec,
                        background: m.role === 'Admin' ? 'rgba(178,106,0,0.09)' : C.elevated,
                        border: `1px solid ${m.role === 'Admin' ? 'rgba(178,106,0,0.25)' : C.border}`,
                        borderRadius: 5, padding: '2px 7px',
                      }}>
                        {m.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.textDim }}>{joined}</span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>
                      <button
                        onClick={() => { setDeleteError(''); setDeleteTarget(m); }}
                        disabled={isSelf}
                        title={isSelf ? "You can't remove yourself" : 'Remove manager'}
                        style={{
                          width: 30, height: 30, borderRadius: 7,
                          border: `1px solid ${isSelf ? C.border : 'rgba(183,28,28,0.22)'}`,
                          background: isSelf ? C.elevated : 'rgba(183,28,28,0.07)',
                          color: isSelf ? C.textDim : C.error,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isSelf ? 'not-allowed' : 'pointer',
                          opacity: isSelf ? 0.35 : 1,
                          transition: 'opacity 0.15s',
                          marginLeft: 'auto',
                        }}
                      >
                        <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ManagerPinDialog
        open={!!deleteTarget}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        error={deleteError}
        submitting={deleting}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ══════════════════════════════════
   Main Settings Page
══════════════════════════════════ */
export default function ManagerSettingsPage() {
  const { token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('email');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 0px)',
      background: C.bg, padding: '20px 20px 32px', gap: 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Manager Portal
        </p>
        <h1 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
          Settings
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>
          Manage integrations, notifications, and system configuration
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: `2px solid ${C.border}`,
      }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px 10px',
                border: 'none', background: 'none', cursor: 'pointer',
                color: active ? C.primary : C.textDim,
                fontSize: 13, fontWeight: active ? 700 : 500,
                borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
                marginBottom: -2,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <Icon sx={{ fontSize: 15 }} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'email'     && <EmailConfigTab        token={token} />}
      {activeTab === 'managers'  && <ManagerManagementTab  token={token} currentUserId={user?._id} />}
      {activeTab === 'biometric' && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FingerprintOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Biometric Login</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>Fingerprint &amp; Face ID authentication</p>
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            <BiometricSetup />
          </div>
        </div>
      )}
    </div>
  );
}
