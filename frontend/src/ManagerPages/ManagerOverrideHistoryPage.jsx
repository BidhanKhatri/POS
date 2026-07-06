import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import ArrowBackIcon                 from '@mui/icons-material/ArrowBack';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import CancelOutlinedIcon            from '@mui/icons-material/CancelOutlined';
import LocalOfferOutlinedIcon        from '@mui/icons-material/LocalOfferOutlined';
import SellOutlinedIcon              from '@mui/icons-material/SellOutlined';
import SearchOutlinedIcon            from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon             from '@mui/icons-material/CloseOutlined';
import RefreshOutlinedIcon           from '@mui/icons-material/RefreshOutlined';
import ChevronLeftOutlinedIcon       from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon      from '@mui/icons-material/ChevronRightOutlined';
import useAuthStore from '../store/useAuthStore';
import { API_URL as API } from '../config/api';

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

const FONT = "'Plus Jakarta Sans', sans-serif";

const TYPE_META = {
  REFUND:       { icon: AdminPanelSettingsOutlinedIcon, label: 'Refund'          },
  VOID:         { icon: CancelOutlinedIcon,             label: 'Void'            },
  DISCOUNT:     { icon: LocalOfferOutlinedIcon,         label: 'Discount'        },
  PRICE_CHANGE: { icon: SellOutlinedIcon,               label: 'Price Override'  },
};

const STATUS_STYLE = {
  APPROVED: { bg: 'rgba(46,125,79,0.10)', color: C.success, border: 'rgba(46,125,79,0.25)' },
  DENIED:   { bg: 'rgba(183,28,28,0.09)', color: C.error,   border: 'rgba(183,28,28,0.20)'  },
};

const TYPE_FILTERS = [
  { key: 'ALL',          label: 'All'      },
  { key: 'REFUND',       label: 'Refund'   },
  { key: 'VOID',         label: 'Void'     },
  { key: 'DISCOUNT',     label: 'Discount' },
  { key: 'PRICE_CHANGE', label: 'Price'    },
];

const STATUS_FILTERS = [
  { key: 'APPROVED', label: 'Approved' },
  { key: 'DENIED',   label: 'Denied'   },
];

const PER_PAGE = 15;

const formatMoney = (n) => `$${Number(n ?? 0).toFixed(2)}`;

const formatDateTime = (d) => new Date(d).toLocaleString([], {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

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

function HistoryRow({ item, last, isDesktop }) {
  const meta = TYPE_META[item.actionType] || TYPE_META.REFUND;
  const ss   = STATUS_STYLE[item.status] || STATUS_STYLE.DENIED;
  const Icon = meta.icon;

  const badge = (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 20, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
      {item.status}
    </span>
  );

  if (isDesktop) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 160px 100px 90px auto', gap: 12, alignItems: 'center', padding: '12px 20px', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>{formatDateTime(item.resolvedAt || item.createdAt)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon sx={{ fontSize: 15, color: C.textDim }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{meta.label}</p>
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.employeeId?.name || 'Unknown'} · {item.employeeId?.employeeCode || '—'}
        </p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{formatMoney(item.amount)}</p>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.approvedBy?.name || '—'}
        </p>
        {badge}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon sx={{ fontSize: 15, color: C.textDim }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>{meta.label}</p>
        </div>
        {badge}
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: C.textSec }}>
        {item.employeeId?.name || 'Unknown'} ({item.employeeId?.employeeCode || '—'}) · {formatMoney(item.amount)}
      </p>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: C.textDim }}>
        {formatDateTime(item.resolvedAt || item.createdAt)}{item.approvedBy?.name ? ` · by ${item.approvedBy.name}` : ''}
      </p>
    </div>
  );
}

