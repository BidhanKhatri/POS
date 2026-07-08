import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, useMediaQuery } from '@mui/material';
import SyncOutlinedIcon              from '@mui/icons-material/SyncOutlined';
import EmailOutlinedIcon             from '@mui/icons-material/EmailOutlined';
import CheckCircleOutlineIcon        from '@mui/icons-material/CheckCircleOutlined';
import InfoOutlinedIcon              from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon      from '@mui/icons-material/WarningAmberOutlined';
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
import Inventory2OutlinedIcon        from '@mui/icons-material/Inventory2Outlined';
import ManageAccountsOutlinedIcon    from '@mui/icons-material/ManageAccountsOutlined';
import LocationOnOutlinedIcon        from '@mui/icons-material/LocationOnOutlined';
import MarkEmailReadOutlinedIcon     from '@mui/icons-material/MarkEmailReadOutlined';
import StorefrontOutlinedIcon        from '@mui/icons-material/StorefrontOutlined';
import StorageOutlinedIcon           from '@mui/icons-material/StorageOutlined';
import toast, { Toaster }           from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/useAuthStore';
import BiometricSetup from '../components/BiometricSetup/BiometricSetup';
import ImageUploader from '../components/ImageUploader/ImageUploader';
import DatabaseManagementTab from './DatabaseManagementTab';

import { API_URL as API } from '../config/api';

const C = {
  primary: '#3E2723', primaryLt: '#5A3A33',
  accent: '#D4A373', bg: '#F5F3F1', surface: '#ffffff',
  elevated: '#EFE7E2', border: '#DDD2CC',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
};

