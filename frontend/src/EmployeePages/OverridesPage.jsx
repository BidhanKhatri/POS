import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  REFUND:   { label: 'Refund', bg: 'rgba(62,39,35,0.08)',   color: C.primary },
  VOID:     { label: 'Void',   bg: 'rgba(178,106,0,0.10)',  color: C.warning },
  DISCOUNT: { label: 'Discount Sale', bg: 'rgba(212,163,115,0.18)', color: '#8a5a2c' },
};

const inputStyle = {
  width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri,
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function OverridesPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage]           = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const pendingCount  = overrides.filter((o) => o.status === 'PENDING').length;
  const resolvedCount = overrides.filter((o) => o.status !== 'PENDING').length;

  return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
            Override Requests
          </h1>
          <button
            onClick={load}
            style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 17, color: C.textDim }} />
          </button>
        </div>
        <p style={{
          margin: '3px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          Your override requests — refunds and discounts awaiting or resolved.
        </p>
      </div>

      {/* ── Stat strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          {
            label: 'Pending', value: pendingCount,
            color: pendingCount > 0 ? C.warning : C.success,
            Icon: ErrorOutlineOutlinedIcon,
            iconBg: pendingCount > 0 ? 'rgba(178,106,0,0.16)' : 'rgba(46,125,79,0.10)',
            border: pendingCount > 0 ? 'rgba(178,106,0,0.45)' : C.border,
          },
          {
            label: 'Resolved', value: resolvedCount,
            color: C.success,
            Icon: CheckCircleOutlinedIcon,
            iconBg: 'rgba(46,125,79,0.10)',
            border: C.border,
          },
        ].map(({ label, value, color, Icon, iconBg, border }) => (
          <CornerCard key={label} borderColor={C.border} cornerSize={18} cornerHeight={18} style={{ background: C.surface }}>
          <div style={{
            padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, background: iconBg, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon sx={{ fontSize: 17, color }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, lineHeight: 1, letterSpacing: '-0.3px' }}>
                {String(value).padStart(2, '0')}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {label}
              </p>
            </div>
          </div>
          </CornerCard>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <SearchOutlinedIcon sx={{ fontSize: 18, color: C.textDim, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product, SKU, or method…"
          style={inputStyle}
        />
      </div>

      {/* ── Status filter chips ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
        {FILTERS.map((f) => {
          const active = statusFilter === f;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20, flexShrink: 0,
                border: active ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                background: active ? C.primary : '#fff',
                color: active ? '#fff' : C.textSec,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* ── Request list ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, fontWeight: 600, color: C.textDim }}>
          Loading…
        </div>
      ) : pageItems.length === 0 ? (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '36px 24px', textAlign: 'center', marginBottom: 16,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 22, color: C.primary }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.textPri, margin: 0 }}>
            {search || statusFilter !== 'ALL' ? 'No matching requests' : 'No Requests Yet'}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: '4px 0 0' }}>
            {search || statusFilter !== 'ALL'
              ? 'Try a different search term or filter.'
              : 'Refund and discount override requests you submit will show up here.'}
          </p>
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
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: C.textPri,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
                  }}>
                    {o.productName}{o.sku ? ` · ${o.sku}` : ''}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                      padding: '3px 8px', borderRadius: 20,
                      background: t.bg, color: t.color,
                    }}>
                      {t.label}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                      padding: '3px 8px', borderRadius: 20,
                      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                    }}>
                      {o.status}
                    </span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    {o.invoiceNo ? `${o.invoiceNo} · ` : ''}{o.paymentMethod}{o.card?.last4 ? ` •••• ${o.card.last4}` : ''} · {new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.textPri, flexShrink: 0 }}>
                    ${Number(o.amount ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* Buyer row — shown for pending refunds and discount overrides */}
                {(o.buyer?.name || o.saleContext?.buyer?.name) && (
                  <div style={{
                    marginTop: 8, paddingTop: 7, borderTop: `1px dashed ${s.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Buyer
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: C.textPri,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, textAlign: 'right',
                    }}>
                      {(o.buyer?.name || o.saleContext?.buyer?.name)}
                    </span>
                  </div>
                )}

                {/* Resume Sale — APPROVED DISCOUNT overrides not yet finalized */}
                {o.actionType === 'DISCOUNT' && o.status === 'APPROVED' && !o.completedSaleId && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${s.border}` }}>
                    <button
                      onClick={() => navigate('/employee/tender', {
                        state: {
                          amount: (o.amount || 0) + (o.discountAmount || 0),  // original price for TenderPage
                          product: {
                            productId: o.productId,
                            name:      o.productName,
                            sku:       o.sku,
                            code:      o.sku || '',
                          },
                          transactionType: 'SL',
                          discount: {
                            type:        o.discountType,
                            value:       o.discountValue,
                            amount:      o.discountAmount,
                            finalAmount: o.amount,           // final price (stored on override)
                            overrideId:  o._id,
                            saleId:      o.saleId || null,
                            prefill:     o.saleContext || null,
                          },
                        },
                      })}
                      style={{
                        width: '100%', padding: '9px 0', borderRadius: 8,
                        border: `1.5px solid ${C.success}`,
                        background: 'rgba(46,125,79,0.08)',
                        color: C.success, fontSize: 12, fontWeight: 800,
                        cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        letterSpacing: '0.04em',
                      }}
                    >
                      <PlayArrowOutlinedIcon sx={{ fontSize: 15 }} />
                      Resume Sale — ${Number(o.amount ?? 0).toFixed(2)} due
                    </button>
                  </div>
                )}
              </div>
              </CornerCard>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${C.border}`, background: '#fff',
                cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                opacity: safePage <= 1 ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: 18, color: C.textPri }} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri, minWidth: 60, textAlign: 'center' }}>
              Page {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: `1px solid ${C.border}`, background: '#fff',
                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: safePage >= totalPages ? 0.4 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronRightIcon sx={{ fontSize: 18, color: C.textPri }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