export default function ManagerOverrideHistoryPage() {
  const navigate  = useNavigate();
  const token     = useAuthStore((s) => s.token);
  const headers   = { Authorization: `Bearer ${token}` };
  const isDesktop = useMediaQuery('(min-width:1024px)');

  const [overrides, setOverrides] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [typeFilter,   setTypeFilter]   = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/overrides`, { headers })
      .then((r) => r.json())
      .then((data) => setOverrides(Array.isArray(data) ? data.filter((o) => o.status !== 'PENDING') : []))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [search, typeFilter, statusFilter]);

  const byType = typeFilter === 'ALL' ? overrides : overrides.filter((o) => o.actionType === typeFilter);
  const byStatus = statusFilter === 'ALL' ? byType : byType.filter((o) => o.status === statusFilter);

  const q = search.trim().toLowerCase();
  const searched = q
    ? byStatus.filter((item) => {
        const meta = TYPE_META[item.actionType] || TYPE_META.REFUND;
        return (
          (item.employeeId?.name         || '').toLowerCase().includes(q) ||
          (item.employeeId?.employeeCode || '').toLowerCase().includes(q) ||
          (item.approvedBy?.name         || '').toLowerCase().includes(q) ||
          (item.invoiceNo                || '').toLowerCase().includes(q) ||
          (item.productName              || '').toLowerCase().includes(q) ||
          meta.label.toLowerCase().includes(q) ||
          formatMoney(item.amount).includes(q)
        );
      })
    : byStatus;

  const totalPages = Math.max(1, Math.ceil(searched.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages - 1);
  const displayed  = searched.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);
  const startIdx   = searched.length === 0 ? 0 : safePage * PER_PAGE + 1;
  const endIdx     = Math.min((safePage + 1) * PER_PAGE, searched.length);

  const typeCounts = {};
  TYPE_FILTERS.forEach(({ key }) => {
    typeCounts[key] = key === 'ALL' ? overrides.length : overrides.filter((o) => o.actionType === key).length;
  });
  const statusCounts = {};
  STATUS_FILTERS.forEach(({ key }) => {
    statusCounts[key] = key === 'ALL' ? overrides.length : overrides.filter((o) => o.status === key).length;
  });

  return (
    <div style={{ padding: isDesktop ? '24px 32px 40px' : '18px 16px 32px', maxWidth: isDesktop ? 1100 : 480, margin: '0 auto', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/manager/overrides')} style={{ width: isDesktop ? 38 : 34, height: isDesktop ? 38 : 34, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowBackIcon sx={{ fontSize: isDesktop ? 20 : 17, color: C.primary }} />
          </button>
          <h1 style={{ margin: 0, fontSize: isDesktop ? 22 : 16, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Override History</h1>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer' }}>
          <RefreshOutlinedIcon sx={{ fontSize: 15 }} /> {isDesktop && 'Refresh'}
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <SearchOutlinedIcon sx={{ fontSize: 15, color: C.textDim, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by employee, manager, invoice, type…"
          style={{
            width: '100%', height: 38,
            padding: '0 32px 0 32px',
            borderRadius: 8,
            border: `1px solid ${search ? C.primary : C.border}`,
            background: C.surface,
            fontSize: 12, fontWeight: 500, color: C.textPri,
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
            fontFamily: FONT,
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <CloseOutlinedIcon sx={{ fontSize: 14, color: C.textDim }} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
        {TYPE_FILTERS.map(({ key, label }) => {
          const active = typeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              style={{
                padding: '6px 10px', borderRadius: 7,
                border: `1px solid ${active ? C.primary : C.border}`,
                background: active ? C.primary : C.surface,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                color: active ? '#fff' : C.textSec,
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: FONT,
              }}
            >
              {label}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, minWidth: 16, textAlign: 'center', background: active ? 'rgba(255,255,255,0.20)' : C.elevated, color: active ? '#fff' : C.textDim }}>
                {typeCounts[key]}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
        {STATUS_FILTERS.map(({ key, label }) => {
          const active = statusFilter === key;
          const color  = key === 'APPROVED' ? C.success : C.error;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(active ? 'ALL' : key)}
              style={{
                padding: '6px 10px', borderRadius: 7,
                border: `1px solid ${active ? color : C.border}`,
                background: active ? color : C.surface,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                color: active ? '#fff' : C.textSec,
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: FONT,
              }}
            >
              {label}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, minWidth: 16, textAlign: 'center', background: active ? 'rgba(255,255,255,0.20)' : C.elevated, color: active ? '#fff' : C.textDim }}>
                {statusCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results info */}
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 500, color: C.textDim }}>
        {loading
          ? 'Loading…'
          : searched.length === 0
          ? 'No results match your filters.'
          : `Showing ${startIdx}–${endIdx} of ${searched.length} result${searched.length !== 1 ? 's' : ''}`}
      </p>

      {/* Table / list */}
      <div className="no-scrollbar" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: isDesktop ? 700 : 'auto' }}>
          {isDesktop && (
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 160px 100px 90px auto', gap: 12, padding: '10px 20px', background: '#F3EDE9', borderBottom: `1px solid ${C.border}`, borderRadius: '11px 11px 0 0' }}>
              {['Date & Time', 'Type', 'Employee', 'Amount', 'Manager', 'Status'].map((h) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</span>
              ))}
            </div>
          )}
          {loading ? (
            <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, fontWeight: 500, color: C.textDim }}>Loading override history…</div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 12, fontWeight: 500, color: C.textDim }}>No resolved overrides found.</div>
          ) : (
            displayed.map((item, i) => (
              <HistoryRow key={item._id} item={item} last={i === displayed.length - 1} isDesktop={isDesktop} />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: C.textDim }}>Page {safePage + 1} of {totalPages}</span>
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
