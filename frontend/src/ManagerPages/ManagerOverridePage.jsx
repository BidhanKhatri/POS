import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import CancelOutlinedIcon            from '@mui/icons-material/CancelOutlined';
import LocalOfferOutlinedIcon        from '@mui/icons-material/LocalOfferOutlined';
import PersonOutlinedIcon            from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon              from '@mui/icons-material/LockOutlined';
import KeyOutlinedIcon               from '@mui/icons-material/KeyOutlined';
import BackspaceOutlinedIcon         from '@mui/icons-material/BackspaceOutlined';
import ErrorOutlineOutlinedIcon      from '@mui/icons-material/ErrorOutlineOutlined';
import CheckCircleOutlinedIcon       from '@mui/icons-material/CheckCircleOutlined';
import CloseOutlinedIcon             from '@mui/icons-material/CloseOutlined';
import useAuthStore from '../store/useAuthStore';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

/* ─────────────────────────────────────────────
   Design tokens — AGENTS.md
───────────────────────────────────────────── */
const C = {
  primary:  '#3E2723',
  accent:   '#D4A373',
  error:    '#B71C1C',
  success:  '#2E7D4F',
  warning:  '#B26A00',
  info:     '#0277BD',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textDim:  '#A09490',
  border:   '#DDD2CC',
  surface:  '#ffffff',
  bg:       '#F5F3F1',
  elevated: '#EFE7E2',
};

const TYPE_META = {
  REFUND:   { icon: AdminPanelSettingsOutlinedIcon, label: 'Refund Request',   actionLabel: 'Verify & Authorize', priority: 'HIGH' },
  VOID:     { icon: CancelOutlinedIcon,             label: 'Void Request',     actionLabel: 'Confirm Void',        priority: 'STANDARD' },
  DISCOUNT: { icon: LocalOfferOutlinedIcon,          label: 'Discount Request', actionLabel: 'Approve Discount',    priority: 'LOYALTY' },
};

const PRIORITY = {
  HIGH:     { label: 'HIGH PRIORITY',  leftBorder: C.error,   badgeBg: 'rgba(183,28,28,0.09)',   badgeColor: C.error   },
  STANDARD: { label: 'STANDARD',       leftBorder: C.textDim, badgeBg: C.elevated,               badgeColor: C.textSec },
  LOYALTY:  { label: 'LOYALTY ACTION', leftBorder: C.accent,  badgeBg: 'rgba(212,163,115,0.15)', badgeColor: C.warning },
};

const formatMoney = (n) => `$${Number(n ?? 0).toFixed(2)}`;

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString();
};

