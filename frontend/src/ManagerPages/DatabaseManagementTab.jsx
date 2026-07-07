import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@mui/material';
import CloudUploadOutlinedIcon     from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineOutlinedIcon   from '@mui/icons-material/DeleteOutlineOutlined';
import DownloadOutlinedIcon        from '@mui/icons-material/DownloadOutlined';
import RestoreOutlinedIcon         from '@mui/icons-material/RestoreOutlined';
import HistoryOutlinedIcon         from '@mui/icons-material/HistoryOutlined';
import FactCheckOutlinedIcon       from '@mui/icons-material/FactCheckOutlined';
import WarningAmberOutlinedIcon    from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineIcon      from '@mui/icons-material/CheckCircleOutlined';
import CloseOutlinedIcon           from '@mui/icons-material/CloseOutlined';
import KeyOutlinedIcon             from '@mui/icons-material/KeyOutlined';
import RefreshOutlinedIcon         from '@mui/icons-material/RefreshOutlined';
import ReceiptLongOutlinedIcon     from '@mui/icons-material/ReceiptLongOutlined';
import AssessmentOutlinedIcon      from '@mui/icons-material/AssessmentOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import BadgeOutlinedIcon           from '@mui/icons-material/BadgeOutlined';
import CalendarMonthOutlinedIcon   from '@mui/icons-material/CalendarMonthOutlined';
import GroupsOutlinedIcon          from '@mui/icons-material/GroupsOutlined';
import Inventory2OutlinedIcon      from '@mui/icons-material/Inventory2Outlined';
import CachedOutlinedIcon          from '@mui/icons-material/CachedOutlined';
import { API_URL as API } from '../config/api';

const C = {
  primary: '#3E2723', accent: '#D4A373', bg: '#F5F3F1', surface: '#ffffff',
  elevated: '#EFE7E2', border: '#DDD2CC',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
};

const CONFIRMATION_PHRASE = 'DELETE';

const MODULE_META = {
  dashboardCache: { icon: CachedOutlinedIcon,               color: '#0277BD', bg: 'rgba(2,119,189,0.08)' },
  transactions:   { icon: ReceiptLongOutlinedIcon,          color: '#0277BD', bg: 'rgba(2,119,189,0.08)' },
  reports:        { icon: AssessmentOutlinedIcon,           color: C.primary, bg: 'rgba(62,39,35,0.08)' },
  overrides:      { icon: AdminPanelSettingsOutlinedIcon,   color: '#7B1FA2', bg: 'rgba(123,31,162,0.08)' },
  employees:      { icon: BadgeOutlinedIcon,                color: C.warning, bg: 'rgba(178,106,0,0.08)' },
  schedules:      { icon: CalendarMonthOutlinedIcon,        color: '#00695C', bg: 'rgba(0,105,92,0.08)' },
  groups:         { icon: GroupsOutlinedIcon,               color: '#00695C', bg: 'rgba(0,105,92,0.08)' },
  inventory:      { icon: Inventory2OutlinedIcon,           color: C.success, bg: 'rgba(46,125,79,0.08)' },
};

const fmtNum   = (n) => Number(n ?? 0).toLocaleString('en-US');
const fmtBytes = (n) => {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function InfoBanner({ children, tone = 'info' }) {
  const colors = {
    info:    { bg: 'rgba(2,119,189,0.06)',  border: 'rgba(2,119,189,0.18)',  text: '#01579B', Icon: FactCheckOutlinedIcon },
    warning: { bg: 'rgba(178,106,0,0.07)',  border: 'rgba(178,106,0,0.22)',  text: '#7A4A00', Icon: WarningAmberOutlinedIcon },
  };
  const t = colors[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '11px 14px' }}>
      <t.Icon sx={{ fontSize: 15, color: t.text, flexShrink: 0, marginTop: '1px' }} />
      <p style={{ margin: 0, fontSize: 12, color: t.text, fontWeight: 500, lineHeight: '18px' }}>{children}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    COMPLETED: { bg: 'rgba(46,125,79,0.10)', color: C.success },
    IN_PROGRESS: { bg: 'rgba(2,119,189,0.10)', color: C.info },
    FAILED: { bg: 'rgba(183,28,28,0.09)', color: C.error },
    NEVER_RESTORED: { bg: C.elevated, color: C.textDim },
    RESTORED: { bg: 'rgba(46,125,79,0.10)', color: C.success },
    RESTORE_FAILED: { bg: 'rgba(183,28,28,0.09)', color: C.error },
  };
  const s = map[status] || map.NEVER_RESTORED;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/* ── OTP input: single text field, paste-friendly, not a custom numpad ── */
