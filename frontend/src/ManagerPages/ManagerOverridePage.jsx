import React, { useState } from 'react';
import { Dialog, DialogContent } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import CancelOutlinedIcon            from '@mui/icons-material/CancelOutlined';
import LocalOfferOutlinedIcon        from '@mui/icons-material/LocalOfferOutlined';
import HistoryOutlinedIcon           from '@mui/icons-material/HistoryOutlined';
import PersonOutlinedIcon            from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon              from '@mui/icons-material/LockOutlined';
import KeyOutlinedIcon               from '@mui/icons-material/KeyOutlined';
import BackspaceOutlinedIcon         from '@mui/icons-material/BackspaceOutlined';
import ErrorOutlineOutlinedIcon      from '@mui/icons-material/ErrorOutlineOutlined';
import CheckCircleOutlinedIcon       from '@mui/icons-material/CheckCircleOutlined';

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

/* ─────────────────────────────────────────────
   Priority config
───────────────────────────────────────────── */
const PRIORITY = {
  HIGH:     { label: 'HIGH PRIORITY',  leftBorder: C.error,   badgeBg: 'rgba(183,28,28,0.09)', badgeColor: C.error   },
  STANDARD: { label: 'STANDARD',       leftBorder: C.textDim, badgeBg: C.elevated,             badgeColor: C.textSec },
  LOYALTY:  { label: 'LOYALTY ACTION', leftBorder: C.accent,  badgeBg: 'rgba(212,163,115,0.15)', badgeColor: C.warning },
};

const TYPE_META = {
  REFUND:   { icon: AdminPanelSettingsOutlinedIcon, label: 'Refund Request'   },
  VOID:     { icon: CancelOutlinedIcon,             label: 'Void Request'     },
  DISCOUNT: { icon: LocalOfferOutlinedIcon,         label: 'Discount Request' },
};

/* ─────────────────────────────────────────────
   Mock pending overrides
───────────────────────────────────────────── */
const PENDING = [
  {
    id: '#8921', type: 'REFUND', priority: 'HIGH',
    employee: { name: 'Sarah Jenkins', code: '402' },
    details: [
      { label: 'Amount', value: '$42.50',          errorColor: true },
      { label: 'Items',  value: 'Heritage Roast (1)' },
    ],
    logs: ['Initiated 4m 12s ago', 'Requires PIN authorization'],
    actionLabel: 'Verify & Authorize',
  },
  {
    id: '#8922', type: 'VOID', priority: 'STANDARD',
    employee: { name: 'Michael Chen', code: '305' },
    details: [
      { label: 'Total',  value: '$125.00' },
      { label: 'Reason', value: 'Change of Mind' },
    ],
    quote: 'Customer realized they forgot their wallet and preferred to restart the transaction later.',
    actionLabel: 'Confirm Void',
  },
  {
    id: '#8923', type: 'DISCOUNT', priority: 'LOYALTY',
    employee: { name: 'Elena Rodriguez', code: '412' },
    details: [
      { label: 'Original', value: '$210.00' },
      { label: 'Proposed', value: '25% OFF', accentColor: true },
    ],
    reason: 'VIP Loyalty',
    actionLabel: 'Approve Discount',
  },
];

/* ─────────────────────────────────────────────
   Mock history
───────────────────────────────────────────── */
const HISTORY = [
  { time: '10:45 AM', type: 'Manager Sale Entry', employee: 'Kevin S. (09)',   amount: '$450.00', status: 'APPROVED' },
  { time: '10:32 AM', type: 'Price Override',      employee: 'Sarah J. (402)',  amount: '$12.99',  status: 'DENIED'   },
  { time: '09:58 AM', type: 'Void Request',         employee: 'James K. (211)', amount: '$89.00',  status: 'APPROVED' },
  { time: '09:14 AM', type: 'Refund',               employee: 'Amy L. (307)',   amount: '$34.50',  status: 'APPROVED' },
];