/* ─────────────────────────────────────────────
   PIN Dialog
───────────────────────────────────────────── */
function PinDialog({ open, override, error, submitting, onClose, onConfirm }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => { if (open) setPin(''); }, [open]);

  const push = (d) => {
    if (pin.length < 4) setPin((p) => p + d);
  };
  const del = () => setPin((p) => p.slice(0, -1));
  const clear = () => setPin('');

  const handleConfirm = () => {
    if (pin.length < 4) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    onConfirm(pin);
  };

  const handleClose = () => {
    setPin('');
    onClose();
  };

  const KEYS = ['1','2','3','4','5','6','7','8','9'];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        style: {
          borderRadius: 16, maxWidth: 320, width: '100%',
          boxShadow: '0 20px 60px rgba(42,23,21,0.18)',
          margin: 16,
        },
      }}
    >
      <DialogContent style={{ padding: '28px 24px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: C.elevated,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <LockOutlinedIcon sx={{ fontSize: 24, color: C.primary }} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>Manager PIN</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec, lineHeight: '18px' }}>
            Enter your PIN to authorize<br />
            <strong style={{ color: C.textPri }}>{TYPE_META[override?.actionType]?.label}</strong>
          </p>
        </div>

        {/* PIN dots */}
        <div className={shake ? 'pin-shake' : ''} style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length ? C.primary : 'transparent',
              border: `2px solid ${i < pin.length ? C.primary : C.border}`,
              transition: 'background 0.15s, border-color 0.15s',
            }} />
          ))}
        </div>

        {error && (
          <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: C.error, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {KEYS.map((d) => (
            <button key={d} onClick={() => push(d)} style={{
              height: 50, borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.surface,
              fontSize: 20, fontWeight: 700, color: C.textPri,
              cursor: 'pointer',
              boxShadow: `0 3px 0 ${C.border}`,
            }}>
              {d}
            </button>
          ))}
          {/* Row 4: clear, 0, backspace */}
          <button onClick={clear} style={{
            height: 50, borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.bg,
            fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: '0.06em',
            cursor: 'pointer', boxShadow: `0 3px 0 ${C.border}`,
          }}>
            CLR
          </button>
          <button onClick={() => push('0')} style={{
            height: 50, borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.surface,
            fontSize: 20, fontWeight: 700, color: C.textPri,
            cursor: 'pointer', boxShadow: `0 3px 0 ${C.border}`,
          }}>
            0
          </button>
          <button onClick={del} style={{
            height: 50, borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: `0 3px 0 ${C.border}`,
          }}>
            <BackspaceOutlinedIcon sx={{ fontSize: 20, color: C.textSec }} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleClose} style={{
            flex: 1, height: 44, borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.surface,
            fontSize: 13, fontWeight: 600, color: C.textSec, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={submitting} style={{
            flex: 2, height: 44, borderRadius: 10,
            border: 'none', background: C.primary,
            fontSize: 13, fontWeight: 700, color: '#fff',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <KeyOutlinedIcon sx={{ fontSize: 16 }} />
            {submitting ? 'Verifying…' : 'Authorize'}
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   Override Card
───────────────────────────────────────────── */
function OverrideCard({ item, onAuthorize, onDeny, denying }) {
  const meta = TYPE_META[item.actionType] || TYPE_META.REFUND;
  const p = PRIORITY[meta.priority];
  const Icon = meta.icon;

  const details = [
    { label: 'Amount', value: formatMoney(item.amount), errorColor: true },
    { label: 'Item', value: `${item.productName || ''}${item.sku ? ` (${item.sku})` : ''}${item.requestedQty ? ` ×${item.requestedQty}` : ''}` },
  ];

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 5,
            background: p.badgeBg, color: p.badgeColor,
          }}>
            {p.label}
          </span>
          <Icon sx={{ fontSize: 16, color: C.textDim }} />
        </div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
          {meta.label} <span style={{ color: C.textDim, fontWeight: 600 }}>#{String(item._id).slice(-6).toUpperCase()}</span>
        </p>
        {item.invoiceNo && (
          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: C.textSec }}>
            Invoice <span style={{ color: C.primary }}>{item.invoiceNo}</span>
          </p>
        )}
      </div>

      {/* Employee row */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: C.elevated, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PersonOutlinedIcon sx={{ fontSize: 16, color: C.textSec }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: C.textDim, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Employee</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>
            {item.employeeId?.name || 'Unknown'} <span style={{ color: C.textDim, fontWeight: 500 }}>(ID: {item.employeeId?.employeeCode || '—'})</span>
          </p>
        </div>
      </div>

      {/* Detail rows */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${details.length}, 1fr)`, gap: 8 }}>
          {details.map(({ label, value, errorColor }) => (
            <div key={label} style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '8px 10px',
            }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px', color: errorColor ? C.error : C.textPri }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Buyer + payment method */}
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textSec }}>
            Buyer: <strong style={{ color: C.textPri }}>{item.buyer?.name || '—'}</strong>
            {item.buyer?.phone ? ` · ${item.buyer.phone}` : ''}
          </p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textSec }}>
            Refund via: <strong style={{ color: C.textPri }}>{item.paymentMethod}</strong>
            {item.card?.last4 ? ` •••• ${item.card.last4}` : ''}
          </p>
        </div>

        {/* Fraud-review signals */}
        {(item.methodOverridden || !item.buyerVerified) && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.methodOverridden && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
                background: 'rgba(183,28,28,0.09)', border: '1px solid rgba(183,28,28,0.25)', color: C.error,
              }}>
                ⚠ Refund method differs from original payment
              </span>
            )}
            {!item.buyerVerified && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
                background: 'rgba(178,106,0,0.10)', border: '1px solid rgba(178,106,0,0.30)', color: C.warning,
              }}>
                ⚠ Buyer not verified against invoice
              </span>
            )}
          </div>
        )}

        {item.reason && (
          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reason</p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.surface,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{item.reason}</span>
            </div>
          </div>
        )}
      </div>

      {/* Audit logs */}
      <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ margin: '0 0 5px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Audit Log
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textSec }}>Initiated {timeAgo(item.createdAt)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textSec }}>Requires PIN authorization</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
        <button
          onClick={() => onDeny(item)}
          disabled={denying}
          style={{
            height: 44, borderRadius: 10, padding: '0 16px',
            border: `1.5px solid ${C.border}`, background: C.surface,
            color: C.error, fontSize: 13, fontWeight: 700,
            cursor: denying ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <CloseOutlinedIcon sx={{ fontSize: 15 }} />
          Deny
        </button>
        <button
          onClick={() => onAuthorize(item)}
          style={{
            flex: 1, height: 44, borderRadius: 10,
            border: 'none', background: C.primary,
            color: '#fff',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 15 }} />
          {meta.actionLabel}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   History Row
───────────────────────────────────────────── */
function HistoryRow({ item, last }) {
  const approved = item.status === 'APPROVED';
  const meta = TYPE_META[item.actionType] || TYPE_META.REFUND;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr auto',
      gap: 12,
      alignItems: 'center',
      padding: '11px 14px',
      borderBottom: last ? 'none' : `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>
        {new Date(item.resolvedAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{meta.label}</p>
        <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>
          {item.employeeId?.name || 'Unknown'} ({item.employeeId?.employeeCode || '—'}) · {formatMoney(item.amount)}
        </p>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        padding: '3px 9px', borderRadius: 20,
        background: approved ? 'rgba(46,125,79,0.10)' : 'rgba(183,28,28,0.09)',
        color: approved ? C.success : C.error,
        border: `1px solid ${approved ? 'rgba(46,125,79,0.25)' : 'rgba(183,28,28,0.20)'}`,
        flexShrink: 0,
      }}>
        {item.status}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function ManagerOverridePage() {
  const token = useAuthStore((s) => s.token);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [pinTarget, setPinTarget] = useState(null);
  const [pinError, setPinError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [denyingId, setDenyingId] = useState(null);

  const loadOverrides = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/overrides`, { headers })
      .then((r) => r.json())
      .then((data) => setOverrides(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const pending = overrides.filter((o) => o.status === 'PENDING');
  const history = overrides.filter((o) => o.status !== 'PENDING');

  const handleAuthorize = (item) => {
    setPinError('');
    setPinTarget(item);
  };

  const handlePinConfirm = async (pin) => {
    setSubmitting(true);
    setPinError('');
    try {
      const res = await fetch(`${API}/api/overrides/${pinTarget._id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authorization failed');
      setPinTarget(null);
      loadOverrides();
    } catch (e) {
      setPinError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeny = async (item) => {
    setDenyingId(item._id);
    try {
      await fetch(`${API}/api/overrides/${item._id}/deny`, { method: 'POST', headers });
      loadOverrides();
    } finally {
      setDenyingId(null);
    }
  };

  return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Manager Portal
          </p>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPri, letterSpacing: '-0.1px' }}>
            Overrides
          </h1>
        </div>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 20, background: 'rgba(46,125,79,0.10)', border: '1px solid rgba(46,125,79,0.22)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.success, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.success, letterSpacing: '0.04em' }}>Live</span>
        </div>
      </div>

      {/* ── Queue summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          {
            label: 'Active', value: pending.length,
            color: pending.length > 0 ? C.error : C.success,
            Icon: ErrorOutlineOutlinedIcon,
            iconBg: pending.length > 0 ? 'rgba(183,28,28,0.10)' : 'rgba(46,125,79,0.10)',
          },
          {
            label: 'Resolved', value: history.length,
            color: C.success,
            Icon: CheckCircleOutlinedIcon,
            iconBg: 'rgba(46,125,79,0.10)',
          },
        ].map(({ label, value, color, Icon, iconBg }) => (
          <div key={label} style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderLeft: `2px solid ${color}`,
            borderRadius: 10,
            padding: '11px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: iconBg, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon sx={{ fontSize: 18, color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, lineHeight: 1, letterSpacing: '-0.4px' }}>
                {String(value).padStart(2, '0')}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending overrides ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Pending Authorization
        </span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, fontWeight: 600, color: C.textDim }}>
          Loading overrides…
        </div>
      ) : pending.length === 0 ? (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '36px 24px',
          textAlign: 'center', marginBottom: 20,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 22, color: C.success }} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>All Clear</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>No pending override requests.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {pending.map((item) => (
            <OverrideCard
              key={item._id}
              item={item}
              onAuthorize={handleAuthorize}
              onDeny={handleDeny}
              denying={denyingId === item._id}
            />
          ))}
        </div>
      )}

      {/* ── Override history ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Override History
        </span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 1fr auto',
          gap: 12, padding: '9px 14px',
          background: '#F3EDE9', borderBottom: `1px solid ${C.border}`,
        }}>
          {['Time', 'Request', 'Status'].map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {h}
            </span>
          ))}
        </div>
        {history.length === 0 ? (
          <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, fontWeight: 500, color: C.textDim }}>
            No resolved overrides yet.
          </div>
        ) : (
          history.map((item, i) => (
            <HistoryRow key={item._id} item={item} last={i === history.length - 1} />
          ))
        )}
      </div>

      {/* PIN dialog */}
      <PinDialog
        open={!!pinTarget}
        override={pinTarget}
        error={pinError}
        submitting={submitting}
        onClose={() => setPinTarget(null)}
        onConfirm={handlePinConfirm}
      />

    </div>
  );
}