function OtpInput({ value, onChange, error }) {
  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        inputMode="numeric"
        autoComplete="one-time-code"
        style={{
          width: '100%', boxSizing: 'border-box', textAlign: 'center',
          fontSize: 26, fontWeight: 800, letterSpacing: '10px', color: C.textPri,
          padding: '12px 10px 12px 20px', borderRadius: 10,
          border: `1.5px solid ${error ? C.error : value.length === 6 ? C.success : C.border}`,
          outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      />
      {error && <p style={{ margin: '6px 0 0', fontSize: 11.5, fontWeight: 600, color: C.error }}>{error}</p>}
    </div>
  );
}

/* ══════════════════════════════════
   Delete confirmation dialog
══════════════════════════════════ */
function DeleteDialog({ module, onClose, onDeleted, authHeaders, isMobile }) {
  const [step, setStep] = useState('confirm'); // confirm -> otp -> progress -> result
  const [otp, setOtp] = useState('');
  const [phrase, setPhrase] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpMsg, setOtpMsg] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok, backupId, recordsAffected, message }

  const sendOtp = async () => {
    setSendingOtp(true); setOtpMsg(''); setOtpError('');
    try {
      const res = await fetch(`${API}/api/database-management/otp/request`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send code');
      setOtpMsg(data.message);
      setStep('otp');
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const submitDelete = async () => {
    setSubmitting(true); setOtpError(''); setStep('progress');
    try {
      const res = await fetch(`${API}/api/database-management/${module.key}/delete`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ otp, confirmationPhrase: phrase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setResult({ ok: true, ...data });
      setStep('result');
      onDeleted?.();
    } catch (err) {
      setResult({ ok: false, message: err.message });
      setStep('result');
    } finally {
      setSubmitting(false);
    }
  };

  const phraseValid = phrase === CONFIRMATION_PHRASE;

  return (
    <Dialog open onClose={submitting ? undefined : onClose} PaperProps={{ style: { borderRadius: 16, width: isMobile ? '94vw' : 460, maxWidth: 460, fontFamily: "'Plus Jakarta Sans', sans-serif" } }}>
      <div style={{ background: `linear-gradient(135deg, ${C.error} 0%, #7B1010 100%)`, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>Delete {module.label}</p>
        </div>
        {!submitting && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.7 }}>
            <CloseOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
          </button>
        )}
      </div>

      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {step === 'confirm' && (
          <>
            <InfoBanner tone="warning">
              This will permanently delete <strong>{fmtNum(module.totalRecords)} record{module.totalRecords === 1 ? '' : 's'}</strong> from {module.label}.
              An automatic backup is created first, so this can be undone via Restore afterward.
            </InfoBanner>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {module.breakdown?.map((b) => (
                <div key={b.model} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: C.elevated, borderRadius: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>{b.model}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.textPri }}>{fmtNum(b.count)}</span>
                </div>
              ))}
            </div>
            {otpError && <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.error }}>{otpError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={btnSecondary}>Cancel</button>
              <button onClick={sendOtp} disabled={sendingOtp} style={{ ...btnDanger, opacity: sendingOtp ? 0.6 : 1 }}>
                {sendingOtp ? 'Sending…' : 'Send Verification Code'}
              </button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <InfoBanner>{otpMsg || 'A verification code was sent to your email.'}</InfoBanner>
            <div>
              <label style={labelStyle}>6-Digit Code</label>
              <OtpInput value={otp} onChange={setOtp} />
            </div>
            <div>
              <label style={labelStyle}>Type <strong>{CONFIRMATION_PHRASE}</strong> to confirm</label>
              <input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={CONFIRMATION_PHRASE}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8,
                  border: `1.5px solid ${phrase.length === 0 ? C.border : phraseValid ? C.success : C.error}`,
                  outline: 'none', fontSize: 14, fontWeight: 700, color: C.textPri, letterSpacing: '0.05em',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
            </div>
            {otpError && <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.error }}>{otpError}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={btnSecondary}>Cancel</button>
              <button
                onClick={submitDelete}
                disabled={otp.length !== 6 || !phraseValid || submitting}
                style={{ ...btnDanger, opacity: (otp.length !== 6 || !phraseValid || submitting) ? 0.5 : 1, cursor: (otp.length !== 6 || !phraseValid) ? 'not-allowed' : 'pointer' }}
              >
                <KeyOutlinedIcon sx={{ fontSize: 15 }} /> Confirm Delete
              </button>
            </div>
          </>
        )}

        {step === 'progress' && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div className="dbmgmt-spin" style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.error, margin: '0 auto 14px' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>Backing up and deleting…</p>
            <p style={{ margin: '4px 0 0', fontSize: 11.5, color: C.textDim }}>This won't take long. Do not close this window.</p>
          </div>
        )}

        {step === 'result' && result && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            {result.ok ? (
              <>
                <CheckCircleOutlineIcon sx={{ fontSize: 34, color: C.success }} />
                <p style={{ margin: '10px 0 2px', fontSize: 14, fontWeight: 800, color: C.textPri }}>Deleted successfully</p>
                <p style={{ margin: 0, fontSize: 12, color: C.textSec }}>{fmtNum(result.recordsAffected)} record(s) removed. Backup ID: {String(result.backupId).slice(-8)}</p>
              </>
            ) : (
              <>
                <WarningAmberOutlinedIcon sx={{ fontSize: 34, color: C.error }} />
                <p style={{ margin: '10px 0 2px', fontSize: 14, fontWeight: 800, color: C.textPri }}>Delete failed</p>
                <p style={{ margin: 0, fontSize: 12, color: C.error }}>{result.message}</p>
              </>
            )}
            <button onClick={onClose} style={{ ...btnSecondary, marginTop: 18, width: '100%' }}>Done</button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ══════════════════════════════════
   Restore dialog
══════════════════════════════════ */
function RestoreDialog({ backup, onClose, onRestored, authHeaders, isMobile }) {
  const [otp, setOtp] = useState('');
  const [otpMsg, setOtpMsg] = useState('');
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [ack, setAck] = useState(false);
  const [force, setForce] = useState(false);
  const [conflict, setConflict] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const sendOtp = async () => {
    setSendingOtp(true); setOtpError('');
    try {
      const res = await fetch(`${API}/api/database-management/otp/request`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send code');
      setOtpMsg(data.message);
      setOtpSent(true);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const submitRestore = async () => {
    setSubmitting(true); setOtpError(''); setConflict('');
    try {
      const res = await fetch(`${API}/api/database-management/backups/${backup._id}/restore`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ otp, force }),
      });
      const data = await res.json();
      if (res.status === 409) { setConflict(data.message); return; }
      if (!res.ok) throw new Error(data.message || 'Restore failed');
      setResult({ ok: true, ...data });
      onRestored?.();
    } catch (err) {
      setResult({ ok: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={submitting ? undefined : onClose} PaperProps={{ style: { borderRadius: 16, width: isMobile ? '94vw' : 440, maxWidth: 440, fontFamily: "'Plus Jakarta Sans', sans-serif" } }}>
      <div style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #5D4037 100%)`, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RestoreOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff' }}>Restore Backup</p>
        </div>
        {!submitting && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.7 }}>
            <CloseOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
          </button>
        )}
      </div>

      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {result ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            {result.ok ? (
              <>
                <CheckCircleOutlineIcon sx={{ fontSize: 34, color: C.success }} />
                <p style={{ margin: '10px 0 2px', fontSize: 14, fontWeight: 800, color: C.textPri }}>Restored successfully</p>
                <p style={{ margin: 0, fontSize: 12, color: C.textSec }}>{fmtNum(result.recordsRestored)} record(s) restored.</p>
              </>
            ) : (
              <>
                <WarningAmberOutlinedIcon sx={{ fontSize: 34, color: C.error }} />
                <p style={{ margin: '10px 0 2px', fontSize: 14, fontWeight: 800, color: C.textPri }}>Restore failed</p>
                <p style={{ margin: 0, fontSize: 12, color: C.error }}>{result.message}</p>
              </>
            )}
            <button onClick={onClose} style={{ ...btnSecondary, marginTop: 18, width: '100%' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ background: C.elevated, borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri }}>{backup.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textSec }}>{fmtNum(backup.recordCount)} records &middot; {fmtDate(backup.createdAt)}</p>
            </div>

            {conflict && <InfoBanner tone="warning">{conflict}</InfoBanner>}
            {conflict && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: C.textPri, cursor: 'pointer' }}>
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
                Force restore anyway (may duplicate existing records)
              </label>
            )}

            {!otpSent ? (
              <>
                <InfoBanner>Restoring will insert these historical records back into the live collection. Requires a verification code.</InfoBanner>
                {otpError && <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.error }}>{otpError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={onClose} style={btnSecondary}>Cancel</button>
                  <button onClick={sendOtp} disabled={sendingOtp} style={{ ...btnPrimary, opacity: sendingOtp ? 0.6 : 1 }}>
                    {sendingOtp ? 'Sending…' : 'Send Verification Code'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <InfoBanner>{otpMsg}</InfoBanner>
                <div>
                  <label style={labelStyle}>6-Digit Code</label>
                  <OtpInput value={otp} onChange={setOtp} />
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, fontWeight: 600, color: C.textSec, cursor: 'pointer' }}>
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 2 }} />
                  I understand this will insert historical records back into the live database.
                </label>
                {otpError && <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: C.error }}>{otpError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={onClose} style={btnSecondary}>Cancel</button>
                  <button
                    onClick={submitRestore}
                    disabled={otp.length !== 6 || !ack || submitting}
                    style={{ ...btnPrimary, opacity: (otp.length !== 6 || !ack || submitting) ? 0.5 : 1, cursor: (otp.length !== 6 || !ack) ? 'not-allowed' : 'pointer' }}
                  >
                    {submitting ? 'Restoring…' : 'Confirm Restore'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: C.textSec, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 };
const btnBase = { flex: 1, minHeight: 42, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" };
const btnSecondary = { ...btnBase, background: C.surface, color: C.textSec, border: `1px solid ${C.border}` };
const btnDanger    = { ...btnBase, background: C.error, color: '#fff' };
const btnPrimary   = { ...btnBase, background: C.primary, color: '#fff' };

/* ══════════════════════════════════
   Module card
══════════════════════════════════ */
function ModuleCard({ mod, onBackup, onDelete, onClearCache, backingUp, clearingCache, isMobile }) {
  const meta = MODULE_META[mod.key] || MODULE_META.transactions;
  const Icon = meta.icon;
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearClick = () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
    setConfirmClear(false);
    onClearCache(mod);
  };

  const iconBox = isMobile ? 30 : 36;
  const iconFs  = isMobile ? 15 : 18;
  const btnStyle = isMobile ? { ...btnBase, minHeight: 36, fontSize: 11, padding: '0 6px', gap: 4 } : btnBase;
  const btnIconFs = isMobile ? 13 : 15;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? '11px 12px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, minWidth: 0 }}>
        <div style={{ width: iconBox, height: iconBox, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon sx={{ fontSize: iconFs, color: meta.color }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, fontWeight: 800, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.label}</p>
          {mod.optional && <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Optional</p>}
        </div>
      </div>

      {mod.clearOnly ? (
        <p style={{ margin: 0, fontSize: isMobile ? 10.5 : 11.5, color: C.textSec }}>{isMobile ? 'Clears in-memory caches.' : 'Clears in-memory report/staffing caches. Rebuilt automatically on next request.'}</p>
      ) : (
        <p style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>{fmtNum(mod.totalRecords)} <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: C.textDim }}>records</span></p>
      )}

      <div style={{ display: 'flex', gap: isMobile ? 6 : 8 }}>
        {mod.clearOnly ? (
          <button
            onClick={handleClearClick}
            disabled={clearingCache}
            style={{ ...btnStyle, background: confirmClear ? C.warning : C.elevated, color: confirmClear ? '#fff' : C.textPri, opacity: clearingCache ? 0.6 : 1 }}
          >
            <CachedOutlinedIcon sx={{ fontSize: btnIconFs }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clearingCache ? 'Clearing…' : confirmClear ? (isMobile ? 'Confirm?' : 'Click again to confirm') : 'Clear Cache'}
            </span>
          </button>
        ) : (
          <>
            <button onClick={() => onBackup(mod)} disabled={backingUp} style={{ ...btnStyle, background: C.elevated, color: C.textPri, opacity: backingUp ? 0.6 : 1 }}>
              <CloudUploadOutlinedIcon sx={{ fontSize: btnIconFs }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{backingUp ? (isMobile ? '…' : 'Backing up…') : 'Backup'}</span>
            </button>
            <button onClick={() => onDelete(mod)} disabled={mod.totalRecords === 0} style={{ ...btnStyle, background: mod.totalRecords === 0 ? C.elevated : 'rgba(183,28,28,0.10)', color: mod.totalRecords === 0 ? C.textDim : C.error, opacity: mod.totalRecords === 0 ? 0.6 : 1, cursor: mod.totalRecords === 0 ? 'not-allowed' : 'pointer' }}>
              <DeleteOutlineOutlinedIcon sx={{ fontSize: btnIconFs }} /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   Backup history table
══════════════════════════════════ */
function BackupHistoryTable({ backups, onDownload, onRestore, isMobile }) {
  if (!backups.length) {
    return <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, color: C.textDim }}>No backups yet. Backups are created automatically before every delete, or on demand above.</div>;
  }
  return (
    <div className="no-scrollbar" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: 'auto' }}>
      <div style={{ minWidth: isMobile ? 640 : 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 90px 130px auto', gap: 10, padding: '9px 16px', background: '#F3EDE9', borderBottom: `1px solid ${C.border}` }}>
          {['Module', 'Created', 'Size', 'Status', ''].map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {backups.map((b, i) => (
          <div key={b._id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 90px 130px auto', gap: 10, alignItems: 'center', padding: '10px 16px', borderBottom: i === backups.length - 1 ? 'none' : `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>{b.label}</span>
            <div>
              <p style={{ margin: 0, fontSize: 11.5, color: C.textSec }}>{fmtDate(b.createdAt)}</p>
              <p style={{ margin: 0, fontSize: 10.5, color: C.textDim }}>by {b.createdByName} &middot; {fmtNum(b.recordCount)} records</p>
            </div>
            <span style={{ fontSize: 11.5, color: C.textSec }}>{fmtBytes(b.sizeBytes)}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <StatusPill status={b.status} />
              <StatusPill status={b.restoreStatus} />
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button onClick={() => onDownload(b)} disabled={b.status !== 'COMPLETED'} title="Download" style={{ background: 'none', border: 'none', cursor: b.status === 'COMPLETED' ? 'pointer' : 'not-allowed', padding: 6, opacity: b.status === 'COMPLETED' ? 1 : 0.4 }}>
                <DownloadOutlinedIcon sx={{ fontSize: 16, color: C.textSec }} />
              </button>
              <button onClick={() => onRestore(b)} disabled={b.status !== 'COMPLETED'} title="Restore" style={{ background: 'none', border: 'none', cursor: b.status === 'COMPLETED' ? 'pointer' : 'not-allowed', padding: 6, opacity: b.status === 'COMPLETED' ? 1 : 0.4 }}>
                <RestoreOutlinedIcon sx={{ fontSize: 16, color: C.primary }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   Audit log table
══════════════════════════════════ */
function AuditLogTable({ logs, isMobile }) {
  if (!logs.length) {
    return <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, color: C.textDim }}>No database management actions logged yet.</div>;
  }
  return (
    <div className="no-scrollbar" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: 'auto' }}>
      <div style={{ minWidth: isMobile ? 680 : 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 110px 90px 140px 1fr', gap: 10, padding: '9px 16px', background: '#F3EDE9', borderBottom: `1px solid ${C.border}` }}>
          {['Manager', 'Action', 'Module', 'Records', 'Timestamp', 'IP'].map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>
        {logs.map((l, i) => (
          <div key={l._id} style={{ display: 'grid', gridTemplateColumns: '150px 140px 110px 90px 140px 1fr', gap: 10, alignItems: 'center', padding: '9px 16px', borderBottom: i === logs.length - 1 ? 'none' : `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.performedBy?.name || 'Unknown'}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.textSec }}>{l.action.replace('DATABASE_', '')}</span>
            <span style={{ fontSize: 11.5, color: C.textSec }}>{l.entity}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textPri }}>{l.afterData?.recordsAffected ?? '—'}</span>
            <span style={{ fontSize: 11, color: C.textDim }}>{fmtDate(l.timestamp)}</span>
            <span style={{ fontSize: 11, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.ipAddress || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   Main tab
══════════════════════════════════ */
export default function DatabaseManagementTab({ token, isMobile }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [modules, setModules] = useState([]);
  const [backups, setBackups] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backingUpKey, setBackingUpKey] = useState(null);
  const [clearingCacheKey, setClearingCacheKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, bRes, aRes] = await Promise.all([
        fetch(`${API}/api/database-management/modules`, { headers: authHeaders }),
        fetch(`${API}/api/database-management/backups`, { headers: authHeaders }),
        fetch(`${API}/api/database-management/audit-logs`, { headers: authHeaders }),
      ]);
      setModules(await mRes.json());
      setBackups(await bRes.json());
      setAuditLogs(await aRes.json());
    } catch {
      // Leave existing state in place on transient network errors.
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const showToast = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 4000); };

  const handleBackup = async (mod) => {
    setBackingUpKey(mod.key);
    try {
      const res = await fetch(`${API}/api/database-management/${mod.key}/backup`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Backup failed');
      showToast('success', `${mod.label} backed up (${data.recordCount} records).`);
      loadAll();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBackingUpKey(null);
    }
  };

  const handleClearCache = async (mod) => {
    setClearingCacheKey(mod.key);
    try {
      const res = await fetch(`${API}/api/database-management/${mod.key}/delete`, { method: 'POST', headers: authHeaders, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Clear cache failed');
      showToast('success', 'Dashboard cache cleared.');
      loadAll();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setClearingCacheKey(null);
    }
  };

  const handleDownload = async (backup) => {
    try {
      const res = await fetch(`${API}/api/database-management/backups/${backup._id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || 'Download failed'); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backup.label.replace(/\s+/g, '-').toLowerCase()}-${backup._id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><span style={{ fontSize: 13, color: C.textDim }}>Loading database management…</span></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes dbmgmt-spin { to { transform: rotate(360deg); } } .dbmgmt-spin { animation: dbmgmt-spin 0.8s linear infinite; }`}</style>

      <InfoBanner>
        Every delete automatically creates a backup first, and requires a one-time verification code plus typing <strong>{CONFIRMATION_PHRASE}</strong> to confirm.
        All actions here are permanently logged in the audit trail below.
      </InfoBanner>

      {toast && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: toast.type === 'success' ? 'rgba(46,125,79,0.08)' : 'rgba(183,28,28,0.07)', border: `1px solid ${toast.type === 'success' ? 'rgba(46,125,79,0.25)' : 'rgba(183,28,28,0.22)'}`, borderRadius: 8, padding: '9px 14px' }}>
          {toast.type === 'success' ? <CheckCircleOutlineIcon sx={{ fontSize: 15, color: C.success }} /> : <WarningAmberOutlinedIcon sx={{ fontSize: 15, color: C.error }} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: toast.type === 'success' ? C.success : C.error }}>{toast.text}</span>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Modules</p>
          <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: C.textSec, fontSize: 11.5, fontWeight: 600 }}>
            <RefreshOutlinedIcon sx={{ fontSize: 14 }} /> Refresh
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? 8 : 12 }}>
          {modules.map((mod) => (
            <ModuleCard
              key={mod.key}
              mod={mod}
              onBackup={handleBackup}
              onDelete={setDeleteTarget}
              onClearCache={handleClearCache}
              backingUp={backingUpKey === mod.key}
              clearingCache={clearingCacheKey === mod.key}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <HistoryOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Backup History</p>
        </div>
        <BackupHistoryTable backups={backups} onDownload={handleDownload} onRestore={setRestoreTarget} isMobile={isMobile} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <FactCheckOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Audit Log</p>
        </div>
        <AuditLogTable logs={auditLogs} isMobile={isMobile} />
      </div>

      {deleteTarget && (
        <DeleteDialog
          module={deleteTarget}
          authHeaders={authHeaders}
          isMobile={isMobile}
          onClose={() => setDeleteTarget(null)}
          onDeleted={loadAll}
        />
      )}
      {restoreTarget && (
        <RestoreDialog
          backup={restoreTarget}
          authHeaders={authHeaders}
          isMobile={isMobile}
          onClose={() => setRestoreTarget(null)}
          onRestored={loadAll}
        />
      )}
    </div>
  );
}
