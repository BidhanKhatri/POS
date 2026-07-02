import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate }                      from 'react-router-dom';
import SearchOutlinedIcon                   from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon                    from '@mui/icons-material/CloseOutlined';
import FilterListOutlinedIcon               from '@mui/icons-material/FilterListOutlined';
import DownloadOutlinedIcon                 from '@mui/icons-material/DownloadOutlined';
import RefreshOutlinedIcon                  from '@mui/icons-material/RefreshOutlined';
import ReceiptLongOutlinedIcon              from '@mui/icons-material/ReceiptLongOutlined';
import AttachMoneyOutlinedIcon              from '@mui/icons-material/AttachMoneyOutlined';
import MoneyOffOutlinedIcon                 from '@mui/icons-material/MoneyOffOutlined';
import RemoveCircleOutlinedIcon             from '@mui/icons-material/RemoveCircleOutlined';
import ReceiptOutlinedIcon                  from '@mui/icons-material/ReceiptOutlined';
import ChevronLeftIcon                      from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon                     from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon                from '@mui/icons-material/KeyboardArrowDown';
import OpenInNewOutlinedIcon                from '@mui/icons-material/OpenInNewOutlined';
import PersonOutlineOutlinedIcon            from '@mui/icons-material/PersonOutlineOutlined';
import useAuthStore                         from '../store/useAuthStore';
import { useSocketEvent }                   from '../context/SocketContext';
import { EVENTS }                           from '../socket/events';

import { useMediaQuery } from '@mui/material';
import { API_URL as API } from '../config/api';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9', tableHover: '#EFE7E2',
};

const STATUS_META = {
  PAID:     { label: 'Paid',     bg: 'rgba(46,125,79,0.10)',   color: '#2E7D4F', border: 'rgba(46,125,79,0.25)' },
  PARTIAL:  { label: 'Partial',  bg: 'rgba(178,106,0,0.10)',   color: '#B26A00', border: 'rgba(178,106,0,0.25)' },
  REFUNDED: { label: 'Refunded', bg: 'rgba(183,28,28,0.10)',   color: '#B71C1C', border: 'rgba(183,28,28,0.25)' },
  VOIDED:   { label: 'Voided',   bg: 'rgba(160,148,144,0.12)', color: '#6B5B57', border: 'rgba(160,148,144,0.25)' },
  PENDING:  { label: 'Pending',  bg: 'rgba(178,106,0,0.10)',   color: '#B26A00', border: 'rgba(178,106,0,0.25)' },
};

const DATE_PRESETS = [
  { id: '',       label: 'All time'   },
  { id: 'today',  label: 'Today'      },
  { id: 'week',   label: 'This week'  },
  { id: 'month',  label: 'This month' },
  { id: 'custom', label: 'Custom…'    },
];

const STATUS_OPTS = [
  { id: '', label: 'Any status' },
  { id: 'PAID',     label: 'Paid'     },
  { id: 'REFUNDED', label: 'Refunded' },
  { id: 'VOIDED',   label: 'Voided'   },
  { id: 'PARTIAL',  label: 'Partial'  },
];

const METHOD_OPTS = [
  { id: '', label: 'Any method' },
  { id: 'CASH',   label: 'Cash'   },
  { id: 'CREDIT', label: 'Credit' },
  { id: 'DEBIT',  label: 'Debit'  },
  { id: 'MISC',   label: 'Misc'   },
];

