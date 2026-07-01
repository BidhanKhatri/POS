import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, useMediaQuery } from '@mui/material';
import PeopleOutlinedIcon             from '@mui/icons-material/PeopleOutlined';
import HourglassEmptyOutlinedIcon     from '@mui/icons-material/HourglassEmptyOutlined';
import CheckCircleOutlinedIcon        from '@mui/icons-material/CheckCircleOutlined';
import BlockOutlinedIcon              from '@mui/icons-material/BlockOutlined';
import DeleteOutlineOutlinedIcon      from '@mui/icons-material/DeleteOutlineOutlined';
import LockOutlinedIcon               from '@mui/icons-material/LockOutlined';
import KeyOutlinedIcon                from '@mui/icons-material/KeyOutlined';
import BackspaceOutlinedIcon          from '@mui/icons-material/BackspaceOutlined';
import SearchOutlinedIcon             from '@mui/icons-material/SearchOutlined';
import RefreshOutlinedIcon            from '@mui/icons-material/RefreshOutlined';
import FilterListOutlinedIcon         from '@mui/icons-material/FilterListOutlined';
import CloseOutlinedIcon              from '@mui/icons-material/CloseOutlined';
import InfoOutlinedIcon               from '@mui/icons-material/InfoOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

import { API_URL as API } from '../config/api';

const C = {
  primary: '#3E2723', primaryLt: '#5A3A33',
  accent: '#D4A373', bg: '#F5F3F1', surface: '#ffffff',
  elevated: '#EFE7E2', border: '#DDD2CC',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
};

const STATUS_META = {
  PENDING:   { label: 'Pending',   color: '#B26A00', bg: 'rgba(178,106,0,0.09)',   border: 'rgba(178,106,0,0.25)'   },
  ACTIVE:    { label: 'Active',    color: '#2E7D4F', bg: 'rgba(46,125,79,0.09)',   border: 'rgba(46,125,79,0.25)'   },
  REJECTED:  { label: 'Rejected',  color: '#B71C1C', bg: 'rgba(183,28,28,0.08)',   border: 'rgba(183,28,28,0.22)'   },
  SUSPENDED: { label: 'Suspended', color: '#6B5B57', bg: 'rgba(107,91,87,0.09)',   border: 'rgba(107,91,87,0.22)'   },
};

