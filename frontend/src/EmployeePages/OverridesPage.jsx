import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const PAGE_SIZE = 5;

/* ─────────────────────────────────────────────
   Design tokens — AGENTS.md (same as Manager Overrides)
───────────────────────────────────────────── */
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

const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'DENIED'];

const STATUS_STYLE = {
  PENDING:  { bg: 'rgba(178,106,0,0.10)', border: 'rgba(178,106,0,0.30)', color: C.warning },
  APPROVED: { bg: 'rgba(46,125,79,0.10)', border: 'rgba(46,125,79,0.30)', color: C.success },
  DENIED:   { bg: 'rgba(183,28,28,0.09)', border: 'rgba(183,28,28,0.25)', color: C.error },
};

const TYPE_META = {
  REFUND:       { label: 'Refund',         bg: 'rgba(62,39,35,0.08)',    color: C.primary   },
  VOID:         { label: 'Void',           bg: 'rgba(178,106,0,0.10)',   color: C.warning   },
  DISCOUNT:     { label: 'Discount Sale',  bg: 'rgba(212,163,115,0.18)', color: '#8a5a2c'   },
  PRICE_CHANGE: { label: 'Price Override', bg: 'rgba(0,100,160,0.08)',   color: '#006494'   },
};

const inputStyle = {
  width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri,
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function OverridesPage() {
  const navigate   = useNavigate();
  const token      = useAuthStore((s) => s.token);
  const isDesktop  = useMediaQuery('(min-width:1024px)');
  const [overrides, setOverrides]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [statusFilter, setStatusFilter]     = useState('ALL');
  const [page, setPage]                     = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/overrides/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setOverrides(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return overrides.filter((o) => {
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesSearch = !q
        || o.productName?.toLowerCase().includes(q)
        || o.sku?.toLowerCase().includes(q)
        || o.invoiceNo?.toLowerCase().includes(q)
        || o.paymentMethod?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [overrides, search, statusFilter]);

  const pageSize   = isDesktop ? 10 : PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const pendingCount  = overrides.filter((o) => o.status === 'PENDING').length;
  const resolvedCount = overrides.filter((o) => o.status !== 'PENDING').length;

  const resumeDiscountState = (o) => ({
    amount: (o.amount || 0) + (o.discountAmount || 0),
    product: { productId: o.productId, name: o.productName, sku: o.sku, code: o.sku || '' },
    transactionType: 'SL',
    discount: {
      type: o.discountType, value: o.discountValue, amount: o.discountAmount,
      finalAmount: o.amount, overrideId: o._id, saleId: o.saleId || null, prefill: o.saleContext || null,
    },
  });

  const resumePriceState = (o) => ({
    amount: o.sellingPrice || o.amount,
    product: { productId: o.productId, name: o.productName, sku: o.sku, code: o.sku || '', price: o.defaultPrice },
    transactionType: 'SL',
    priceOverride: {
      saleId: o.saleId || null, overrideId: o._id,
      defaultPrice: o.defaultPrice, sellingPrice: o.sellingPrice || o.amount,
      variancePercent: o.variancePercent, prefill: o.saleContext || null,
    },
  });

  const renderPagination = () => filtered.length > 0 && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>
        {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeftIcon sx={{ fontSize: 18, color: C.textPri }} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri, minWidth: 60, textAlign: 'center' }}>
          Page {safePage} / {totalPages}
        </span>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRightIcon sx={{ fontSize: 18, color: C.textPri }} />
        </button>
      </div>
    </div>
  );

  // ── Mobile layout ────────────────────────────────────────────────────────────
  if (!isDesktop) return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>Override Requests</h1>
          <button onClick={load} style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshOutlinedIcon sx={{ fontSize: 17, color: C.textDim }} />
          </button>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Your override requests — refunds and discounts awaiting or resolved.
        </p>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Pending', value: pendingCount, color: pendingCount > 0 ? C.warning : C.success, Icon: ErrorOutlineOutlinedIcon, iconBg: pendingCount > 0 ? 'rgba(178,106,0,0.16)' : 'rgba(46,125,79,0.10)' },
          { label: 'Resolved', value: resolvedCount, color: C.success, Icon: CheckCircleOutlinedIcon, iconBg: 'rgba(46,125,79,0.10)' },
        ].map(({ label, value, color, Icon, iconBg }) => (
          <CornerCard key={label} borderColor={C.border} cornerSize={18} cornerHeight={18} style={{ background: C.surface }}>
            <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon sx={{ fontSize: 17, color }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, lineHeight: 1, letterSpacing: '-0.3px' }}>{String(value).padStart(2, '0')}</p>
                <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
              </div>
            </div>
          </CornerCard>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <SearchOutlinedIcon sx={{ fontSize: 18, color: C.textDim, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product, SKU, or method…" style={inputStyle} />
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {FILTERS.map((f) => {
          const active = statusFilter === f;
          return (
            <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, flexShrink: 0, border: active ? `1px solid ${C.primary}` : `1px solid ${C.border}`, background: active ? C.primary : '#fff', color: active ? '#fff' : C.textSec, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer' }}>
              {f}
            </button>
          );
        })}
      </div>

      {/* Request list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, fontWeight: 600, color: C.textDim }}>Loading…</div>
      ) : pageItems.length === 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '36px 24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 22, color: C.primary }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.textPri, margin: 0 }}>{search || statusFilter !== 'ALL' ? 'No matching requests' : 'No Requests Yet'}</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: '4px 0 0' }}>{search || statusFilter !== 'ALL' ? 'Try a different search term or filter.' : 'Refund and discount override requests you submit will show up here.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {pageItems.map((o) => {
            const s = STATUS_STYLE[o.status] || STATUS_STYLE.PENDING;
            const t = TYPE_META[o.actionType] || TYPE_META.REFUND;
            return (
              <CornerCard key={o._id} borderColor={C.border} cornerSize={20} cornerHeight={20} style={{ background: C.surface }}>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                      {o.productName}{o.sku ? ` · ${o.sku}` : ''}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 20, background: t.bg, color: t.color }}>{t.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{o.status}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                      {o.invoiceNo ? `${o.invoiceNo} · ` : ''}{o.paymentMethod}{o.card?.last4 ? ` •••• ${o.card.last4}` : ''} · {new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.textPri, flexShrink: 0 }}>${Number(o.amount ?? 0).toFixed(2)}</span>
                  </div>
                  {(o.buyer?.name || o.saleContext?.buyer?.name) && (
                    <div style={{ marginTop: 8, paddingTop: 7, borderTop: `1px dashed ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Buyer</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, textAlign: 'right' }}>
                        {o.buyer?.name || o.saleContext?.buyer?.name}
                      </span>
                    </div>
                  )}
                  {o.actionType === 'DISCOUNT' && o.status === 'APPROVED' && !o.completedSaleId && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${s.border}` }}>
                      <button onClick={() => navigate('/employee/tender', { state: resumeDiscountState(o) })}
                        style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: `1.5px solid ${C.success}`, background: 'rgba(46,125,79,0.08)', color: C.success, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, letterSpacing: '0.04em' }}>
                        <PlayArrowOutlinedIcon sx={{ fontSize: 15 }} />
                        Resume Sale — ${Number(o.amount ?? 0).toFixed(2)} due
                      </button>
                    </div>
                  )}
                  {o.actionType === 'PRICE_CHANGE' && o.status === 'APPROVED' && !o.completedSaleId && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${s.border}` }}>
                      <button onClick={() => navigate('/employee/tender', { state: resumePriceState(o) })}
                        style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1.5px solid #006494', background: 'rgba(0,100,160,0.08)', color: '#006494', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, letterSpacing: '0.04em' }}>
                        <PlayArrowOutlinedIcon sx={{ fontSize: 15 }} />
                        Resume Sale — ${Number(o.sellingPrice || o.amount || 0).toFixed(2)} due
                      </button>
                    </div>
                  )}
                </div>
              </CornerCard>
            );
          })}
        </div>
      )}

      {renderPagination()}
    </div>
  );

  // ── Desktop layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg, minHeight: '100dvh' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 19, color: '#D4A373' }} />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Override Requests</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textSec }}>
            Your submitted refund and discount override requests.
          </p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.textSec }}>
          <RefreshOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Requests', value: overrides.length, color: C.primary, iconBg: 'rgba(62,39,35,0.09)', Icon: AdminPanelSettingsOutlinedIcon },
          { label: 'Pending', value: pendingCount, color: pendingCount > 0 ? C.warning : C.success, iconBg: pendingCount > 0 ? 'rgba(178,106,0,0.16)' : 'rgba(46,125,79,0.10)', Icon: ErrorOutlineOutlinedIcon },
          { label: 'Resolved', value: resolvedCount, color: C.success, iconBg: 'rgba(46,125,79,0.10)', Icon: CheckCircleOutlinedIcon },
        ].map(({ label, value, color, iconBg, Icon }) => (
          <CornerCard key={label} borderColor={C.border} cornerSize={20} cornerHeight={20} style={{ background: C.surface }}>
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon sx={{ fontSize: 22, color }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, lineHeight: '32px', letterSpacing: '-0.5px' }}>{String(value).padStart(2, '0')}</p>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
              </div>
            </div>
          </CornerCard>
        ))}
      </div>

      {/* Search + filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
          <SearchOutlinedIcon sx={{ fontSize: 18, color: C.textDim, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product, SKU, invoice or method…"
            style={{ ...inputStyle, padding: '10px 12px 10px 38px', borderRadius: 9 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map((f) => {
            const active = statusFilter === f;
            return (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: '8px 16px', borderRadius: 20, border: active ? `1px solid ${C.primary}` : `1px solid ${C.border}`, background: active ? C.primary : '#fff', color: active ? '#fff' : C.textSec, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer' }}>
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>

        {/* Table header */}
        <div style={{ background: '#F3EDE9', borderBottom: `1px solid ${C.border}`, padding: '11px 20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 120px', gap: 12, alignItems: 'center' }}>
          {['Product / SKU', 'Type', 'Invoice · Payment', 'Date', 'Amount', 'Status / Action'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Loading…</div>
        ) : pageItems.length === 0 ? (
          <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 28, color: C.primary }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.textPri, margin: 0 }}>{search || statusFilter !== 'ALL' ? 'No matching requests' : 'No Requests Yet'}</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.textSec, margin: 0, maxWidth: 300, lineHeight: '20px' }}>
              {search || statusFilter !== 'ALL' ? 'Try a different search term or filter.' : 'Refund and discount override requests you submit will show up here.'}
            </p>
          </div>
        ) : pageItems.map((o, i) => {
          const s = STATUS_STYLE[o.status] || STATUS_STYLE.PENDING;
          const t = TYPE_META[o.actionType] || TYPE_META.REFUND;
          const canResume = o.status === 'APPROVED' && !o.completedSaleId && (o.actionType === 'DISCOUNT' || o.actionType === 'PRICE_CHANGE');
          return (
            <div key={o._id} style={{ padding: '14px 20px', borderBottom: i < pageItems.length - 1 ? `1px solid #F0E8E4` : 'none', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px 120px', gap: 12, alignItems: 'center', background: i % 2 ? '#FDFCFB' : C.surface, transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F3EDE9'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#FDFCFB' : C.surface}
            >
              {/* Product */}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.productName}</p>
                <p style={{ margin: '1px 0 0', fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.04em' }}>
                  {o.sku || '—'}
                  {(o.buyer?.name || o.saleContext?.buyer?.name) && (
                    <span style={{ color: C.textSec }}> · {o.buyer?.name || o.saleContext?.buyer?.name}</span>
                  )}
                </p>
              </div>

              {/* Type badge */}
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '4px 10px', borderRadius: 20, background: t.bg, color: t.color }}>{t.label}</span>
              </div>

              {/* Invoice · Payment */}
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {o.invoiceNo || '—'}{o.paymentMethod ? ` · ${o.paymentMethod}` : ''}
                {o.card?.last4 ? ` ···${o.card.last4}` : ''}
              </p>

              {/* Date */}
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDim }}>
                {new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>

              {/* Amount */}
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>${Number(o.amount ?? 0).toFixed(2)}</p>

              {/* Status / Action */}
              <div>
                {canResume ? (
                  <button
                    onClick={() => navigate('/employee/tender', { state: o.actionType === 'DISCOUNT' ? resumeDiscountState(o) : resumePriceState(o) })}
                    style={{ padding: '6px 10px', borderRadius: 7, border: o.actionType === 'DISCOUNT' ? `1.5px solid ${C.success}` : '1.5px solid #006494', background: o.actionType === 'DISCOUNT' ? 'rgba(46,125,79,0.08)' : 'rgba(0,100,160,0.08)', color: o.actionType === 'DISCOUNT' ? C.success : '#006494', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
                  >
                    <PlayArrowOutlinedIcon sx={{ fontSize: 13 }} />
                    Resume
                  </button>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '4px 10px', borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{o.status}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {renderPagination()}
    </div>
  );
}