function fmt$(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateRange(preset, cStart, cEnd) {
  const now = new Date();
  if (preset === 'today') { const d = now.toISOString().slice(0, 10); return [d, d]; }
  if (preset === 'week')  { const s = new Date(now); s.setDate(now.getDate() - 6); return [s.toISOString().slice(0, 10), now.toISOString().slice(0, 10)]; }
  if (preset === 'month') { const s = new Date(now.getFullYear(), now.getMonth(), 1); return [s.toISOString().slice(0, 10), now.toISOString().slice(0, 10)]; }
  if (preset === 'custom') return [cStart, cEnd];
  return ['', ''];
}

function pageList(cur, total) {
  if (total <= 1) return [1];
  const range = [];
  for (let i = Math.max(2, cur - 2); i <= Math.min(total - 1, cur + 2); i++) range.push(i);
  const out = [1];
  if (range[0] > 2) out.push('…');
  out.push(...range);
  if (range[range.length - 1] < total - 1) out.push('…');
  if (total > 1) out.push(total);
  return out;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 10, background: m.bg, color: m.color, border: `1px solid ${m.border}`, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, iconBg, skeleton, compact }) {
  const pad      = compact ? '11px 12px' : '16px 18px';
  const iconSize = compact ? 34 : 40;
  const iconFn   = compact ? 17 : 20;
  const valSize  = compact ? 15 : 20;
  const cornerW  = compact ? 18 : 24;
  return (
    <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: pad, display: 'flex', alignItems: 'center', gap: compact ? 10 : 14, fontFamily: FONT }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: cornerW, height: cornerW, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: cornerW, height: cornerW, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 10, pointerEvents: 'none' }} />
      <div style={{ width: iconSize, height: iconSize, borderRadius: 9, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 1px ${color}22` }}>
        <Icon sx={{ fontSize: iconFn, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {skeleton
          ? <div style={{ height: compact ? 16 : 22, width: compact ? 60 : 80, borderRadius: 4, background: C.elevated, marginBottom: 4 }} />
          : <p style={{ margin: 0, fontSize: valSize, fontWeight: 800, color: C.textPri, letterSpacing: '-0.4px', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        }
        {!compact && sub && <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim, fontWeight: 600 }}>{sub}</p>}
        <p style={{ margin: compact ? '3px 0 0' : '4px 0 0', fontSize: compact ? 9 : 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      </div>
    </div>
  );
}

function Sel({ value, onChange, options, full }) {
  return (
    <div style={{ position: 'relative', display: full ? 'flex' : 'inline-flex', alignItems: 'center', width: full ? '100%' : undefined }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ appearance: 'none', WebkitAppearance: 'none', padding: '7px 30px 7px 11px', borderRadius: 8, border: `1px solid ${value ? C.primary : C.border}`, background: value ? `${C.primary}08` : C.surface, color: value ? C.primary : C.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, outline: 'none', width: full ? '100%' : undefined }}>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <KeyboardArrowDownIcon sx={{ fontSize: 15, color: value ? C.primary : C.textDim, position: 'absolute', right: 7, pointerEvents: 'none' }} />
    </div>
  );
}

export default function ManagerTransactionPage() {
  const navigate    = useNavigate();
  const { token }   = useAuthStore();

  // Filters — default All time so data shows immediately
  const [preset,     setPreset]     = useState('');
  const [cStart,     setCStart]     = useState('');
  const [cEnd,       setCEnd]       = useState('');
  const [method,     setMethod]     = useState('');
  const [status,     setStatus]     = useState('');
  const [empId,      setEmpId]      = useState('');
  const [search,     setSearch]     = useState('');
  const [openFilter, setOpenFilter] = useState(false);

  // Table state
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // KPI state
  const [kpis,     setKpis]     = useState(null);
  const [kpiLoad,  setKpiLoad]  = useState(true);

  // Employee list
  const [employees, setEmployees] = useState([]);

  const [hovered, setHovered] = useState(null);
  const debounce = useRef(null);
  const isMobile = !useMediaQuery('(min-width:1024px)');

  // ── Build query string ────────────────────────────────────────────────────
  const buildQS = useCallback((extra = {}) => {
    const [startDate, endDate] = dateRange(preset, cStart, cEnd);
    const p = {};
    if (search.trim()) p.search      = search.trim();
    if (method)        p.method      = method;
    if (status)        p.status      = status;
    if (empId)         p.employeeId  = empId;
    if (startDate)     p.startDate   = startDate;
    if (endDate)       p.endDate     = endDate;
    Object.assign(p, extra);
    return new URLSearchParams(p).toString();
  }, [preset, cStart, cEnd, search, method, status, empId]);

  // ── Fetch employees once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/sales/employees`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => Array.isArray(d) && setEmployees(d))
      .catch(() => {});
  }, [token]);

  // ── Fetch KPIs ────────────────────────────────────────────────────────────
  const loadKpis = useCallback(async () => {
    if (!token) return;
    setKpiLoad(true);
    try {
      const r = await fetch(`${API}/api/sales/kpis?${buildQS()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setKpis(await r.json());
    } catch { /* non-critical */ }
    finally { setKpiLoad(false); }
  }, [token, buildQS]);

  // ── Fetch rows ────────────────────────────────────────────────────────────
  const loadRows = useCallback(async (pg = 1) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API}/api/sales?${buildQS({ page: pg, limit: 25 })}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `Error ${r.status}`); }
      const d = await r.json();
      setRows(d.transactions || []);
      setTotal(d.total || 0);
      setPage(d.page || 1);
      setPages(d.pages || 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, buildQS]);

  // Real-time: refresh list and KPIs the moment a new transaction is completed
  useSocketEvent(EVENTS.TRANSACTION_NEW, () => { loadRows(1); loadKpis(); });

  // ── Single effect for all filter + search changes ─────────────────────────
  // Search gets a 350ms debounce; all other filter changes fetch immediately.
  // Using one effect + clearTimeout prevents double-fetch on mount and is
  // StrictMode-safe (cleanup clears the timer on the first [discarded] mount).
  useEffect(() => {
    const delay = search.trim() ? 350 : 0;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(1);
      loadRows(1);
      loadKpis();
    }, delay);
    return () => clearTimeout(debounce.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, cStart, cEnd, method, status, empId, search, token]);

  const goPage = pg => { if (pg >= 1 && pg <= pages && pg !== page) loadRows(pg); };

  const clearAll = () => { setSearch(''); setMethod(''); setStatus(''); setEmpId(''); setPreset(''); setCStart(''); setCEnd(''); };

  const hasActive = search || method || status || empId || preset;

  const empOpts = [{ id: '', label: 'All employees' }, ...employees.map(e => ({ id: e._id, label: `${e.name} · ${e.employeeCode}` }))];

  const COLS = '150px 155px 190px 70px 85px 100px 110px 110px 110px';

  const kpiItems = [
    { label: 'Total Transactions', value: kpis ? kpis.totalCount.toLocaleString() : '—', sub: 'Matching filters', icon: ReceiptOutlinedIcon,       color: C.info,    iconBg: 'rgba(2,119,189,0.09)'  },
    { label: 'Gross Revenue',      value: kpis ? fmt$(kpis.grossRevenue) : '—',           sub: kpis ? `Discounts: ${fmt$(kpis.discountTotal)}` : '', icon: AttachMoneyOutlinedIcon,  color: C.success, iconBg: 'rgba(46,125,79,0.09)'  },
    { label: 'Net Revenue',        value: kpis ? fmt$(kpis.netRevenue) : '—',             sub: 'After refunds', icon: MoneyOffOutlinedIcon,          color: C.info,    iconBg: 'rgba(2,119,189,0.08)'  },
    { label: 'Refunded / Voided',  value: kpis ? `${fmt$(kpis.refundedAmount)} / ${kpis.voidCount}` : '—', sub: '$ refunded · void count', icon: RemoveCircleOutlinedIcon, color: C.error, iconBg: 'rgba(183,28,28,0.09)' },
  ];

  return (
    <div style={{ padding: isMobile ? '14px 14px 48px' : '28px 32px 48px', background: C.bg, minHeight: '100dvh', fontFamily: FONT, width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{'.tx-kpi-scroll::-webkit-scrollbar { display: none; }'}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'center' : 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 16 : 24, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: isMobile ? 34 : 38, height: isMobile ? 34 : 38, borderRadius: isMobile ? 9 : 10, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: isMobile ? 17 : 19, color: C.accent }} />
          </div>
          <div>
            {!isMobile && <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Manager Portal</p>}
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.4px' }}>
              Transactions
              {!loading && total > 0 && !isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: C.textDim, marginLeft: 10 }}>{total.toLocaleString()} records</span>}
            </h1>
            {isMobile && !loading && total > 0 && <p style={{ margin: 0, fontSize: 11, color: C.textDim, fontWeight: 500 }}>{total.toLocaleString()} records</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => { loadRows(page); loadKpis(); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 0 : 5, padding: isMobile ? '7px' : '7px 13px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer', width: isMobile ? 34 : undefined, height: isMobile ? 34 : undefined }}>
            <RefreshOutlinedIcon sx={{ fontSize: 15 }} />
            {!isMobile && ' Refresh'}
          </button>
          <button onClick={() => window.open(`${API}/api/reports/export?${buildQS({ format: 'csv' })}`, '_blank')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '7px 11px' : '7px 14px', borderRadius: 8, border: 'none', background: C.primary, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
            <DownloadOutlinedIcon sx={{ fontSize: 15 }} />{isMobile ? 'CSV' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      {isMobile ? (
        <div className="tx-kpi-scroll" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
            {[[0,1],[2,3]].map((pair, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 'calc((100vw - 36px) / 2)', flexShrink: 0, scrollSnapAlign: 'start' }}>
                {pair.map(idx => {
                  const k = kpiItems[idx];
                  return <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} color={k.color} iconBg={k.iconBg} skeleton={kpiLoad} compact />;
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
          {kpiItems.map(k => <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} color={k.color} iconBg={k.iconBg} skeleton={kpiLoad} />)}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: openFilter ? `1px solid ${C.border}` : 'none' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 12px' }}>
            <SearchOutlinedIcon sx={{ fontSize: 17, color: C.textDim, flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice # or buyer name…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: C.textPri, background: 'transparent', fontFamily: FONT }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}><CloseOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} /></button>}
          </div>
          <button onClick={() => setOpenFilter(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: `1px solid ${openFilter ? C.primary : C.border}`, background: openFilter ? C.primary : C.surface, color: openFilter ? '#fff' : C.textSec, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <FilterListOutlinedIcon sx={{ fontSize: 16 }} /> Filters
            {hasActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: openFilter ? C.accent : C.primary }} />}
          </button>
          {hasActive && <button onClick={clearAll} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Clear all</button>}
        </div>

        {openFilter && (
          <div style={{ padding: '14px 16px', background: '#FDFCFB', display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: isMobile ? 12 : 16, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date Range</p>
              <div style={{ display: 'flex', gap: 3, background: C.elevated, borderRadius: 9, padding: 3, overflowX: isMobile ? 'auto' : 'visible' }}>
                {DATE_PRESETS.map(({ id, label }) => (
                  <button key={id} onClick={() => setPreset(id)}
                    style={{ padding: '5px 11px', height: 30, borderRadius: 6, border: 'none', background: preset === id ? C.surface : 'transparent', cursor: 'pointer', boxShadow: preset === id ? '0 1px 3px rgba(62,39,35,0.12)' : 'none', fontSize: 11, fontWeight: preset === id ? 700 : 500, color: preset === id ? C.primary : C.textDim, whiteSpace: 'nowrap' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {preset === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>From</p>
                  <input type="date" value={cStart} onChange={e => setCStart(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.textPri, fontFamily: FONT, outline: 'none', background: C.surface, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>To</p>
                  <input type="date" value={cEnd} onChange={e => setCEnd(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.textPri, fontFamily: FONT, outline: 'none', background: C.surface, width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}
            {isMobile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</p>
                  <Sel value={status} onChange={setStatus} options={STATUS_OPTS} full />
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Method</p>
                  <Sel value={method} onChange={setMethod} options={METHOD_OPTS} full />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Employee</p>
                  <Sel value={empId} onChange={setEmpId} options={empOpts} full />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Employee</p>
                  <Sel value={empId} onChange={setEmpId} options={empOpts} />
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</p>
                  <Sel value={status} onChange={setStatus} options={STATUS_OPTS} />
                </div>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Method</p>
                  <Sel value={method} onChange={setMethod} options={METHOD_OPTS} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Table / Card list */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>

        {/* Skeleton */}
        {loading && rows.length === 0 && (
          isMobile ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ height: 12, width: 110, borderRadius: 4, background: C.elevated }} />
                  <div style={{ height: 18, width: 50, borderRadius: 10, background: C.elevated }} />
                </div>
                <div style={{ height: 11, width: 180, borderRadius: 4, background: C.elevated }} />
                <div style={{ height: 10, width: 120, borderRadius: 4, background: C.elevated }} />
              </div>
            ))
          ) : (
            Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, borderBottom: `1px solid ${C.border}`, background: i % 2 ? '#FDFCFB' : C.surface }}>
                {[110,120,150,30,50,60,70,70,70].map((w, j) => (
                  <div key={j} style={{ padding: 14 }}>
                    <div style={{ height: 11, width: w, borderRadius: 4, background: C.elevated }} />
                  </div>
                ))}
              </div>
            ))
          )
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>{error}</p>
            <button onClick={() => loadRows(1)} style={{ marginTop: 12, padding: '7px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Retry</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && rows.length === 0 && (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 44, color: C.textDim, display: 'block', margin: '0 auto 14px' }} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textSec }}>No transactions found</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDim }}>
              {hasActive ? 'Try adjusting or clearing the filters.' : 'No sales have been recorded yet.'}
            </p>
            {hasActive && <button onClick={clearAll} style={{ marginTop: 14, padding: '7px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>Clear filters</button>}
          </div>
        )}

        {/* Data rows + pagination */}
        {!error && rows.length > 0 && (
          <div style={{ opacity: loading ? 0.45 : 1, transition: 'opacity 0.2s', pointerEvents: loading ? 'none' : 'auto' }}>

            {isMobile ? (
              /* Mobile card list */
              rows.map((tx, i) => {
                const net      = (tx.grandTotal || 0) - (tx.refundedAmount || 0);
                const emp      = tx.employee || tx.employeeId;
                const mth      = tx.primaryPayment?.method || '';
                const isVoided = tx.paymentStatus === 'VOIDED';
                const dt       = new Date(tx.createdAt);
                return (
                  <div key={tx._id} onClick={() => navigate(`/manager/transactions/${tx._id}`)}
                    style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, background: i % 2 ? '#FDFCFB' : C.surface, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, opacity: isVoided ? 0.65 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>{tx.invoiceNo}</span>
                      <Badge status={tx.paymentStatus} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 11, color: C.textSec }}>
                          {dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })} · {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {emp?.name && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: C.textSec }}>
                            <PersonOutlineOutlinedIcon sx={{ fontSize: 11, verticalAlign: 'middle', marginRight: '2px', color: C.textDim }} />{emp.name}
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: isVoided ? C.textDim : C.success, fontVariantNumeric: 'tabular-nums' }}>{isVoided ? '—' : fmt$(net)}</div>
                        {!isVoided && tx.grandTotal !== net && <div style={{ fontSize: 10, color: C.textDim, fontVariantNumeric: 'tabular-nums' }}>{fmt$(tx.grandTotal)}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: C.textDim }}>{tx.items?.length ?? 0} item{tx.items?.length !== 1 ? 's' : ''}</span>
                      {mth && <span style={{ fontSize: 10, fontWeight: 600, color: C.textSec, padding: '1px 6px', borderRadius: 4, background: C.elevated }}>{mth}</span>}
                      {tx.refundedAmount > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: C.error }}>Refunded {fmt$(tx.refundedAmount)}</span>}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Desktop table */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
                  {[['Invoice','left'],['Date & Time','left'],['Employee','left'],['Items','center'],['Method','left'],['Status','left'],['Gross','right'],['Refunded','right'],['Net','right']].map(([h, a]) => (
                    <div key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: a }}>{h}</div>
                  ))}
                </div>
                {rows.map((tx, i) => {
                  const net      = (tx.grandTotal || 0) - (tx.refundedAmount || 0);
                  const emp      = tx.employee || tx.employeeId;
                  const mth      = tx.primaryPayment?.method || '';
                  const isVoided = tx.paymentStatus === 'VOIDED';
                  const isHov    = hovered === tx._id;
                  const dt       = new Date(tx.createdAt);
                  return (
                    <div key={tx._id}
                      onClick={() => navigate(`/manager/transactions/${tx._id}`)}
                      onMouseEnter={() => setHovered(tx._id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ display: 'grid', gridTemplateColumns: COLS, borderBottom: `1px solid ${C.border}`, background: isHov ? C.tableHover : i % 2 ? '#FDFCFB' : C.surface, cursor: 'pointer', borderLeft: `2px solid ${isHov ? C.primary : 'transparent'}`, opacity: isVoided ? 0.65 : 1 }}>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, fontFamily: 'monospace' }}>{tx.invoiceNo}</span>
                        {isHov && <OpenInNewOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />}
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.textPri }}>{dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                        <span style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <PersonOutlineOutlinedIcon sx={{ fontSize: 13, color: C.textDim, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp?.name || '—'}</p>
                          {emp?.employeeCode && <p style={{ margin: 0, fontSize: 10, color: C.textDim, fontFamily: 'monospace' }}>#{emp.employeeCode}</p>}
                        </div>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.textSec }}>{tx.items?.length ?? 0}</span>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                        {mth ? <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec, padding: '2px 8px', borderRadius: 5, background: C.elevated }}>{mth}</span> : <span style={{ color: C.textDim, fontSize: 12 }}>—</span>}
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                        <Badge status={tx.paymentStatus} />
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>{fmt$(tx.grandTotal)}</span>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: tx.refundedAmount > 0 ? C.error : C.textDim, fontVariantNumeric: 'tabular-nums' }}>
                          {tx.refundedAmount > 0 ? fmt$(tx.refundedAmount) : '—'}
                        </span>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: isVoided ? C.textDim : C.success, fontVariantNumeric: 'tabular-nums' }}>
                          {isVoided ? '—' : fmt$(net)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Pagination footer */}
            {rows.length > 0 && (
              <div style={{ padding: '8px 16px 16px', borderTop: `1px solid ${C.border}`, background: C.tableHdr }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 0 4px', flexWrap: 'wrap' }}>
                  <button onClick={() => goPage(page - 1)} disabled={page === 1}
                    style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.35 : 1 }}>
                    <ChevronLeftIcon sx={{ fontSize: 18, color: C.textSec }} />
                  </button>
                  {pageList(page, pages).map((p, i) =>
                    p === '…'
                      ? <span key={`e${i}`} style={{ width: 34, textAlign: 'center', fontSize: 13, color: C.textDim }}>…</span>
                      : <button key={p} onClick={() => goPage(p)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${p === page ? C.primary : C.border}`, background: p === page ? C.primary : C.surface, color: p === page ? '#fff' : C.textSec, fontSize: 12, fontWeight: p === page ? 800 : 600, cursor: p === page ? 'default' : 'pointer', fontFamily: FONT }}>{p}</button>
                  )}
                  <button onClick={() => goPage(page + 1)} disabled={page === pages}
                    style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: page === pages ? 'default' : 'pointer', opacity: page === pages ? 0.35 : 1 }}>
                    <ChevronRightIcon sx={{ fontSize: 18, color: C.textSec }} />
                  </button>
                </div>
                <p style={{ margin: '2px 0 0', textAlign: 'center', fontSize: 11, color: C.textDim }}>
                  Page {page} of {pages} · {total.toLocaleString()} transaction{total !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