const TABS = ['ALL', 'PENDING'];

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: m.color, background: m.bg, border: `1px solid ${m.border}`,
      borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: C.elevated, border: `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size > 30 ? 13 : 11, fontWeight: 800, color: C.primary, textTransform: 'uppercase',
    }}>
      {(name ?? '?').charAt(0)}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, iconBg, isMobile }) {
  return (
    <CornerCard
      borderColor={C.border} accentColor={color}
      borderRadius={12} cornerSize={isMobile ? 18 : 22} cornerHeight={isMobile ? 18 : 22}
      style={{ padding: isMobile ? '10px 12px' : '16px 18px', display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 14 }}
    >
      <div style={{ width: isMobile ? 30 : 40, height: isMobile ? 30 : 40, borderRadius: isMobile ? 8 : 10, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: isMobile ? 15 : 20, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', lineHeight: isMobile ? '20px' : '26px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        <p style={{ margin: isMobile ? '2px 0 0' : '4px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      </div>
    </CornerCard>
  );
}

function ActionBtn({ label, color, bg, border, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px', borderRadius: 7, border: `1px solid ${border}`,
        background: bg, color, fontSize: 11, fontWeight: 700,
        cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap', letterSpacing: '0.03em', transition: 'opacity 0.15s',
      }}
    >
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Manager PIN Confirmation Dialog (for delete)
───────────────────────────────────────────── */
function DeletePinDialog({ open, employee, onClose, onConfirm, error, submitting }) {
  const [pin, setPin] = useState('');
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
    const isDigit  = variant === 'digit';
    const isAction = variant === 'action';
    return (
      <button
        key={String(label)}
        onClick={onClick}
        disabled={submitting}
        style={{
          width: sz, height: sz, borderRadius: 14,
          border: `1px solid ${isDigit ? C.border : 'transparent'}`,
          background: isDigit ? C.surface : isAction ? C.bg : 'transparent',
          fontSize: isDigit ? (isMobile ? 20 : 22) : 12,
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
      {/* Dark header */}
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
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Manager PIN Verification</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Delete Employee Account</p>
          </div>
        </div>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.6 }}>
          <CloseOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        {/* LEFT */}
        <div style={{
          flex: 1, padding: isMobile ? '18px 18px 0' : '22px 24px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16,
          borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
          borderBottom: isMobile ? `1px solid ${C.border}` : 'none',
        }}>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Employee Details</p>
            {employee && (
              <>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                  <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{employee.name}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.primary, letterSpacing: '0.04em' }}>{employee.employeeCode || '—'}</p>
                  </div>
                  <div style={{ background: 'rgba(183,28,28,0.06)', border: '1px solid rgba(183,28,28,0.18)', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, color: C.error, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Action</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.error }}>Permanent Delete</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <p style={{ margin: `0 0 ${isMobile ? 6 : 10}px`, fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Enter 4-Digit PIN</p>
            <div className={shake ? 'pin-shake' : ''} style={{
              display: 'flex', gap: isMobile ? 8 : 12, padding: isMobile ? '8px 14px' : '14px 18px', borderRadius: isMobile ? 9 : 12,
              background: C.bg, border: `1.5px solid ${error ? C.error : pin.length === 4 ? C.error : C.border}`, transition: 'border-color 0.15s',
            }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: isMobile ? 8 : 14, borderRadius: 3, background: i < pin.length ? C.error : C.border, transition: 'background 0.12s' }} />
              ))}
            </div>
            {error && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: C.error }}>{error}</p>}
          </div>

          <div style={{ display: 'flex', gap: 8, paddingBottom: isMobile ? 18 : 0 }}>
            <button onClick={handleClose} disabled={submitting} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.textSec, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Cancel
            </button>
            <button
              onClick={() => { if (pin.length < 4) { setShake(true); setTimeout(() => setShake(false), 450); return; } onConfirm(pin); }}
              disabled={submitting || pin.length < 4}
              style={{ flex: 2, height: 44, borderRadius: 10, border: pin.length === 4 ? `2px solid ${C.error}` : `1px solid ${C.border}`, background: pin.length === 4 ? C.error : C.elevated, fontSize: 13, fontWeight: 700, color: pin.length === 4 ? '#fff' : C.textDim, cursor: submitting || pin.length < 4 ? 'not-allowed' : 'pointer', opacity: submitting ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: pin.length === 4 ? '0 3px 0 #7B0000' : 'none', transition: 'all 0.15s' }}
            >
              <KeyOutlinedIcon sx={{ fontSize: 15 }} />
              {submitting ? 'Verifying…' : 'Confirm Delete'}
            </button>
          </div>
        </div>

        {/* RIGHT — numpad */}
        <div style={{ padding: isMobile ? '18px' : '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.bg }}>
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

/* ═══════════════════════════════════
   Main Employee Management Page
═══════════════════════════════════ */
export default function ManagerEmployeePage() {
  const { token } = useAuthStore();
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const isMobile = !useMediaQuery('(min-width:1024px)');

  const [tab, setTab]             = useState('ALL');
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [acting, setActing]       = useState(null);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError]   = useState('');
  const [deleting, setDeleting]         = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tab === 'PENDING' ? '?status=PENDING' : '';
      const res = await fetch(`${API}/api/accounts${qs}`, { headers: authHeaders });
      const data = await res.json();
      let list = data.data ?? [];
      if (tab === 'ALL') list = list.filter(u => u.role !== 'Manager' && u.role !== 'Admin');
      setAccounts(list);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const updateStatus = async (id, status) => {
    setActing(id);
    try {
      const res = await fetch(`${API}/api/accounts/${id}/status`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status }) });
      if (res.ok) {
        setAccounts(prev =>
          tab === 'PENDING'
            ? prev.filter(u => u._id !== id)
            : prev.map(u => u._id === id ? { ...u, status, isActive: status === 'ACTIVE' } : u)
        );
      }
    } catch {
    } finally {
      setActing(null);
    }
  };

  const handleDeleteConfirm = async (pin) => {
    setDeleting(true); setDeleteError('');
    try {
      const res = await fetch(`${API}/api/accounts/${deleteTarget._id}`, { method: 'DELETE', headers: authHeaders, body: JSON.stringify({ pin }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deletion failed');
      setAccounts(prev => prev.filter(u => u._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const allEmp    = accounts.filter(u => u.role !== 'Manager' && u.role !== 'Admin');
  const active    = allEmp.filter(u => u.status === 'ACTIVE').length;
  const pending   = allEmp.filter(u => u.status === 'PENDING').length;
  const suspended = allEmp.filter(u => u.status === 'SUSPENDED').length;

  const filtered = accounts.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q) || (u.employeeCode ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_OPTS = ['ALL', 'ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'];

  const kpiCards = [
    { label: 'Total Employees', value: allEmp.length, icon: PeopleOutlinedIcon,         color: C.info,    iconBg: 'rgba(2,119,189,0.09)'  },
    { label: 'Active',          value: active,          icon: CheckCircleOutlinedIcon,    color: C.success, iconBg: 'rgba(46,125,79,0.09)'  },
    { label: 'Pending',         value: pending,         icon: HourglassEmptyOutlinedIcon, color: C.warning, iconBg: 'rgba(178,106,0,0.09)'  },
    { label: 'Suspended',       value: suspended,       icon: BlockOutlinedIcon,          color: C.error,   iconBg: 'rgba(183,28,28,0.08)'  },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      background: C.bg, padding: isMobile ? '14px 14px 32px' : '20px 20px 32px', gap: isMobile ? 12 : 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
      width: '100%', overflowX: 'hidden',
    }}>

      {/* ── Header ── */}
      {isMobile ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PeopleOutlinedIcon sx={{ fontSize: 17, color: C.accent }} />
            </div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPri, letterSpacing: '-0.1px' }}>Employees</h1>
          </div>
          <button onClick={fetchAccounts} disabled={loading} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: loading ? 0.5 : 1, flexShrink: 0 }}>
            <RefreshOutlinedIcon sx={{ fontSize: 16, color: C.textSec, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Manager Portal</p>
            <h1 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>Employee Management</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>Review, approve, suspend, and manage employee accounts</p>
          </div>
          <button onClick={fetchAccounts} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 700, color: C.textSec, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            <RefreshOutlinedIcon sx={{ fontSize: 15, animation: loading ? 'spin 0.8s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      )}

      {/* ── Info notice ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '10px 14px' }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: C.info, flexShrink: 0, marginTop: '1px' }} />
        <p style={{ margin: 0, fontSize: isMobile ? 11 : 12, color: '#01579B', fontWeight: 500, lineHeight: '18px' }}>
          Only <strong>Employee</strong> accounts are shown here. Manager and Admin accounts are excluded. Deletion requires manager PIN confirmation and is permanent.
        </p>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: isMobile ? 8 : 12 }}>
        {kpiCards.map(k => <KpiCard key={k.label} {...k} isMobile={isMobile} />)}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, background: C.elevated, borderRadius: 10, padding: 4, width: isMobile ? '100%' : 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); setStatus('ALL'); }}
            style={{
              flex: isMobile ? 1 : 'none',
              padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              background: tab === t ? C.surface : 'transparent',
              color: tab === t ? C.primary : C.textDim,
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'PENDING' ? 'Pending' : 'All Employees'}
            {t === 'PENDING' && pending > 0 && (
              <span style={{ marginLeft: 6, background: C.warning, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search + filter ── */}
      <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row', flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '0 12px' }}>
          <SearchOutlinedIcon sx={{ fontSize: 16, color: C.textDim, flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or code…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: C.textPri, padding: '9px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <CloseOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
            </button>
          )}
        </div>
        {tab === 'ALL' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '0 12px' }}>
            <FilterListOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
            <select
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontWeight: 600, color: C.textPri, cursor: 'pointer', padding: '9px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Content: card list on mobile, table on desktop ── */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.elevated}`, borderTop: `3px solid ${C.primary}`, animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <PeopleOutlinedIcon sx={{ fontSize: 24, color: C.primary }} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri }}>
            {search || statusFilter !== 'ALL' ? 'No matching employees' : tab === 'PENDING' ? 'No pending accounts' : 'No employee accounts found'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textSec }}>
            {search || statusFilter !== 'ALL' ? 'Try adjusting your search or filters.' : tab === 'PENDING' ? 'All signup requests have been reviewed.' : 'No local employee accounts exist yet.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => {
            const isActing = acting === u._id;
            const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
            return (
              <div key={u._id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px' }}>
                {/* Top row: avatar + name + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Avatar name={u.name} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name ?? '—'}</p>
                      {u.staffingBetitEmployeeId && (
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0277BD', background: 'rgba(2,119,189,0.09)', border: '1px solid rgba(2,119,189,0.22)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>Synced</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email ?? '—'}</p>
                  </div>
                  <StatusBadge status={u.status} />
                </div>

                {/* Meta row: code + role + joined */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, background: C.elevated, borderRadius: 5, padding: '2px 7px', letterSpacing: '0.04em', flexShrink: 0 }}>
                    {u.employeeCode ?? '—'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec }}>{u.role}</span>
                  <span style={{ fontSize: 11, color: C.textDim, marginLeft: 'auto', flexShrink: 0 }}>{joined}</span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {u.status !== 'ACTIVE' && (
                    <ActionBtn label="Approve" color="#2E7D4F" bg="rgba(46,125,79,0.09)" border="rgba(46,125,79,0.25)" disabled={isActing} onClick={() => updateStatus(u._id, 'ACTIVE')} />
                  )}
                  {u.status === 'PENDING' && (
                    <ActionBtn label="Reject" color="#B71C1C" bg="rgba(183,28,28,0.07)" border="rgba(183,28,28,0.22)" disabled={isActing} onClick={() => updateStatus(u._id, 'REJECTED')} />
                  )}
                  {u.status === 'ACTIVE' && (
                    <ActionBtn label="Suspend" color="#6B5B57" bg="rgba(107,91,87,0.09)" border="rgba(107,91,87,0.22)" disabled={isActing} onClick={() => updateStatus(u._id, 'SUSPENDED')} />
                  )}
                  {(u.status === 'SUSPENDED' || u.status === 'REJECTED') && (
                    <ActionBtn label="Reactivate" color="#2E7D4F" bg="rgba(46,125,79,0.09)" border="rgba(46,125,79,0.25)" disabled={isActing} onClick={() => updateStatus(u._id, 'ACTIVE')} />
                  )}
                  <button
                    onClick={() => { setDeleteError(''); setDeleteTarget(u); }}
                    disabled={isActing}
                    style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid rgba(183,28,28,0.22)', background: 'rgba(183,28,28,0.07)', color: C.error, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isActing ? 'wait' : 'pointer', flexShrink: 0, opacity: isActing ? 0.4 : 1, marginLeft: 'auto' }}
                  >
                    <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && !isMobile && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 280, position: 'relative' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 720, borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#F3EDE9' }}>
                  {['Employee', 'Code', 'Role', 'Status', 'Joined', 'Actions'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: i === 5 ? 'right' : 'left', borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const isActing = acting === u._id;
                  const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                  return (
                    <tr key={u._id} onMouseEnter={e => e.currentTarget.style.background = C.bg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} style={{ transition: 'background 0.12s' }}>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={u.name} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{u.name ?? '—'}</p>
                              {u.staffingBetitEmployeeId && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0277BD', background: 'rgba(2,119,189,0.09)', border: '1px solid rgba(2,119,189,0.22)', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>Synced</span>}
                            </div>
                            <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>{u.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.06em', background: C.elevated, borderRadius: 5, padding: '2px 7px' }}>{u.employeeCode ?? '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <StatusBadge status={u.status} />
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 12, color: C.textDim }}>{joined}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {u.status !== 'ACTIVE' && <ActionBtn label="Approve" color="#2E7D4F" bg="rgba(46,125,79,0.09)" border="rgba(46,125,79,0.25)" disabled={isActing} onClick={() => updateStatus(u._id, 'ACTIVE')} />}
                          {u.status === 'PENDING' && <ActionBtn label="Reject" color="#B71C1C" bg="rgba(183,28,28,0.07)" border="rgba(183,28,28,0.22)" disabled={isActing} onClick={() => updateStatus(u._id, 'REJECTED')} />}
                          {u.status === 'ACTIVE' && <ActionBtn label="Suspend" color="#6B5B57" bg="rgba(107,91,87,0.09)" border="rgba(107,91,87,0.22)" disabled={isActing} onClick={() => updateStatus(u._id, 'SUSPENDED')} />}
                          {(u.status === 'SUSPENDED' || u.status === 'REJECTED') && <ActionBtn label="Reactivate" color="#2E7D4F" bg="rgba(46,125,79,0.09)" border="rgba(46,125,79,0.25)" disabled={isActing} onClick={() => updateStatus(u._id, 'ACTIVE')} />}
                          <button onClick={() => { setDeleteError(''); setDeleteTarget(u); }} disabled={isActing} title="Delete employee" style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid rgba(183,28,28,0.22)`, background: 'rgba(183,28,28,0.07)', color: C.error, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isActing ? 'wait' : 'pointer', flexShrink: 0, opacity: isActing ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, textAlign: 'right', letterSpacing: '0.04em' }}>
        {filtered.length} of {accounts.length} employee{accounts.length !== 1 ? 's' : ''} shown
        {(search || statusFilter !== 'ALL') && ' · filtered'}
      </p>

      <DeletePinDialog
        open={!!deleteTarget}
        employee={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        error={deleteError}
        submitting={deleting}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