/* ─────────────────────────────────────────────
   PIN Dialog
───────────────────────────────────────────── */
function PinDialog({ open, override, onClose, onConfirm }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

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
    setPin('');
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
            <strong style={{ color: C.textPri }}>{override?.id} — {TYPE_META[override?.type]?.label}</strong>
          </p>
        </div>

        {/* PIN dots */}
        <div className={shake ? 'pin-shake' : ''} style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length ? C.primary : 'transparent',
              border: `2px solid ${i < pin.length ? C.primary : C.border}`,
              transition: 'background 0.15s, border-color 0.15s',
            }} />
          ))}
        </div>

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
          <button onClick={handleConfirm} style={{
            flex: 2, height: 44, borderRadius: 10,
            border: 'none', background: C.primary,
            fontSize: 13, fontWeight: 700, color: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <KeyOutlinedIcon sx={{ fontSize: 16 }} />
            Authorize
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   Override Card
───────────────────────────────────────────── */
function OverrideCard({ item, onAction }) {
  const p = PRIORITY[item.priority];
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;

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
          {meta.label} <span style={{ color: C.textDim, fontWeight: 600 }}>{item.id}</span>
        </p>
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
            {item.employee.name} <span style={{ color: C.textDim, fontWeight: 500 }}>(ID: {item.employee.code})</span>
          </p>
        </div>
      </div>

      {/* Detail rows */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${item.details.length}, 1fr)`, gap: 8 }}>
          {item.details.map(({ label, value, errorColor, accentColor }) => (
            <div key={label} style={{
              background: accentColor ? 'rgba(212,163,115,0.12)' : C.bg,
              border: `1px solid ${accentColor ? 'rgba(212,163,115,0.35)' : C.border}`,
              borderRadius: 8, padding: '8px 10px',
            }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px', color: errorColor ? C.error : accentColor ? C.warning : C.textPri }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Customer quote */}
        {item.quote && (
          <div style={{
            marginTop: 8, padding: '8px 12px',
            borderLeft: `3px solid ${C.accent}`,
            background: 'rgba(212,163,115,0.08)',
            borderRadius: '0 6px 6px 0',
          }}>
            <p style={{ margin: 0, fontSize: 12, fontStyle: 'italic', color: C.textSec, lineHeight: '18px' }}>
              "{item.quote}"
            </p>
          </div>
        )}

        {/* Reason chip */}
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
      {item.logs && (
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ margin: '0 0 5px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Audit Log
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {item.logs.map((log, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: C.textSec }}>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action button */}
      <div style={{ padding: '12px 14px' }}>
        <button
          onClick={() => onAction(item)}
          style={{
            width: '100%', height: 44, borderRadius: 10,
            border: item.priority === 'STANDARD' ? `1.5px solid ${C.primary}` : 'none',
            background: item.priority === 'STANDARD' ? C.surface : C.primary,
            color: item.priority === 'STANDARD' ? C.primary : '#fff',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 15 }} />
          {item.actionLabel}
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
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr auto',
      gap: 12,
      alignItems: 'center',
      padding: '11px 14px',
      borderBottom: last ? 'none' : `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>{item.time}</span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{item.type}</p>
        <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>{item.employee} · {item.amount}</p>
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
  const [pinTarget, setPinTarget] = useState(null);
  const [resolved, setResolved]   = useState([]);

  const pending = PENDING.filter((o) => !resolved.includes(o.id));

  const handleAction = (item) => setPinTarget(item);

  const handlePinConfirm = () => {
    if (pinTarget) setResolved((p) => [...p, pinTarget.id]);
    setPinTarget(null);
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
      {(() => {
        const activeColor   = pending.length > 0 ? C.error   : C.success;
        const resolvedColor = C.success;
        const cards = [
          {
            label: 'Active',
            value: pending.length,
            color: activeColor,
            Icon: ErrorOutlineOutlinedIcon,
            iconBg: pending.length > 0 ? 'rgba(183,28,28,0.10)' : 'rgba(46,125,79,0.10)',
          },
          {
            label: 'Resolved',
            value: HISTORY.length + resolved.length,
            color: resolvedColor,
            Icon: CheckCircleOutlinedIcon,
            iconBg: 'rgba(46,125,79,0.10)',
          },
        ];
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {cards.map(({ label, value, color, Icon, iconBg }) => (
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
        );
      })()}

      {/* ── Pending overrides ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Pending Authorization
        </span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {pending.length === 0 ? (
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
            <OverrideCard key={item.id} item={item} onAction={handleAction} />
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
        {HISTORY.map((item, i) => (
          <HistoryRow key={i} item={item} last={i === HISTORY.length - 1} />
        ))}
      </div>

      {/* PIN dialog */}
      <PinDialog
        open={!!pinTarget}
        override={pinTarget}
        onClose={() => setPinTarget(null)}
        onConfirm={handlePinConfirm}
      />

    </div>
  );
}