const TABS = [
  { key: 'biometric', label: 'Biometric',           mobileLabel: 'Biometric', icon: FingerprintOutlinedIcon },
  { key: 'email',     label: 'Report Config',       mobileLabel: 'Reports',   icon: EmailOutlinedIcon },
  { key: 'managers',  label: 'Manager Management',  mobileLabel: 'Managers',  icon: AdminPanelSettingsOutlinedIcon },
  { key: 'inventory', label: 'Inventory',           mobileLabel: 'Inventory', icon: Inventory2OutlinedIcon },
  { key: 'profile',   label: 'Profile',             mobileLabel: 'Profile',   icon: ManageAccountsOutlinedIcon },
  { key: 'sync',      label: 'Sync Data',           mobileLabel: 'Sync',      icon: SyncOutlinedIcon },
  { key: 'database',  label: 'Database Management', mobileLabel: 'Database',  icon: StorageOutlinedIcon },
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
  const qc = useQueryClient();

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
      qc.invalidateQueries({ queryKey: ['settings-sync'] });
    } catch {
    } finally {
      setSyncToggling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoBanner>
        When <strong>Sync Staffing Betit</strong> is enabled, the Schedule page shows read-only shifts sourced
        from your EMS account, and new employee signups are verified against Staffing Betit before a POS account
        is created. Disable sync to manage schedules and signups entirely within POS.
      </InfoBanner>

      <SettingRow
        icon={SyncOutlinedIcon}
        iconColor={syncEnabled ? C.success : C.textDim}
        iconBg={syncEnabled ? 'rgba(46,125,79,0.10)' : C.elevated}
        title="Sync Staffing Betit"
        description={
          syncEnabled
            ? 'Schedules read from EMS · signups require a valid Staffing Betit work email'
            : 'Local mode — schedules managed in POS · any email accepted on signup'
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
          What sync affects
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { n: '1', text: 'Schedule page shows shifts pulled from Staffing Betit (EMS) — read-only within POS.' },
            { n: '2', text: 'Employee signups are verified against Staffing Betit before a POS account is created.' },
            { n: '3', text: 'A verification link is sent to the employee\'s Staffing Betit work email (expires in 15 minutes).' },
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
   TAB: Daily Report Schedule
══════════════════════════════════ */
const COMMON_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
  'Asia/Kathmandu', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Dubai', 'Asia/Karachi',
  'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Jakarta',
  'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland', 'UTC',
];

function DailyReportScheduleCard({ token, isMobile }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [cfg, setCfg]           = useState(null); // { enabled, time, timezone, lastSentAt, nextRunAt }
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [msg, setMsg]           = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/settings/daily-report`, { headers: authHeaders })
      .then(r => r.json())
      .then(setCfg)
      .catch(() => setMsg({ type: 'error', text: 'Failed to load report schedule.' }))
      .finally(() => setLoading(false));
  }, [token]);

  const save = async (patch) => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/settings/daily-report`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      setCfg(data);
      setMsg({ type: 'success', text: 'Report schedule updated.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const sendNow = async () => {
    setSendingNow(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/settings/daily-report/send-now`, {
        method: 'POST', headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send report.');
      setMsg({ type: 'success', text: data.recipients?.length ? `Report sent to ${data.recipients.join(', ')}.` : 'Report sent.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSendingNow(false);
      setTimeout(() => setMsg(null), 6000);
    }
  };

  if (loading || !cfg) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <span style={{ fontSize: 13, color: C.textDim }}>Loading report schedule…</span>
      </div>
    );
  }

  const nextRunLabel = cfg.enabled && cfg.nextRunAt
    ? new Date(cfg.nextRunAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Disabled';
  const lastSentLabel = cfg.lastSentAt
    ? new Date(cfg.lastSentAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never';

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Daily Report Schedule
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: saving ? 'not-allowed' : 'pointer' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg.enabled ? C.success : C.textDim }}>
            {cfg.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <input
            type="checkbox"
            checked={cfg.enabled}
            disabled={saving}
            onChange={(e) => save({ enabled: e.target.checked })}
            style={{ width: 34, height: 20, cursor: saving ? 'not-allowed' : 'pointer' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 6 }}>
            Report Time (24-hour)
          </label>
          <input
            type="time"
            value={cfg.time}
            disabled={saving}
            onChange={(e) => setCfg({ ...cfg, time: e.target.value })}
            onBlur={(e) => e.target.value && save({ time: e.target.value })}
            style={{ width: '100%', minHeight: 42, padding: '0 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.elevated, color: C.textPri, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textSec, marginBottom: 6 }}>
            Timezone
          </label>
          <select
            value={cfg.timezone}
            disabled={saving}
            onChange={(e) => save({ timezone: e.target.value })}
            style={{ width: '100%', minHeight: 42, padding: '0 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.elevated, color: C.textPri, boxSizing: 'border-box' }}
          >
            {!COMMON_TIMEZONES.includes(cfg.timezone) && <option value={cfg.timezone}>{cfg.timezone}</option>}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {cfg.timezone !== browserTz && (
        <button
          onClick={() => save({ timezone: browserTz })}
          disabled={saving}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, fontSize: 11.5, fontWeight: 700, color: C.primary, cursor: saving ? 'not-allowed' : 'pointer', textDecoration: 'underline' }}
        >
          Use my timezone ({browserTz})
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
        <div style={{ flex: 1, background: C.elevated, borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Next Send (your local time)</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{nextRunLabel}</p>
        </div>
        <div style={{ flex: 1, background: C.elevated, borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Sent</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{lastSentLabel}</p>
        </div>
      </div>

      <button
        onClick={sendNow}
        disabled={sendingNow || saving}
        style={{
          alignSelf: isMobile ? 'stretch' : 'flex-end',
          minHeight: 40, padding: '0 18px', background: 'transparent', color: C.primary,
          border: `1.5px solid ${C.primary}`, borderRadius: 8, fontSize: 12.5, fontWeight: 700,
          cursor: (sendingNow || saving) ? 'not-allowed' : 'pointer',
          opacity: (sendingNow || saving) ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <MarkEmailReadOutlinedIcon sx={{ fontSize: 15 }} />
        {sendingNow ? 'Sending…' : 'Send Report Now'}
      </button>
      <p style={{ margin: '-10px 0 0', fontSize: 10.5, color: C.textDim, textAlign: isMobile ? 'left' : 'right' }}>
        Sends today's report immediately for testing — doesn't affect or count as the scheduled send above.
      </p>

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
    </div>
  );
}

/* ══════════════════════════════════
   TAB: Email Recipients
══════════════════════════════════ */
const DEFAULT_REPORT_RECIPIENT = 'staffingbetit@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EmailRecipientsTab({ token, isMobile }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [recipients, setRecipients] = useState([]);
  const [newEmail, setNewEmail]     = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/settings/report-recipients`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setRecipients(d.recipients?.length ? d.recipients : [DEFAULT_REPORT_RECIPIENT]))
      .catch(() => setRecipients([DEFAULT_REPORT_RECIPIENT]))
      .finally(() => setLoading(false));
  }, [token]);

  const save = async (nextRecipients) => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/api/settings/report-recipients`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ recipients: nextRecipients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      setRecipients(data.recipients);
      setMsg({ type: 'success', text: 'Email recipients updated.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleAdd = () => {
    const email = newEmail.trim().toLowerCase();
    setFieldError('');
    if (!email) return;
    if (!EMAIL_RE.test(email)) { setFieldError('Enter a valid email address.'); return; }
    if (recipients.includes(email)) { setFieldError('This email is already in the list.'); return; }
    const next = [...recipients, email];
    setNewEmail('');
    save(next);
  };

  const handleRemove = (email) => {
    const next = recipients.filter((e) => e !== email);
    save(next.length ? next : [DEFAULT_REPORT_RECIPIENT]);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <span style={{ fontSize: 13, color: C.textDim }}>Loading recipients…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoBanner>
        Every email address below receives the daily sales report automatically. If you remove all of them,
        reports fall back to the shared POS inbox <strong>{DEFAULT_REPORT_RECIPIENT}</strong>.
      </InfoBanner>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Email Recipients
        </p>

        {/* Add new email */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <EmailField
              label="Add Recipient"
              name="newEmail"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setFieldError(''); }}
              placeholder="manager@gmail.com"
              icon={EmailOutlinedIcon}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !newEmail.trim()}
            style={{
              alignSelf: isMobile ? 'stretch' : 'flex-end',
              minHeight: 42, padding: '0 18px', background: C.primary, color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: (saving || !newEmail.trim()) ? 'not-allowed' : 'pointer',
              opacity: (saving || !newEmail.trim()) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <AddOutlinedIcon sx={{ fontSize: 16 }} />
            Add
          </button>
        </div>
        {fieldError && (
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.error }}>{fieldError}</p>
        )}

        {/* Recipient list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recipients.map((email) => {
            const isDefault = email === DEFAULT_REPORT_RECIPIENT;
            return (
              <div
                key={email}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: C.elevated, borderRadius: 8, gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <MarkEmailReadOutlinedIcon sx={{ fontSize: 16, color: C.textDim, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email}
                  </span>
                  {isDefault && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: C.textDim, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '2px 8px', flexShrink: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Shared Inbox
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(email)}
                  disabled={saving}
                  style={{
                    background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                    padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0, opacity: saving ? 0.5 : 1,
                  }}
                >
                  <DeleteOutlineOutlinedIcon sx={{ fontSize: 16, color: C.error }} />
                </button>
              </div>
            );
          })}
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
function ManagerManagementTab({ token, currentUserId, isMobile }) {
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
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

        {isMobile ? (
          /* ── Mobile: card list ── */
          <div>
            {!loading && managers.length === 0 && (
              <p style={{ margin: 0, padding: '32px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.textDim }}>No managers found</p>
            )}
            {managers.map(m => {
              const isSelf = String(m._id) === String(currentUserId);
              const joined = m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
              return (
                <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: C.elevated, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: C.primary }}>
                    {(m.name ?? '?').charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                      {isSelf && <span style={{ fontSize: 9, fontWeight: 800, color: C.success, background: 'rgba(46,125,79,0.09)', border: '1px solid rgba(46,125,79,0.25)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>YOU</span>}
                    </div>
                    <p style={{ margin: '0 0 5px', fontSize: 11, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.primary, background: C.elevated, borderRadius: 4, padding: '1px 6px' }}>{m.employeeCode ?? '—'}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: m.role === 'Admin' ? C.warning : C.textSec, background: m.role === 'Admin' ? 'rgba(178,106,0,0.09)' : C.elevated, border: `1px solid ${m.role === 'Admin' ? 'rgba(178,106,0,0.25)' : C.border}`, borderRadius: 4, padding: '1px 6px' }}>{m.role}</span>
                      <span style={{ fontSize: 10, color: C.textDim }}>{joined}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setDeleteError(''); setDeleteTarget(m); }}
                    disabled={isSelf}
                    title={isSelf ? "You can't remove yourself" : 'Remove manager'}
                    style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, border: `1px solid ${isSelf ? C.border : 'rgba(183,28,28,0.22)'}`, background: isSelf ? C.elevated : 'rgba(183,28,28,0.07)', color: isSelf ? C.textDim : C.error, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isSelf ? 'not-allowed' : 'pointer', opacity: isSelf ? 0.35 : 1 }}
                  >
                    <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Desktop: table ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 540, borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#F3EDE9' }}>
                  {['Manager', 'Code', 'Role', 'Joined', 'Remove'].map((h, i) => (
                    <th key={h} style={{ padding: '9px 16px', textAlign: i === 4 ? 'right' : 'left', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
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
                    <tr key={m._id} onMouseEnter={e => e.currentTarget.style.background = C.bg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} style={{ transition: 'background 0.12s' }}>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: C.elevated, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.primary, textTransform: 'uppercase' }}>
                            {(m.name ?? '?').charAt(0)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{m.name}</p>
                              {isSelf && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', color: C.success, background: 'rgba(46,125,79,0.09)', border: '1px solid rgba(46,125,79,0.25)', borderRadius: 4, padding: '1px 6px' }}>YOU</span>}
                            </div>
                            <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', background: C.elevated, borderRadius: 5, padding: '2px 7px' }}>{m.employeeCode ?? '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: m.role === 'Admin' ? C.warning : C.textSec, background: m.role === 'Admin' ? 'rgba(178,106,0,0.09)' : C.elevated, border: `1px solid ${m.role === 'Admin' ? 'rgba(178,106,0,0.25)' : C.border}`, borderRadius: 5, padding: '2px 7px' }}>{m.role}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 12, color: C.textDim }}>{joined}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>
                        <button onClick={() => { setDeleteError(''); setDeleteTarget(m); }} disabled={isSelf} title={isSelf ? "You can't remove yourself" : 'Remove manager'} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${isSelf ? C.border : 'rgba(183,28,28,0.22)'}`, background: isSelf ? C.elevated : 'rgba(183,28,28,0.07)', color: isSelf ? C.textDim : C.error, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isSelf ? 'not-allowed' : 'pointer', opacity: isSelf ? 0.35 : 1, transition: 'opacity 0.15s', marginLeft: 'auto' }}>
                          <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
   TAB: Inventory
