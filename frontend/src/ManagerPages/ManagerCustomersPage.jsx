import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import SearchOutlinedIcon         from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon          from '@mui/icons-material/CloseOutlined';
import RefreshOutlinedIcon        from '@mui/icons-material/RefreshOutlined';
import InfoOutlinedIcon           from '@mui/icons-material/InfoOutlined';
import PeopleOutlinedIcon         from '@mui/icons-material/PeopleOutlined';
import PersonAddOutlinedIcon      from '@mui/icons-material/PersonAddOutlined';
import TrendingUpOutlinedIcon     from '@mui/icons-material/TrendingUpOutlined';
import RepeatOutlinedIcon         from '@mui/icons-material/RepeatOutlined';
import AttachMoneyOutlinedIcon    from '@mui/icons-material/AttachMoneyOutlined';
import OpenInNewOutlinedIcon      from '@mui/icons-material/OpenInNewOutlined';
import EditOutlinedIcon           from '@mui/icons-material/EditOutlined';
import ChevronLeftIcon            from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon           from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon      from '@mui/icons-material/KeyboardArrowDown';
import FilterListOutlinedIcon     from '@mui/icons-material/FilterListOutlined';
import useAuthStore               from '../store/useAuthStore';

import { API_URL as API } from '../config/api';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9', tableHover: '#EFE7E2',
};

function fmt$(n) {
  if (n == null || n === 0) return '$0.00';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
}

