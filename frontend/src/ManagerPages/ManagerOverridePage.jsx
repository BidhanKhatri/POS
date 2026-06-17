import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, useMediaQuery } from '@mui/material';
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
import RefreshOutlinedIcon           from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon            from '@mui/icons-material/SearchOutlined';
import ChevronLeftOutlinedIcon       from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon      from '@mui/icons-material/ChevronRightOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerPanel from '../components/CornerPanel/CornerPanel';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const C = {
  primary:  '#3E2723',
  accent:   '#D4A373',
  error:    '#B71C1C',
  success:  '#2E7D4F',
  warning:  '#B26A00',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textDim:  '#A09490',
  border:   '#DDD2CC',
  surface:  '#ffffff',
  bg:       '#F5F3F1',
  elevated: '#EFE7E2',
};

const TYPE_META = {
  REFUND:   { icon: AdminPanelSettingsOutlinedIcon, label: 'Refund Request',   actionLabel: 'Verify & Authorize', priority: 'HIGH'     },
  VOID:     { icon: CancelOutlinedIcon,             label: 'Void Request',     actionLabel: 'Confirm Void',        priority: 'STANDARD' },
  DISCOUNT: { icon: LocalOfferOutlinedIcon,         label: 'Discount Request', actionLabel: 'Approve Discount',    priority: 'LOYALTY'  },
};

const PRIORITY = {
  HIGH:     { label: 'HIGH PRIORITY',  badgeBg: 'rgba(183,28,28,0.09)',   badgeColor: C.error   },
  STANDARD: { label: 'STANDARD',       badgeBg: C.elevated,               badgeColor: C.textSec },
  LOYALTY:  { label: 'LOYALTY ACTION', badgeBg: 'rgba(212,163,115,0.15)', badgeColor: C.warning },
};

const STATUS_STYLE = {
  APPROVED: { bg: 'rgba(46,125,79,0.10)',  color: C.success, border: 'rgba(46,125,79,0.25)'  },
  DENIED:   { bg: 'rgba(183,28,28,0.09)', color: C.error,   border: 'rgba(183,28,28,0.20)'  },
};

const PENDING_PER_PAGE = 5;

const formatMoney = (n) => `$${Number(n ?? 0).toFixed(2)}`;

const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins   = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString();
};

function pageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const set = new Set([0, total - 1, current]);
  if (current > 1) set.add(current - 1);
  if (current < total - 2) set.add(current + 1);
  const sorted = [...set].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null);
    result.push(sorted[i]);
  }
  return result;
}