══════════════════════════════════ */
function InventoryTab({ token }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [loading, setLoading]                 = useState(true);
  const [toggling, setToggling]               = useState(false);
  const [saved, setSaved]                     = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/settings/stock-tracking`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setTrackingEnabled(d.stockTrackingEnabled ?? true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const toggleTracking = async () => {
    setToggling(true);
    setSaved(false);
    try {
      const res = await fetch(`${API}/api/settings/stock-tracking`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ stockTrackingEnabled: !trackingEnabled }),
      });
      const data = await res.json();
      setTrackingEnabled(data.stockTrackingEnabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
    } finally {
      setToggling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoBanner>
        When <strong>Stock Tracking</strong> is enabled (default), the system tracks product quantities,
        validates stock availability at checkout, and records inventory movements on every sale, refund,
        and void. Disable this for service businesses or manual-sales operations where stock counts are
        not relevant.
      </InfoBanner>

      <SettingRow
        icon={Inventory2OutlinedIcon}
        iconColor={trackingEnabled ? C.success : C.textDim}
        iconBg={trackingEnabled ? 'rgba(46,125,79,0.10)' : C.elevated}
        title="Stock Tracking"
        description={
          trackingEnabled
            ? 'Quantities are tracked · low-stock alerts active · stock deducted on every sale'
            : 'Disabled — no quantity checks, no deductions, no low-stock alerts'
        }
        control={
          <Toggle
            enabled={trackingEnabled}
            onToggle={toggleTracking}
            disabled={loading || toggling}
          />
        }
      />

      {!trackingEnabled && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(178,106,0,0.07)', border: '1px solid rgba(178,106,0,0.25)',
          borderRadius: 10, padding: '11px 14px',
        }}>
          <WarningAmberOutlinedIcon sx={{ fontSize: 15, color: C.warning, flexShrink: 0, marginTop: '1px' }} />
          <p style={{ margin: 0, fontSize: 12, color: '#7A4F00', fontWeight: 500, lineHeight: '18px' }}>
            Stock tracking is <strong>disabled</strong>. Sales will proceed without stock validation.
            Inventory quantities will not be updated on sales, refunds, or voids.
            Re-enable at any time to resume tracking.
          </p>
        </div>
      )}

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

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: C.textPri, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          What changes when disabled
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { n: '1', text: 'Sales proceed without checking product stock availability — no "insufficient stock" errors.' },
            { n: '2', text: 'Product quantities are not decremented on sale or incremented on refund or void.' },
            { n: '3', text: 'Low-stock and out-of-stock KPI cards display "—" in the Inventory page.' },
            { n: '4', text: 'No new inventory movement records are created (existing history is preserved).' },
            { n: '5', text: 'Barcode scanning continues to identify products normally — only quantity updates are skipped.' },
            { n: '6', text: 'Sales, revenue, and transaction reports are unaffected.' },
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
   Change PIN Modal (Profile tab)
══════════════════════════════════ */
function ChangePinModal({ open, onClose, onSuccess, token }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isMobile = useMediaQuery('(max-width:480px)');

  // step 0 = current PIN, 1 = new PIN, 2 = confirm new PIN
  const [step, setStep]           = useState(0);
  const [pins, setPins]           = useState(['', '', '']);
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake]         = useState(false);

  useEffect(() => {
    if (open) { setStep(0); setPins(['', '', '']); setError(''); setSubmitting(false); }
  }, [open]);

  const curVal = pins[step] ?? '';

  const push = (d) => {
    if (submitting) return;
    setPins(prev => {
      const next = [...prev];
      if (next[step].length < 4) next[step] = next[step] + d;
      return next;
    });
  };
  const del   = () => { if (submitting) return; setPins(prev => { const n = [...prev]; n[step] = n[step].slice(0, -1); return n; }); };
  const clear = () => { if (submitting) return; setPins(prev => { const n = [...prev]; n[step] = ''; return n; }); };

  // Auto-advance on 4th digit
  useEffect(() => {
    if (curVal.length !== 4) return;
    const t = setTimeout(async () => {
      if (step < 2) {
        setStep(s => s + 1);
        setError('');
      } else {
        await doSubmit();
      }
    }, 140);
    return () => clearTimeout(t);
  }, [curVal, step]);

  async function doSubmit() {
    const [cur, nw, cfm] = pins;
    if (nw !== cfm) {
      setError("PINs don't match. Try again.");
      trigShake();
      setStep(1);
      setPins(prev => [prev[0], '', '']);
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/profile/pin`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ currentPin: cur, newPin: nw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed.');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
      trigShake();
      const resetToStep0 = err.message.toLowerCase().includes('current');
      setStep(resetToStep0 ? 0 : 1);
      setPins(resetToStep0 ? ['', '', ''] : prev => [prev[0], '', '']);
    } finally {
      setSubmitting(false);
    }
  }

  function trigShake() { setShake(true); setTimeout(() => setShake(false), 450); }

  const handleClose = () => { if (!submitting) onClose(); };

  const ROWS = [['1','2','3'],['4','5','6'],['7','8','9']];
  const sz = isMobile ? 64 : 68;

  const keyBtn = (label, onClick, variant = 'digit') => {
    const isDigit  = variant === 'digit';
    const isAction = variant === 'action';
    return (
      <button
        key={String(label)}
        onClick={onClick}
        disabled={submitting}
        className="active:translate-y-[3px]"
        style={{
          width: sz, height: sz, borderRadius: 14,
          border: `1px solid ${isDigit ? C.border : 'transparent'}`,
          background: isDigit ? C.surface : isAction ? C.bg : 'transparent',
          fontSize: isDigit ? (isMobile ? 19 : 21) : 12,
          fontWeight: isDigit ? 700 : 600,
          color: isDigit ? C.textPri : C.textSec,
          cursor: submitting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDigit ? `0 3px 0 ${C.border}` : 'none',
          transition: 'box-shadow 0.1s, transform 0.1s',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          flexShrink: 0, opacity: submitting ? 0.5 : 1,
        }}
      >
        {label}
      </button>
    );
  };

  const stepLabels = ['Enter your current PIN', 'Enter your new PIN', 'Confirm your new PIN'];
  const stepSubs   = ['Verify your identity', 'Choose a 4-digit PIN', 'Re-enter to confirm'];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        style: {
          borderRadius: 20, width: isMobile ? '96vw' : 680, maxWidth: 680, margin: 'auto',
          boxShadow: '0 24px 80px rgba(42,23,21,0.22), 0 8px 24px rgba(42,23,21,0.12)',
          overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
      slotProps={{ backdrop: { style: { backdropFilter: 'blur(3px)', background: 'rgba(42,23,21,0.35)' } } }}
    >
      {/* Dark header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, #5D4037 100%)`,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(212,163,115,0.18)',
            border: '1px solid rgba(212,163,115,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <KeyOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Change PIN</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Step {step + 1} of 3 &nbsp;·&nbsp; {stepSubs[step]}
            </p>
          </div>
        </div>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.6 }}>
          <CloseOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
        </button>
      </div>

      {/* Two-column body */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* LEFT: step indicator + PIN dots + error + action buttons */}
        <div style={{
          flex: 1, padding: isMobile ? '18px 18px 0' : '22px 24px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
          borderBottom: isMobile ? `1px solid ${C.border}` : 'none',
        }}>

          {/* Step progress */}
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i < step ? C.success : i === step ? C.primary : C.border,
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: C.textPri }}>{stepLabels[step]}</p>
            <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>
              {step === 0 && 'Your current PIN is required for security.'}
              {step === 1 && 'Choose a new 4-digit PIN you\'ll remember.'}
              {step === 2 && 'Type your new PIN again to confirm.'}
            </p>
          </div>

          {/* PIN dots indicator */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Enter 4-digit PIN
            </p>
            <div className={shake ? 'pin-shake' : ''} style={{
              display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 12,
              background: C.bg,
              border: `1.5px solid ${error ? C.error : curVal.length === 4 ? C.primary : C.border}`,
              transition: 'border-color 0.15s',
            }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  flex: 1, height: 14, borderRadius: 4,
                  background: i < curVal.length ? C.primary : C.border,
                  transition: 'background 0.12s',
                }} />
              ))}
            </div>
            {error && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: C.error }}>{error}</p>}
          </div>

          {/* Actions */}
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
                if (curVal.length < 4) { trigShake(); return; }
                if (step < 2) { setStep(s => s + 1); setError(''); }
                else doSubmit();
              }}
              disabled={submitting || curVal.length < 4}
              style={{
                flex: 2, height: 44, borderRadius: 10,
                border: curVal.length === 4 ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                background: curVal.length === 4 ? C.primary : C.elevated,
                fontSize: 13, fontWeight: 700,
                color: curVal.length === 4 ? '#fff' : C.textDim,
                cursor: submitting || curVal.length < 4 ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.65 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: curVal.length === 4 ? `0 3px 0 #2A1715` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <KeyOutlinedIcon sx={{ fontSize: 15 }} />
              {submitting ? 'Verifying…' : step < 2 ? 'Next' : 'Change PIN'}
            </button>
          </div>
        </div>

        {/* RIGHT: numpad */}
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

/* ══════════════════════════════════
   Delete Account PIN Modal
══════════════════════════════════ */
function DeleteAccountModal({ open, onClose, onConfirm, submitting, error }) {
  const isMobile = useMediaQuery('(max-width:480px)');
  const [pin, setPin]     = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => { if (open) { setPin(''); } }, [open]);
  useEffect(() => {
    if (error) { setShake(true); setTimeout(() => setShake(false), 450); setPin(''); }
  }, [error]);
  useEffect(() => {
    if (pin.length === 4) {
      const t = setTimeout(() => onConfirm(pin), 140);
      return () => clearTimeout(t);
    }
  }, [pin]);

  const push  = (d) => { if (!submitting) setPin(p => p.length < 4 ? p + d : p); };
  const del   = () => { if (!submitting) setPin(p => p.slice(0, -1)); };
  const clear = () => { if (!submitting) setPin(''); };
  const ROWS  = [['1','2','3'],['4','5','6'],['7','8','9']];
  const sz    = isMobile ? 64 : 68;

  const keyBtn = (label, onClick, variant = 'digit') => {
    const isDigit = variant === 'digit';
    return (
      <button
        key={String(label)}
        onClick={onClick}
        disabled={submitting}
        className="active:translate-y-[3px]"
        style={{
          width: sz, height: sz, borderRadius: 14,
          border: `1px solid ${isDigit ? C.border : 'transparent'}`,
          background: isDigit ? C.surface : C.bg,
          fontSize: isDigit ? (isMobile ? 19 : 21) : 12,
          fontWeight: isDigit ? 700 : 600,
          color: isDigit ? C.textPri : C.textSec,
          cursor: submitting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDigit ? `0 3px 0 ${C.border}` : 'none',
          transition: 'box-shadow 0.1s, transform 0.1s',
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
      onClose={() => { if (!submitting) onClose(); }}
      PaperProps={{
        style: {
          borderRadius: 20, width: isMobile ? '96vw' : 680, maxWidth: 680, margin: 'auto',
          boxShadow: '0 24px 80px rgba(42,23,21,0.22)',
          overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
      slotProps={{ backdrop: { style: { backdropFilter: 'blur(3px)', background: 'rgba(42,23,21,0.45)' } } }}
    >
      {/* Red header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.error} 0%, #7B1010 100%)`,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Delete Account</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Permanent — cannot be undone
            </p>
          </div>
        </div>
        <button onClick={() => { if (!submitting) onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.6 }}>
          <CloseOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
        </button>
      </div>

      {/* Two-column body */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{
          flex: 1, padding: isMobile ? '18px 18px 0' : '22px 24px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
          borderBottom: isMobile ? `1px solid ${C.border}` : 'none',
        }}>
          <div style={{ background: 'rgba(183,28,28,0.06)', border: '1px solid rgba(183,28,28,0.18)', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.error, lineHeight: '18px' }}>
              ⚠ This will permanently delete your account. You will be logged out immediately.
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Enter your PIN to confirm
            </p>
            <div className={shake ? 'pin-shake' : ''} style={{
              display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 12,
              background: C.bg, border: `1.5px solid ${error ? C.error : pin.length === 4 ? C.error : C.border}`,
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
          <div style={{ display: 'flex', gap: 8, paddingBottom: isMobile ? 18 : 0 }}>
            <button
              onClick={() => { if (!submitting) onClose(); }}
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
              onClick={() => { if (pin.length < 4) { setShake(true); setTimeout(() => setShake(false), 450); return; } onConfirm(pin); }}
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
                boxShadow: pin.length === 4 ? `0 3px 0 #7B0000` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
              {submitting ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </div>
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

/* ══════════════════════════════════
   TAB: Profile Management
══════════════════════════════════ */
function ProfileManagementTab({ token }) {
  const { logout, user, setUser } = useAuthStore();
  const isMobile = useMediaQuery('(max-width:640px)');
  const qc = useQueryClient();
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [profile, setProfile]   = useState(null);
  const [profLoad, setProfLoad] = useState(true);

  const [address, setAddress]       = useState('');
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrMsg, setAddrMsg]       = useState(null);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');

  // Forgot PIN — stages: idle | resetting | done
  const [fpStage, setFpStage]   = useState('idle');
  const [fpOtp, setFpOtp]       = useState('');
  const [fpPin, setFpPin]       = useState('');
  const [fpBusy, setFpBusy]     = useState(false);
  const [fpMsg, setFpMsg]       = useState(null);

  // Delete account
  const [delModalOpen, setDelModalOpen] = useState(false);
  const [delBusy, setDelBusy]           = useState(false);
  const [delError, setDelError]         = useState('');

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [logoUrl,   setLogoUrl]   = useState(null);

  const [storeName, setStoreName]           = useState('');
  const [storeNameSaving, setStoreNameSaving] = useState(false);
  const [storeNameSaved, setStoreNameSaved]   = useState(false);

  useEffect(() => {
    setProfLoad(true);
    Promise.all([
      fetch(`${API}/api/profile`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API}/api/settings/logo`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API}/api/settings/store-name`, { headers: authHeaders }).then(r => r.json()),
    ])
      .then(([profData, logoData, storeNameData]) => {
        setProfile(profData.data);
        setAddress(profData.data?.address ?? '');
        setAvatarUrl(profData.data?.imageUrl ?? null);
        setLogoUrl(logoData.data?.url ?? null);
        setStoreName(storeNameData?.storeName ?? '');
      })
      .catch(() => {})
      .finally(() => setProfLoad(false));
  }, [token]);

  async function handleStoreNameSave() {
    setStoreNameSaving(true);
    setStoreNameSaved(false);
    try {
      const res = await fetch(`${API}/api/settings/store-name`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ storeName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed.');
      setStoreName(data.storeName ?? '');
      setStoreNameSaved(true);
      qc.invalidateQueries({ queryKey: ['settings-store-name'] });
      setTimeout(() => setStoreNameSaved(false), 2500);
    } catch {
      // silently ignore — non-critical setting
    } finally {
      setStoreNameSaving(false);
    }
  }

  async function handleAvatarUpload(file) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${API}/api/profile/avatar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed.');
    const url = data.data?.imageUrl ?? null;
    setAvatarUrl(url);
    setUser({ ...user, imageUrl: url });
  }

  async function handleAvatarDelete() {
    const res = await fetch(`${API}/api/profile/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Remove failed.');
    setAvatarUrl(null);
    setUser({ ...user, imageUrl: null });
  }

  async function handleLogoUpload(file) {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch(`${API}/api/settings/logo`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Upload failed.');
    const url = data.data?.url ?? null;
    setLogoUrl(url);
    if (url) localStorage.setItem('pos-store-logo-url', url);
    else localStorage.removeItem('pos-store-logo-url');
    qc.invalidateQueries({ queryKey: ['settings-logo'] });
  }

  async function handleLogoDelete() {
    const res = await fetch(`${API}/api/settings/logo`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Remove failed.');
    setLogoUrl(null);
    localStorage.removeItem('pos-store-logo-url');
    qc.invalidateQueries({ queryKey: ['settings-logo'] });
  }

  async function handleSendOtp() {
    setFpBusy(true);
    try {
      const res = await fetch(`${API}/api/profile/forgot-pin`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed.');
      toast.success(data.message, { duration: 5000 });
      setFpStage('resetting');
      setFpMsg(null);
    } catch (err) {
      toast.error(err.message, { duration: 5000 });
    } finally {
      setFpBusy(false);
    }
  }

  async function handleResetPin() {
    if (fpOtp.length !== 6) return setFpMsg({ type: 'error', text: 'Enter the full 6-digit OTP.' });
    if (fpPin.length !== 4) return setFpMsg({ type: 'error', text: 'Enter a 4-digit PIN.' });
    setFpBusy(true); setFpMsg(null);
    try {
      const res = await fetch(`${API}/api/profile/reset-pin`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ otp: fpOtp, newPin: fpPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed.');
      setFpStage('done');
      setFpOtp(''); setFpPin('');
    } catch (err) {
      setFpMsg({ type: 'error', text: err.message });
    } finally {
      setFpBusy(false);
    }
  }

  async function handleSaveAddress() {
    setAddrSaving(true); setAddrMsg(null);
    try {
      const res = await fetch(`${API}/api/profile/address`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed.');
      setAddrMsg({ type: 'success', text: 'Address saved.' });
    } catch (err) {
      setAddrMsg({ type: 'error', text: err.message });
    } finally {
      setAddrSaving(false);
      setTimeout(() => setAddrMsg(null), 3000);
    }
  }

  async function handleDeleteAccount(pin) {
    setDelBusy(true); setDelError('');
    try {
      const res = await fetch(`${API}/api/profile`, {
        method: 'DELETE', headers: authHeaders,
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed.');
      logout();
      window.location.href = '/login';
    } catch (err) {
      setDelError(err.message);
    } finally {
      setDelBusy(false);
    }
  }

  const roleBadgeColor = profile?.role === 'Admin'
    ? { bg: 'rgba(2,119,189,0.1)', color: '#0277BD', border: 'rgba(2,119,189,0.25)' }
    : { bg: 'rgba(46,125,79,0.1)', color: '#2E7D4F', border: 'rgba(46,125,79,0.25)' };

  if (profLoad) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${C.elevated}`, borderTop: `3px solid ${C.primary}`, animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Modals */}
      <ChangePinModal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSuccess={() => { setPinSuccessMsg('PIN changed successfully.'); setTimeout(() => setPinSuccessMsg(''), 4000); }}
        token={token}
      />
      <DeleteAccountModal
        open={delModalOpen}
        onClose={() => { if (!delBusy) { setDelModalOpen(false); setDelError(''); } }}
        onConfirm={handleDeleteAccount}
        submitting={delBusy}
        error={delError}
      />

      {pinSuccessMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(46,125,79,0.08)', border: '1px solid rgba(46,125,79,0.25)', borderRadius: 9, padding: '10px 14px' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 15, color: C.success }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.success }}>{pinSuccessMsg}</span>
        </div>
      )}

      {/* ══ BRANDING & IDENTITY ══════════════════════════════════ */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: '#F9F6F4' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StorefrontOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Branding & Identity</p>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: C.textSec }}>Store logo and your manager profile picture</p>
          </div>
        </div>

        {/* Store Name */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Store Name</p>
            <p style={{ margin: 0, fontSize: 11, color: C.textDim, lineHeight: '16px' }}>Shown in the mobile header — defaults to "POS" if left blank</p>
          </div>
          <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="POS"
              maxLength={60}
              style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.textPri, outline: 'none' }}
            />
            <button
              onClick={handleStoreNameSave}
              disabled={storeNameSaving}
              style={{ height: 38, padding: '0 16px', borderRadius: 8, border: 'none', background: storeNameSaved ? C.success : C.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: storeNameSaving ? 'wait' : 'pointer', opacity: storeNameSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}
            >
              {storeNameSaving ? 'Saving…' : storeNameSaved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 0 }}>

          {/* ── Store Logo ── */}
          <div style={{ padding: '20px', borderRight: isMobile ? 'none' : `1px solid ${C.border}`, borderBottom: isMobile ? `1px solid ${C.border}` : 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Store Logo</p>
              <p style={{ margin: 0, fontSize: 11, color: C.textDim, lineHeight: '16px' }}>Shown in the sidebar, mobile header, and printed receipts</p>
            </div>
            <ImageUploader
              currentUrl={logoUrl}
              onUpload={handleLogoUpload}
              onDelete={handleLogoDelete}
              label=""
              shape="square"
              size={80}
              hint="JPEG, PNG, WebP · max 5 MB"
            />
          </div>

          {/* ── Manager Photo ── */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Manager Photo</p>
              <p style={{ margin: 0, fontSize: 11, color: C.textDim, lineHeight: '16px' }}>Displayed in the portal navigation</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flexShrink: 0 }}>
                <ImageUploader
                  currentUrl={avatarUrl}
                  onUpload={handleAvatarUpload}
                  onDelete={handleAvatarDelete}
                  label=""
                  shape="circle"
                  size={72}
                  hint={null}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name ?? '—'}</p>
                <p style={{ margin: '0 0 7px', fontSize: 11, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email ?? '—'}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: roleBadgeColor.bg, color: roleBadgeColor.color, border: `1px solid ${roleBadgeColor.border}` }}>
                    {profile?.role?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: C.elevated, color: C.textSec }}>
                    #{profile?.employeeCode}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ══ ACCOUNT DETAILS ══════════════════════════════════ */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: '#F9F6F4' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LocationOnOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Account Details</p>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: C.textSec }}>Your personal contact information</p>
          </div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Address</span>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Your address (optional)"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.textPri, background: '#fff', outline: 'none', lineHeight: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
          </div>
          {addrMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: addrMsg.type === 'success' ? 'rgba(46,125,79,0.08)' : 'rgba(183,28,28,0.07)', border: `1px solid ${addrMsg.type === 'success' ? 'rgba(46,125,79,0.25)' : 'rgba(183,28,28,0.22)'}`, borderRadius: 7, padding: '8px 12px' }}>
              {addrMsg.type === 'success' ? <CheckCircleOutlineIcon sx={{ fontSize: 14, color: C.success }} /> : <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: C.error }} />}
              <span style={{ fontSize: 12, fontWeight: 600, color: addrMsg.type === 'success' ? C.success : C.error }}>{addrMsg.text}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveAddress}
              disabled={addrSaving}
              style={{ height: 38, padding: '0 20px', borderRadius: 8, background: C.primary, color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: addrSaving ? 'wait' : 'pointer', opacity: addrSaving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
              {addrSaving ? 'Saving…' : 'Save Address'}
            </button>
          </div>
        </div>
      </div>

      {/* ══ SECURITY ══════════════════════════════════ */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: '#F9F6F4' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LockOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Security</p>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: C.textSec }}>Authentication and account access controls</p>
          </div>
        </div>

        {/* ── Change PIN row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Change PIN</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>Update your 4-digit authentication PIN</p>
            </div>
          </div>
          <button
            onClick={() => setPinModalOpen(true)}
            style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}
          >
            Change
          </button>
        </div>

        {/* ── Forgot PIN row ── */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          {fpStage === 'idle' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MarkEmailReadOutlinedIcon sx={{ fontSize: 18, color: C.textDim }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Forgot PIN</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>Send a one-time code to your email to reset your PIN</p>
                </div>
              </div>
              <button
                onClick={handleSendOtp}
                disabled={fpBusy}
                style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 700, cursor: fpBusy ? 'wait' : 'pointer', opacity: fpBusy ? 0.6 : 1, whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}
              >
                {fpBusy ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          ) : fpStage === 'done' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(46,125,79,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 20, color: C.success }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.success }}>PIN reset successfully.</p>
                <button onClick={() => { setFpStage('idle'); setFpMsg(null); }} style={{ marginTop: 3, border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: C.info, textDecoration: 'underline', padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Dismiss
                </button>
              </div>
            </div>
          ) : (
            /* OTP form — inline within security section */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MarkEmailReadOutlinedIcon sx={{ fontSize: 15, color: C.info }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>PIN Reset via Email OTP</p>
                </div>
                <button onClick={() => { setFpStage('idle'); setFpOtp(''); setFpPin(''); setFpMsg(null); }} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: C.textDim, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <CloseOutlinedIcon sx={{ fontSize: 13 }} /> Cancel
                </button>
              </div>
              {fpMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: fpMsg.type === 'success' ? 'rgba(46,125,79,0.08)' : 'rgba(183,28,28,0.07)', border: `1px solid ${fpMsg.type === 'success' ? 'rgba(46,125,79,0.25)' : 'rgba(183,28,28,0.22)'}`, borderRadius: 7, padding: '8px 12px' }}>
                  {fpMsg.type === 'success' ? <CheckCircleOutlineIcon sx={{ fontSize: 14, color: C.success }} /> : <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: C.error }} />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: fpMsg.type === 'success' ? C.success : C.error }}>{fpMsg.text}</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.06em' }}>6-digit OTP from email</span>
                  <input
                    value={fpOtp}
                    onChange={e => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    maxLength={6}
                    style={{ height: 44, border: `1.5px solid ${fpOtp.length === 6 ? C.success : C.border}`, borderRadius: 8, padding: '0 14px', fontSize: 22, fontWeight: 700, letterSpacing: 10, color: C.textPri, outline: 'none', background: '#fff', textAlign: 'center', fontFamily: 'monospace', transition: 'border-color 0.15s' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.06em' }}>New 4-digit PIN</span>
                  <input
                    value={fpPin}
                    onChange={e => setFpPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    inputMode="numeric"
                    maxLength={4}
                    type="password"
                    style={{ height: 44, border: `1.5px solid ${fpPin.length === 4 ? C.success : C.border}`, borderRadius: 8, padding: '0 14px', fontSize: 18, fontWeight: 700, color: C.textPri, outline: 'none', background: '#fff', textAlign: 'center', fontFamily: 'monospace', transition: 'border-color 0.15s' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleResetPin}
                  disabled={fpBusy || fpOtp.length !== 6 || fpPin.length !== 4}
                  style={{ flex: 1, height: 42, borderRadius: 9, border: 'none', background: (fpBusy || fpOtp.length !== 6 || fpPin.length !== 4) ? C.elevated : C.primary, color: (fpBusy || fpOtp.length !== 6 || fpPin.length !== 4) ? C.textDim : '#fff', fontSize: 13, fontWeight: 700, cursor: (fpBusy || fpOtp.length !== 6 || fpPin.length !== 4) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'background 0.2s, color 0.2s' }}
                >
                  <LockOutlinedIcon sx={{ fontSize: 15 }} />
                  {fpBusy ? 'Resetting…' : 'Reset PIN'}
                </button>
                <button
                  onClick={handleSendOtp}
                  disabled={fpBusy}
                  style={{ padding: '0 16px', height: 42, borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, color: C.textSec, cursor: fpBusy ? 'wait' : 'pointer', opacity: fpBusy ? 0.6 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Danger Zone — nested at bottom of Security card ── */}
        <div style={{ padding: '16px 20px', background: 'rgba(183,28,28,0.025)', borderTop: `1px solid rgba(183,28,28,0.15)` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(183,28,28,0.09)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: C.error }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>Delete Account</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>Permanently remove your account. You will lose access immediately.</p>
              </div>
            </div>
            <button
              onClick={() => { setDelModalOpen(true); setDelError(''); }}
              style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid rgba(183,28,28,0.30)`, background: 'rgba(183,28,28,0.07)', color: C.error, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0 }}
            >
              Delete
            </button>
          </div>
        </div>

      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ══════════════════════════════════
   Main Settings Page
══════════════════════════════════ */
export default function ManagerSettingsPage() {
  const { token, user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'biometric';
  const setActiveTab = (key) => setSearchParams({ tab: key }, { replace: true });
  const isMobile = !useMediaQuery('(min-width:1024px)');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      background: C.bg, padding: isMobile ? '14px 14px 48px' : '20px 20px 32px', gap: isMobile ? 12 : 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
      width: '100%', overflowX: 'hidden',
    }}>
      <Toaster position="top-center" toastOptions={{ duration: 5000, style: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600 } }} />

      {/* Header */}
      {isMobile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 17, color: C.accent }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPri }}>Settings</h1>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Manager Portal</p>
            <h1 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>Settings</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>Manage integrations, notifications, and system configuration</p>
          </div>
        </div>
      )}

      {/* Tab bar — horizontally scrollable on mobile */}
      <div style={{ overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none', msOverflowStyle: 'none', marginBottom: -2 }}>
        <style>{`.settings-tab-bar::-webkit-scrollbar { display: none; }`}</style>
        <div
          className="settings-tab-bar"
          style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, minWidth: isMobile ? 'max-content' : 'auto' }}
        >
          {TABS.map(({ key, label, mobileLabel, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: 'center',
                  gap: isMobile ? 3 : 6,
                  padding: isMobile ? '7px 16px 9px' : '10px 18px',
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: active ? C.primary : C.textDim,
                  fontSize: isMobile ? 10 : 13,
                  fontWeight: active ? 700 : 500,
                  borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
                  marginBottom: -2,
                  transition: 'color 0.15s, border-color 0.15s',
                  flexShrink: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <Icon sx={{ fontSize: isMobile ? 16 : 15, color: active ? C.primary : C.textDim }} />
                {isMobile ? mobileLabel : label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'email'     && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DailyReportScheduleCard token={token} isMobile={isMobile} />
          <EmailRecipientsTab      token={token} isMobile={isMobile} />
        </div>
      )}
      {activeTab === 'managers'  && <ManagerManagementTab  token={token} currentUserId={user?._id} isMobile={isMobile} />}
      {activeTab === 'sync'      && <SyncDataTab           token={token} />}
      {activeTab === 'inventory' && <InventoryTab          token={token} />}
      {activeTab === 'profile'   && <ProfileManagementTab  token={token} />}
      {activeTab === 'database'  && <DatabaseManagementTab token={token} isMobile={isMobile} />}
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