function KpiCard({ label, value, sub, icon: Icon, color, iconBg, skeleton, isMobile }) {
  return (
    <div style={{ position: 'relative', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: isMobile ? '10px 12px' : '16px 18px', display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 14 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: isMobile ? 16 : 22, height: isMobile ? 16 : 22, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: isMobile ? 8 : 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: isMobile ? 16 : 22, height: isMobile ? 16 : 22, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: isMobile ? 8 : 10, pointerEvents: 'none' }} />
      <div style={{ width: isMobile ? 30 : 40, height: isMobile ? 30 : 40, borderRadius: isMobile ? 8 : 10, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: isMobile ? 15 : 20, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {skeleton
          ? <div style={{ height: isMobile ? 16 : 22, width: 60, borderRadius: 4, background: C.elevated, marginBottom: 4 }} />
          : <p style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', lineHeight: isMobile ? '20px' : '26px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>}
        {sub && !isMobile && <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>}
        <p style={{ margin: isMobile ? '2px 0 0' : '4px 0 0', fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      </div>
    </div>
  );
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

export default function ManagerCustomersPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const isMobile = !useMediaQuery('(min-width:1024px)');

  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [hovered, setHovered] = useState(null);

  const [search,    setSearch]    = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const [kpis,    setKpis]    = useState(null);
  const [kpiLoad, setKpiLoad] = useState(false);

  const [topOpen, setTopOpen] = useState(false);

  const debounce = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  const buildQS = (extra = {}) => {
    const p = {};
    if (search.trim()) p.search = search.trim();
    if (startDate) p.startDate = startDate;
    if (endDate)   p.endDate   = endDate;
    Object.assign(p, extra);
    return new URLSearchParams(p).toString();
  };

  const loadRows = async (pg = 1) => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/customers?${buildQS({ page: pg, limit: 25 })}`, { headers });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || `Error ${r.status}`); }
      const d = await r.json();
      setRows(d.customers || []);
      setTotal(d.total || 0);
      setPage(d.page || 1);
      setPages(d.pages || 1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadAnalytics = async () => {
    if (!token) return;
    setKpiLoad(true);
    try {
      const r = await fetch(`${API}/api/customers/analytics?${buildQS()}`, { headers });
      if (r.ok) setKpis(await r.json());
    } catch { /* non-critical */ }
    finally { setKpiLoad(false); }
  };

  useEffect(() => {
    const delay = search.trim() ? 350 : 0;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadRows(1); loadAnalytics(); }, delay);
    return () => clearTimeout(debounce.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, startDate, endDate, token]);

  const goPage = pg => { if (pg >= 1 && pg <= pages && pg !== page) loadRows(pg); };

  const COLS = '1fr 130px 90px 110px 110px 90px 110px';

  const kpiCards = [
    { label: 'Total Customers', value: kpis ? kpis.totalCustomers.toLocaleString() : '—', sub: 'Active accounts',    icon: PeopleOutlinedIcon,      color: C.info,    iconBg: 'rgba(2,119,189,0.09)'    },
    { label: 'New Customers',   value: kpis ? kpis.newCustomers.toLocaleString() : '—',   sub: '1 order only',       icon: PersonAddOutlinedIcon,   color: C.success, iconBg: 'rgba(46,125,79,0.09)'    },
    { label: 'Returning',       value: kpis ? kpis.returningCustomers.toLocaleString() : '—', sub: '2+ orders',      icon: RepeatOutlinedIcon,      color: C.accent,  iconBg: 'rgba(212,163,115,0.12)'  },
    { label: 'Top Spender',     value: kpis?.topCustomers?.[0] ? fmt$(kpis.topCustomers[0].totalSpent) : '—', sub: kpis?.topCustomers?.[0]?.name || '', icon: AttachMoneyOutlinedIcon, color: C.warning, iconBg: 'rgba(178,106,0,0.09)' },
  ];

  return (
    <div style={{ padding: isMobile ? '14px 14px 40px' : '28px 32px 48px', background: C.bg, minHeight: '100dvh', fontFamily: FONT, boxSizing: 'border-box', width: '100%', overflowX: 'hidden' }}>

      {/* ── Header ── */}
      {isMobile ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PeopleOutlinedIcon sx={{ fontSize: 17, color: C.accent }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPri, letterSpacing: '-0.1px', lineHeight: 1.2 }}>
                Customers
                {!loading && total > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, marginLeft: 7 }}>{total.toLocaleString()}</span>}
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { loadRows(page); loadAnalytics(); }}
              style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <RefreshOutlinedIcon sx={{ fontSize: 16, color: C.textSec }} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PeopleOutlinedIcon sx={{ fontSize: 19, color: C.accent }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Manager Portal</p>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.4px' }}>
                Customers
                {!loading && total > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: C.textDim, marginLeft: 10 }}>{total.toLocaleString()} records</span>}
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { loadRows(page); loadAnalytics(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: FONT }}>
              <RefreshOutlinedIcon sx={{ fontSize: 15 }} /> Refresh
            </button>
          </div>
        </div>
      )}

      {/* ── Info banner ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(2,119,189,0.06)', border: '1px solid rgba(2,119,189,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: isMobile ? 12 : 18 }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: C.info, flexShrink: 0, marginTop: '1px' }} />
        <p style={{ margin: 0, fontSize: isMobile ? 11 : 12, color: '#01579B', fontWeight: 500, lineHeight: '18px' }}>
          Customer records shown here are managed manually.
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 8 : 14, marginBottom: isMobile ? 12 : 22 }}>
        {kpiCards.map(k => <KpiCard key={k.label} {...k} isMobile={isMobile} skeleton={kpiLoad} />)}
      </div>

      {/* ── Top Customers Panel ── */}
      {kpis?.topCustomers?.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: isMobile ? 12 : 16, overflow: 'hidden' }}>
          <button onClick={() => setTopOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUpOutlinedIcon sx={{ fontSize: 16, color: C.primary }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>Top 10 Customers by Spend</span>
            </div>
            <KeyboardArrowDownIcon sx={{ fontSize: 18, color: C.textDim, transform: topOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {topOpen && (
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {kpis.topCustomers.map((c, i) => (
                <div key={c._id || i}
                  onClick={() => navigate(`/manager/customers/${c._id}`)}
                  style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '10px 14px' : '10px 16px', borderBottom: i < kpis.topCustomers.length - 1 ? `1px solid ${C.border}` : 'none', gap: isMobile ? 10 : 14, cursor: 'pointer', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.tableHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: i < 3 ? C.primary : C.elevated, color: i < 3 ? C.accent : C.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                    {c.phone && <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>{c.phone}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.success }}>{fmt$(c.totalSpent)}</p>
                    <p style={{ margin: 0, fontSize: 10, color: C.textDim }}>{c.totalOrders} order{c.totalOrders !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: isMobile ? 12 : 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: showFilter ? `1px solid ${C.border}` : 'none' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 10px' }}>
            <SearchOutlinedIcon sx={{ fontSize: 16, color: C.textDim, flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontWeight: 500, color: C.textPri, background: 'transparent', fontFamily: FONT, minWidth: 0 }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}><CloseOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} /></button>}
          </div>
          <button onClick={() => setShowFilter(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 6, padding: isMobile ? '0' : '7px 13px', width: isMobile ? 34 : 'auto', height: isMobile ? 34 : 'auto', justifyContent: 'center', borderRadius: 8, border: `1px solid ${showFilter ? C.primary : C.border}`, background: showFilter ? C.primary : C.surface, color: showFilter ? '#fff' : C.textSec, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, flexShrink: 0 }}>
            <FilterListOutlinedIcon sx={{ fontSize: 16 }} />
            {!isMobile && ' Date Filter'}
            {(startDate || endDate) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: showFilter ? C.accent : C.primary, marginLeft: isMobile ? 0 : 4 }} />}
          </button>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, flexShrink: 0 }}>
              Clear
            </button>
          )}
        </div>
        {showFilter && (
          <div style={{ display: 'flex', gap: isMobile ? 8 : 16, padding: '12px 14px', background: '#FDFCFB', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>From</p>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.textPri, fontFamily: FONT, outline: 'none', background: C.surface, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>To</p>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.textPri, fontFamily: FONT, outline: 'none', background: C.surface, boxSizing: 'border-box' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile card list ── */}
      {isMobile && (
        <div>
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.elevated, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 13, width: '60%', borderRadius: 4, background: C.elevated, marginBottom: 6 }} />
                  <div style={{ height: 10, width: '40%', borderRadius: 4, background: C.elevated }} />
                </div>
              </div>
            </div>
          ))}

          {!loading && error && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '36px 20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: C.error }}>{error}</p>
              <button onClick={() => loadRows(1)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Retry</button>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '48px 20px', textAlign: 'center' }}>
              <PeopleOutlinedIcon sx={{ fontSize: 40, color: C.textDim, display: 'block', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textSec }}>No customers found</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDim }}>
                {search ? 'Try a different name or phone number.' : 'Customers appear automatically once sales with buyer details are recorded.'}
              </p>
            </div>
          )}

          {!loading && !error && rows.map(c => (
            <div key={c._id}
              onClick={() => navigate(`/manager/customers/${c._id}`)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}>
              {/* Top row: initial + name/email + orders badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.elevated, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: C.primary, textTransform: 'uppercase', flexShrink: 0 }}>
                  {(c.name ?? '?').charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                  {c.email && <p style={{ margin: 0, fontSize: 11, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.success }}>{fmt$(c.totalSpent)}</p>
                  <p style={{ margin: 0, fontSize: 10, color: C.textDim }}>{c.totalOrders} order{c.totalOrders !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {/* Bottom row: phone + last visit + view button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.textSec, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.phone || '—'}</span>
                <span style={{ fontSize: 11, color: C.textDim, flexShrink: 0 }}>Last visit: {fmtDate(c.lastVisit)}</span>
                <OpenInNewOutlinedIcon sx={{ fontSize: 14, color: C.textDim, flexShrink: 0 }} />
              </div>
            </div>
          ))}

          {/* Pagination */}
          {!loading && !error && rows.length > 0 && (
            <div style={{ paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
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
              <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 11, color: C.textDim }}>
                Page {page} of {pages} · {total.toLocaleString()} customer{total !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Desktop table ── */}
      {!isMobile && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLS, background: C.tableHdr, borderBottom: `1px solid ${C.border}` }}>
            {[['Customer', 'left'], ['Phone', 'left'], ['Orders', 'center'], ['Total Spent', 'right'], ['Net Spent', 'right'], ['Last Visit', 'left'], ['', 'center']].map(([h, a]) => (
              <div key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: a }}>{h}</div>
            ))}
          </div>

          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: COLS, borderBottom: `1px solid ${C.border}`, background: i % 2 ? '#FDFCFB' : C.surface }}>
              {[140, 100, 40, 80, 80, 80, 40].map((w, j) => (
                <div key={j} style={{ padding: 14 }}>
                  <div style={{ height: 11, width: w, borderRadius: 4, background: C.elevated }} />
                </div>
              ))}
            </div>
          ))}

          {!loading && error && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>{error}</p>
              <button onClick={() => loadRows(1)} style={{ marginTop: 12, padding: '7px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Retry</button>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <PeopleOutlinedIcon sx={{ fontSize: 44, color: C.textDim, display: 'block', margin: '0 auto 14px' }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textSec }}>No customers found</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDim }}>
                {search ? 'Try a different name or phone number.' : 'Customers appear here automatically once sales with buyer details are recorded.'}
              </p>
            </div>
          )}

          {!loading && !error && rows.map((c, i) => {
            const isHov = hovered === c._id;
            return (
              <div key={c._id}
                onClick={() => navigate(`/manager/customers/${c._id}`)}
                onMouseEnter={() => setHovered(c._id)}
                onMouseLeave={() => setHovered(null)}
                style={{ display: 'grid', gridTemplateColumns: COLS, borderBottom: `1px solid ${C.border}`, background: isHov ? C.tableHover : i % 2 ? '#FDFCFB' : C.surface, cursor: 'pointer', borderLeft: `2px solid ${isHov ? C.primary : 'transparent'}` }}>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{c.name}</span>
                    {isHov && <OpenInNewOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />}
                  </div>
                  {c.email && <span style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{c.email}</span>}
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.textSec, fontFamily: 'monospace' }}>{c.phone || '—'}</span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.totalOrders > 0 ? C.textPri : C.textDim }}>{c.totalOrders}</span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>{fmt$(c.totalSpent)}</span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.refundedAmount > 0 ? C.success : C.textPri, fontVariantNumeric: 'tabular-nums' }}>{fmt$(c.netSpent)}</span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.textSec }}>{fmtDate(c.lastVisit)}</span>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button onClick={e => { e.stopPropagation(); navigate(`/manager/customers/${c._id}`); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>
                    <EditOutlinedIcon sx={{ fontSize: 13 }} /> View
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && !error && rows.length > 0 && (
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
                Page {page} of {pages} · {total.toLocaleString()} customer{total !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
