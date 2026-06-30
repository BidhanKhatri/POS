import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchOutlinedIcon        from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon         from '@mui/icons-material/CloseOutlined';
import RefreshOutlinedIcon       from '@mui/icons-material/RefreshOutlined';
import PeopleOutlinedIcon        from '@mui/icons-material/PeopleOutlined';
import FilterListOutlinedIcon    from '@mui/icons-material/FilterListOutlined';
import ChevronLeftIcon           from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon          from '@mui/icons-material/ChevronRight';
import EventOutlinedIcon         from '@mui/icons-material/EventOutlined';
import PhoneOutlinedIcon         from '@mui/icons-material/PhoneOutlined';
import useAuthStore              from '../store/useAuthStore';
import CornerCard                from '../components/CornerCard/CornerCard';

import { API_URL as API } from '../config/api';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00', info: '#0277BD',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
  elevated: '#EFE7E2', tableHover: '#EFE7E2',
};

function fmt$(n) {
  if (n == null || n === 0) return '$0.00';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
}

function pageList(cur, total) {
  if (total <= 1) return [1];
  const range = [];
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) range.push(i);
  const out = [1];
  if (range[0] > 2) out.push('…');
  out.push(...range);
  if (range[range.length - 1] < total - 1) out.push('…');
  if (total > 1) out.push(total);
  return out;
}

export default function CustomerSearchPage() {
  const navigate  = useNavigate();
  const { token } = useAuthStore();

  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [search,     setSearch]     = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const debounce = useRef(null);
  const headers  = { Authorization: `Bearer ${token}` };

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
      const r = await fetch(`${API}/api/customers?${buildQS({ page: pg, limit: 20 })}`, { headers });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `Error ${r.status}`);
      const d = await r.json();
      setRows(d.customers || []);
      setTotal(d.total || 0);
      setPage(d.page || 1);
      setPages(d.pages || 1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const delay = search.trim() ? 350 : 0;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); loadRows(1); }, delay);
    return () => clearTimeout(debounce.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, startDate, endDate, token]);

  const goPage = pg => { if (pg >= 1 && pg <= pages && pg !== page) loadRows(pg); };

  return (
    <div style={{ padding: '16px 16px 40px', background: C.bg, minHeight: '100%', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PeopleOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Employee Portal</p>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>
              Customers
              {!loading && total > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginLeft: 8 }}>{total.toLocaleString()}</span>}
            </h1>
          </div>
        </div>
        <button onClick={() => loadRows(page)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 11px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: FONT }}>
          <RefreshOutlinedIcon sx={{ fontSize: 15 }} />
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: showFilter ? `1px solid ${C.border}` : 'none' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 12px' }}>
            <SearchOutlinedIcon sx={{ fontSize: 16, color: C.textDim, flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 500, color: C.textPri, background: 'transparent', fontFamily: FONT }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                <CloseOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilter(f => !f)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 11px', borderRadius: 8, border: `1px solid ${showFilter ? C.primary : C.border}`, background: showFilter ? C.primary : C.surface, color: showFilter ? '#fff' : C.textSec, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap' }}>
            <FilterListOutlinedIcon sx={{ fontSize: 15 }} />
            {(startDate || endDate) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: showFilter ? C.accent : C.primary }} />}
          </button>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>
              Clear
            </button>
          )}
        </div>
        {showFilter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: '#FDFCFB' }}>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registered From</p>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, fontFamily: FONT, outline: 'none', background: C.surface, boxSizing: 'border-box' }} />
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>To</p>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, fontFamily: FONT, outline: 'none', background: C.surface, boxSizing: 'border-box' }} />
            </div>
          </div>
        )}
      </div>

      {/* Customer list */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '14px 16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: C.elevated, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 12, width: '55%', borderRadius: 4, background: C.elevated }} />
                <div style={{ height: 10, width: '35%', borderRadius: 4, background: C.elevated }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                <div style={{ height: 12, width: 60, borderRadius: 4, background: C.elevated }} />
                <div style={{ height: 10, width: 40, borderRadius: 4, background: C.elevated }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>{error}</p>
          <button onClick={() => loadRows(1)}
            style={{ marginTop: 12, padding: '8px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <PeopleOutlinedIcon sx={{ fontSize: 44, color: C.textDim, display: 'block', margin: '0 auto 14px' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textSec }}>No customers found</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textDim }}>
            {search ? 'Try a different name or phone number.' : 'Customers appear here once sales with buyer details are recorded.'}
          </p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(c => (
              <CornerCard key={c._id} borderColor={C.border} borderRadius={12} cornerSize={22} cornerHeight={22}
                style={{ cursor: 'pointer' }}>
                <button
                  onClick={() => navigate(`/employee/customers/${c._id}`)}
                  style={{ width: '100%', background: 'transparent', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}>
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800, color: C.accent }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + contact */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                      <span style={{ padding: '1px 7px', borderRadius: 6, background: c.totalOrders > 1 ? 'rgba(46,125,79,0.10)' : 'rgba(2,119,189,0.10)', color: c.totalOrders > 1 ? C.success : C.info, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', flexShrink: 0 }}>
                        {c.totalOrders > 1 ? 'RETURNING' : 'NEW'}
                      </span>
                    </div>
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <PhoneOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />
                        <span style={{ fontSize: 12, color: C.textDim, fontFamily: 'monospace' }}>{c.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Spend + last visit */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>{fmt$(c.totalSpent)}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 2 }}>
                      <EventOutlinedIcon sx={{ fontSize: 10, color: C.textDim }} />
                      <span style={{ fontSize: 10, color: C.textDim }}>{fmtDate(c.lastVisit)}</span>
                    </div>
                    <p style={{ margin: '1px 0 0', fontSize: 10, color: C.textDim }}>{c.totalOrders} order{c.totalOrders !== 1 ? 's' : ''}</p>
                  </div>

                  <ChevronRightIcon sx={{ fontSize: 18, color: C.textDim, flexShrink: 0 }} />
                </button>
              </CornerCard>
          ))}

          {/* Pagination */}
          <div style={{ marginTop: 8, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            {pages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                <button onClick={() => goPage(page - 1)} disabled={page === 1}
                  style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.35 : 1 }}>
                  <ChevronLeftIcon sx={{ fontSize: 18, color: C.textSec }} />
                </button>
                {pageList(page, pages).map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} style={{ width: 28, textAlign: 'center', fontSize: 13, color: C.textDim }}>…</span>
                    : <button key={p} onClick={() => goPage(p)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${p === page ? C.primary : C.border}`, background: p === page ? C.primary : C.surface, color: p === page ? '#fff' : C.textSec, fontSize: 12, fontWeight: p === page ? 800 : 600, cursor: p === page ? 'default' : 'pointer', fontFamily: FONT }}>
                        {p}
                      </button>
                )}
                <button onClick={() => goPage(page + 1)} disabled={page === pages}
                  style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, background: C.surface, cursor: page === pages ? 'default' : 'pointer', opacity: page === pages ? 0.35 : 1 }}>
                  <ChevronRightIcon sx={{ fontSize: 18, color: C.textSec }} />
                </button>
              </div>
            )}
            <p style={{ margin: 0, textAlign: 'center', fontSize: 11, color: C.textDim }}>
              {total.toLocaleString()} customer{total !== 1 ? 's' : ''}{pages > 1 ? ` · page ${page} of ${pages}` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