/* ─────────────────────────────────────────────
   PIN Dialog
───────────────────────────────────────────── */
function PinDialog({ open, override, error, submitting, onClose, onConfirm }) {
  const [pin,   setPin]   = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => { if (open) setPin(''); }, [open]);

  const push  = (d) => { if (pin.length < 4) setPin((p) => p + d); };
  const del   = ()  => setPin((p) => p.slice(0, -1));
  const clear = ()  => setPin('');

  const handleConfirm = () => {
    if (pin.length < 4) { setShake(true); setTimeout(() => setShake(false), 450); return; }
    onConfirm(pin);
  };
  const handleClose = () => { setPin(''); onClose(); };

  const KEYS = ['1','2','3','4','5','6','7','8','9'];

  return (
    <Dialog open={open} onClose={handleClose}
      PaperProps={{ style: { borderRadius: 16, maxWidth: 320, width: '100%', boxShadow: '0 20px 60px rgba(42,23,21,0.18)', margin: 16 } }}
    >
      <DialogContent style={{ padding: '28px 24px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <LockOutlinedIcon sx={{ fontSize: 24, color: C.primary }} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>Manager PIN</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec, lineHeight: '18px' }}>
            Enter your PIN to authorize<br />
            <strong style={{ color: C.textPri }}>{TYPE_META[override?.actionType]?.label}</strong>
          </p>
        </div>
        <div className={shake ? 'pin-shake' : ''} style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < pin.length ? C.primary : 'transparent', border: `2px solid ${i < pin.length ? C.primary : C.border}`, transition: 'background 0.15s, border-color 0.15s' }} />
          ))}
        </div>
        {error && <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: C.error, textAlign: 'center' }}>{error}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {KEYS.map((d) => (
            <button key={d} onClick={() => push(d)} style={{ height: 50, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 20, fontWeight: 700, color: C.textPri, cursor: 'pointer', boxShadow: `0 3px 0 ${C.border}` }}>{d}</button>
          ))}
          <button onClick={clear} style={{ height: 50, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: '0.06em', cursor: 'pointer', boxShadow: `0 3px 0 ${C.border}` }}>CLR</button>
          <button onClick={() => push('0')} style={{ height: 50, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 20, fontWeight: 700, color: C.textPri, cursor: 'pointer', boxShadow: `0 3px 0 ${C.border}` }}>0</button>
          <button onClick={del} style={{ height: 50, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 3px 0 ${C.border}` }}>
            <BackspaceOutlinedIcon sx={{ fontSize: 20, color: C.textSec }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleClose} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.textSec, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleConfirm} disabled={submitting} style={{ flex: 2, height: 44, borderRadius: 10, border: 'none', background: C.primary, fontSize: 13, fontWeight: 700, color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
function OverrideCard({ item, onAuthorize, onDeny, denying, isDesktop }) {
  const meta = TYPE_META[item.actionType] || TYPE_META.REFUND;
  const p    = PRIORITY[meta.priority];
  const Icon = meta.icon;
  const details = [
    { label: 'Amount', value: formatMoney(item.amount), errorColor: true },
    { label: 'Item',   value: `${item.productName || ''}${item.sku ? ` (${item.sku})` : ''}${item.requestedQty ? ` ×${item.requestedQty}` : ''}` },
  ];

  return (
    <CornerPanel color={p.badgeColor} style={{ borderRadius: 12 }}>
      <div style={{ padding: isDesktop ? '14px 18px 12px' : '12px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: p.badgeBg, color: p.badgeColor }}>{p.label}</span>
          <Icon sx={{ fontSize: 16, color: C.textDim }} />
        </div>
        <p style={{ margin: 0, fontSize: isDesktop ? 16 : 15, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
          {meta.label} <span style={{ color: C.textDim, fontWeight: 600 }}>#{String(item._id).slice(-6).toUpperCase()}</span>
        </p>
        {item.invoiceNo && <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: C.textSec }}>Invoice <span style={{ color: C.primary }}>{item.invoiceNo}</span></p>}
      </div>

      <div style={{ padding: isDesktop ? '12px 18px' : '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PersonOutlinedIcon sx={{ fontSize: 16, color: C.textSec }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: C.textDim, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Employee</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>
            {item.employeeId?.name || 'Unknown'} <span style={{ color: C.textDim, fontWeight: 500 }}>(ID: {item.employeeId?.employeeCode || '—'})</span>
          </p>
        </div>
      </div>

      <div style={{ padding: isDesktop ? '12px 18px' : '10px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${details.length}, 1fr)`, gap: 8 }}>
          {details.map(({ label, value, errorColor }) => (
            <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px', color: errorColor ? C.error : C.textPri }}>{value}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: isDesktop ? 'row' : 'column', flexWrap: 'wrap', gap: isDesktop ? 16 : 3 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textSec }}>Buyer: <strong style={{ color: C.textPri }}>{item.buyer?.name || '—'}</strong>{item.buyer?.phone ? ` · ${item.buyer.phone}` : ''}</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textSec }}>Refund via: <strong style={{ color: C.textPri }}>{item.paymentMethod}</strong>{item.card?.last4 ? ` •••• ${item.card.last4}` : ''}</p>
        </div>
        {(item.methodOverridden || !item.buyerVerified) && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.methodOverridden && <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'rgba(183,28,28,0.09)', border: '1px solid rgba(183,28,28,0.25)', color: C.error }}>⚠ Refund method differs from original payment</span>}
            {!item.buyerVerified   && <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'rgba(178,106,0,0.10)', border: '1px solid rgba(178,106,0,0.30)', color: C.warning }}>⚠ Buyer not verified against invoice</span>}
          </div>
        )}
        {item.reason && (
          <div style={{ marginTop: 8 }}>
            <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reason</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{item.reason}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: isDesktop ? '10px 18px' : '8px 14px', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ margin: '0 0 5px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Audit Log</p>
        <div style={{ display: 'flex', flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 16 : 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} /><span style={{ fontSize: 12, fontWeight: 500, color: C.textSec }}>Initiated {timeAgo(item.createdAt)}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.textDim, flexShrink: 0 }} /><span style={{ fontSize: 12, fontWeight: 500, color: C.textSec }}>Requires PIN authorization</span></div>
        </div>
      </div>

      <div style={{ padding: isDesktop ? '14px 18px' : '12px 14px', display: 'flex', gap: 8 }}>
        <button onClick={() => onDeny(item)} disabled={denying} style={{ height: 44, borderRadius: 10, padding: '0 16px', border: `1.5px solid ${C.border}`, background: C.surface, color: C.error, fontSize: 13, fontWeight: 700, cursor: denying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <CloseOutlinedIcon sx={{ fontSize: 15 }} /> Deny
        </button>
        <button onClick={() => onAuthorize(item)} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <LockOutlinedIcon sx={{ fontSize: 15 }} /> {meta.actionLabel}
        </button>
      </div>
    </CornerPanel>
  );
}

/* ─────────────────────────────────────────────
   History Row
───────────────────────────────────────────── */
function HistoryRow({ item, last, isDesktop }) {
  const meta = TYPE_META[item.actionType] || TYPE_META.REFUND;
  const ss   = STATUS_STYLE[item.status] || STATUS_STYLE.DENIED;

  const badge = (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 20, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
      {item.status}
    </span>
  );

  if (isDesktop) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 140px 80px auto', gap: 12, alignItems: 'center', padding: '11px 18px', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>
          {new Date(item.resolvedAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{meta.label}</p>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.employeeId?.name || 'Unknown'} · {item.employeeId?.employeeCode || '—'}
        </p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{formatMoney(item.amount)}</p>
        {badge}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 12, alignItems: 'center', padding: '11px 14px', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>
        {new Date(item.resolvedAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{meta.label}</p>
        <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 500, color: C.textSec }}>
          {item.employeeId?.name || 'Unknown'} ({item.employeeId?.employeeCode || '—'}) · {formatMoney(item.amount)}
        </p>
      </div>
      {badge}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Pending Panel — search + filter + pagination
───────────────────────────────────────────── */
const TYPE_FILTERS = [
  { key: 'ALL',      label: 'All'      },
  { key: 'REFUND',   label: 'Refund'   },
  { key: 'VOID',     label: 'Void'     },
  { key: 'DISCOUNT', label: 'Discount' },
];

function PendingPanel({ pending, onAuthorize, onDeny, denyingId, isDesktop }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page,   setPage]   = useState(0);

  useEffect(() => { setPage(0); }, [search, filter]);

  /* 1. Filter by type */
  const byType = filter === 'ALL'
    ? pending
    : pending.filter((o) => o.actionType === filter);

  /* 2. Apply search */
  const q = search.trim().toLowerCase();
  const searched = q
    ? byType.filter((item) => {
        const meta = TYPE_META[item.actionType] || TYPE_META.REFUND;
        return (
          (item.employeeId?.name        || '').toLowerCase().includes(q) ||
          (item.employeeId?.employeeCode|| '').toLowerCase().includes(q) ||
          (item.invoiceNo               || '').toLowerCase().includes(q) ||
          (item.buyer?.name             || '').toLowerCase().includes(q) ||
          (item.productName             || '').toLowerCase().includes(q) ||
          meta.label.toLowerCase().includes(q) ||
          formatMoney(item.amount).includes(q)
        );
      })
    : byType;

  /* 3. Paginate */
  const totalPages = Math.max(1, Math.ceil(searched.length / PENDING_PER_PAGE));
  const safePage   = Math.min(page, totalPages - 1);
  const displayed  = searched.slice(safePage * PENDING_PER_PAGE, (safePage + 1) * PENDING_PER_PAGE);
  const startIdx   = searched.length === 0 ? 0 : safePage * PENDING_PER_PAGE + 1;
  const endIdx     = Math.min((safePage + 1) * PENDING_PER_PAGE, searched.length);

  const typeCounts = {};
  TYPE_FILTERS.forEach(({ key }) => {
    typeCounts[key] = key === 'ALL' ? pending.length : pending.filter((o) => o.actionType === key).length;
  });

  /* Empty states */
  if (pending.length === 0) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 22, color: C.success }} />
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>All Clear</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>No pending override requests.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <SearchOutlinedIcon sx={{ fontSize: 15, color: C.textDim, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by employee, invoice, type…"
          style={{
            width: '100%', height: 36,
            padding: '0 32px 0 32px',
            borderRadius: 8,
            border: `1px solid ${search ? C.primary : C.border}`,
            background: C.surface,
            fontSize: 12, fontWeight: 500, color: C.textPri,
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <CloseOutlinedIcon sx={{ fontSize: 14, color: C.textDim }} />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 5 }}>
        {TYPE_FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                flex: 1, padding: '6px 8px', borderRadius: 7,
                border: `1px solid ${active ? C.primary : C.border}`,
                background: active ? C.primary : C.surface,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                color: active ? '#fff' : C.textSec,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {label}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, minWidth: 18, textAlign: 'center',
                background: active ? 'rgba(255,255,255,0.20)' : C.elevated,
                color: active ? '#fff' : C.textDim,
              }}>
                {typeCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results info when searching */}
      {(q || filter !== 'ALL') && (
        <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: C.textDim }}>
          {searched.length === 0
            ? 'No results match your search.'
            : `Showing ${startIdx}–${endIdx} of ${searched.length} result${searched.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Cards */}
      {searched.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>No results found</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>Try a different search term or filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map((item) => (
            <OverrideCard
              key={item._id}
              item={item}
              onAuthorize={onAuthorize}
              onDeny={onDeny}
              denying={denyingId === item._id}
              isDesktop={isDesktop}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: C.textDim }}>
            Page {safePage + 1} of {totalPages}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={safePage === 0}
              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: safePage === 0 ? 'default' : 'pointer', opacity: safePage === 0 ? 0.35 : 1 }}
            >
              <ChevronLeftOutlinedIcon sx={{ fontSize: 17, color: C.textSec }} />
            </button>

            {pageRange(safePage, totalPages).map((p, idx) =>
              p === null ? (
                <span key={`e-${idx}`} style={{ width: 30, textAlign: 'center', fontSize: 12, color: C.textDim }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 30, height: 30, borderRadius: 7,
                    border: `1px solid ${p === safePage ? C.primary : C.border}`,
                    background: p === safePage ? C.primary : C.surface,
                    fontSize: 12, fontWeight: 700,
                    color: p === safePage ? '#fff' : C.textSec,
                    cursor: 'pointer',
                  }}
                >
                  {p + 1}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={safePage === totalPages - 1}
              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: safePage === totalPages - 1 ? 'default' : 'pointer', opacity: safePage === totalPages - 1 ? 0.35 : 1 }}
            >
              <ChevronRightOutlinedIcon sx={{ fontSize: 17, color: C.textSec }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Simple History Table
───────────────────────────────────────────── */
function HistoryTable({ history, isDesktop }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: 'auto' }}>
      <div style={{
        minWidth: isDesktop ? 560 : 'auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? '72px 1fr 140px 80px auto' : '60px 1fr auto',
          gap: 12,
          padding: isDesktop ? '10px 18px' : '9px 14px',
          background: '#F3EDE9',
          borderBottom: `1px solid ${C.border}`,
          borderRadius: '11px 11px 0 0',
        }}>
          {(isDesktop
            ? ['Time', 'Type', 'Employee', 'Amount', 'Status']
            : ['Time', 'Request', 'Status']
          ).map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</span>
          ))}
        </div>
        {history.length === 0 ? (
          <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, fontWeight: 500, color: C.textDim }}>
            No resolved overrides yet.
          </div>
        ) : (
          history.map((item, i) => (
            <HistoryRow key={item._id} item={item} last={i === history.length - 1} isDesktop={isDesktop} />
          ))
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section Divider (mobile)
───────────────────────────────────────────── */
function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function ManagerOverridePage() {
  const token     = useAuthStore((s) => s.token);
  const headers   = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isDesktop = useMediaQuery('(min-width:1024px)');

  const [overrides,  setOverrides]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pinTarget,  setPinTarget]  = useState(null);
  const [pinError,   setPinError]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [denyingId,  setDenyingId]  = useState(null);

  const loadOverrides = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/overrides`, { headers })
      .then((r) => r.json())
      .then((data) => setOverrides(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const pending  = overrides.filter((o) => o.status === 'PENDING');
  const resolved = overrides.filter((o) => o.status !== 'PENDING');

  const handleAuthorize  = (item) => { setPinError(''); setPinTarget(item); };
  const handlePinConfirm = async (pin) => {
    setSubmitting(true); setPinError('');
    try {
      const res  = await fetch(`${API}/api/overrides/${pinTarget._id}/approve`, { method: 'POST', headers, body: JSON.stringify({ pin }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authorization failed');
      setPinTarget(null); loadOverrides();
    } catch (e) { setPinError(e.message); }
    finally { setSubmitting(false); }
  };
  const handleDeny = async (item) => {
    setDenyingId(item._id);
    try { await fetch(`${API}/api/overrides/${item._id}/deny`, { method: 'POST', headers }); loadOverrides(); }
    finally { setDenyingId(null); }
  };

  const statItems = [
    { label: 'Active',   value: pending.length,  color: pending.length > 0 ? C.error : C.success, Icon: ErrorOutlineOutlinedIcon, iconBg: pending.length > 0 ? 'rgba(183,28,28,0.10)' : 'rgba(46,125,79,0.10)' },
    { label: 'Resolved', value: resolved.length, color: C.success,                                 Icon: CheckCircleOutlinedIcon,  iconBg: 'rgba(46,125,79,0.10)' },
  ];

  /* ══════════════════════════════════════════
     DESKTOP
  ══════════════════════════════════════════ */
  if (isDesktop) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Top bar */}
        <div style={{ padding: '24px 32px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Manager Portal</p>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.4px' }}>Overrides</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={loadOverrides} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer' }}>
                <RefreshOutlinedIcon sx={{ fontSize: 15 }} /> Refresh
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, background: 'rgba(46,125,79,0.10)', border: '1px solid rgba(46,125,79,0.22)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.success, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.success, letterSpacing: '0.04em' }}>Live</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 220px)', gap: 12 }}>
            {statItems.map(({ label, value, color, Icon, iconBg }) => (
              <CornerPanel key={label} color={color} style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 20, color }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.textPri, lineHeight: 1, letterSpacing: '-0.6px' }}>{String(value).padStart(2, '0')}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
                </div>
              </CornerPanel>
            ))}
          </div>
        </div>

        {/* 2-column body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', borderTop: `1px solid ${C.border}` }}>

          {/* Left: pending — searchable, filterable, paginated */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px 32px' }}>
            <CornerPanel color={pending.length > 0 ? C.error : C.textDim} style={{ marginBottom: 16, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: pending.length > 0 ? C.error : C.textDim }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Pending Authorization</span>
                </div>
                {pending.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(183,28,28,0.09)', color: C.error, border: '1px solid rgba(183,28,28,0.20)' }}>
                    {pending.length} pending
                  </span>
                )}
              </div>
            </CornerPanel>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, fontWeight: 600, color: C.textDim }}>Loading overrides…</div>
            ) : (
              <PendingPanel pending={pending} onAuthorize={handleAuthorize} onDeny={handleDeny} denyingId={denyingId} isDesktop />
            )}
          </div>

          {/* Right: history — fixed, scrolls independently */}
          <div style={{ width: 460, flexShrink: 0, overflowY: 'auto', padding: '20px 32px 32px 24px', borderLeft: `1px solid ${C.border}`, background: '#FAF8F6' }}>
            <CornerPanel color={C.textDim} bg="#FAF8F6" style={{ marginBottom: 16, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: C.textDim }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Override History</span>
                </div>
                {resolved.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>{resolved.length} resolved</span>
                )}
              </div>
            </CornerPanel>
            <HistoryTable history={resolved} isDesktop />
          </div>
        </div>

        <PinDialog open={!!pinTarget} override={pinTarget} error={pinError} submitting={submitting} onClose={() => setPinTarget(null)} onConfirm={handlePinConfirm} />
      </div>
    );
  }

  /* ══════════════════════════════════════════
     MOBILE
  ══════════════════════════════════════════ */
  return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Manager Portal</p>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPri, letterSpacing: '-0.1px' }}>Overrides</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 20, background: 'rgba(46,125,79,0.10)', border: '1px solid rgba(46,125,79,0.22)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.success, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.success, letterSpacing: '0.04em' }}>Live</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {statItems.map(({ label, value, color, Icon, iconBg }) => (
          <CornerPanel key={label} color={color} style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 18, color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, lineHeight: 1, letterSpacing: '-0.4px' }}>{String(value).padStart(2, '0')}</p>
              <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
            </div>
          </CornerPanel>
        ))}
      </div>

      <SectionDivider label="Pending Authorization" />
      <div style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, fontWeight: 600, color: C.textDim }}>Loading overrides…</div>
        ) : (
          <PendingPanel pending={pending} onAuthorize={handleAuthorize} onDeny={handleDeny} denyingId={denyingId} isDesktop={false} />
        )}
      </div>

      <SectionDivider label="Override History" />
      <HistoryTable history={resolved} isDesktop={false} />

      <PinDialog open={!!pinTarget} override={pinTarget} error={pinError} submitting={submitting} onClose={() => setPinTarget(null)} onConfirm={handlePinConfirm} />
    </div>
  );
}
