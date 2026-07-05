import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

import { API_URL as API } from '../config/api';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', error: '#B71C1C', warning: '#B26A00',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
};

const STATUS_META = {
  PAID:     { label: 'PAID',     bg: 'rgba(46,125,79,0.10)',   color: '#2E7D4F',  border: 'rgba(46,125,79,0.25)' },
  PARTIAL:  { label: 'PARTIAL',  bg: 'rgba(178,106,0,0.10)',   color: '#B26A00',  border: 'rgba(178,106,0,0.25)' },
  REFUNDED: { label: 'REFUNDED', bg: 'rgba(183,28,28,0.10)',   color: '#B71C1C',  border: 'rgba(183,28,28,0.25)' },
  VOIDED:   { label: 'VOIDED',   bg: 'rgba(160,148,144,0.12)', color: '#6B5B57',  border: 'rgba(160,148,144,0.25)' },
  PENDING:  { label: 'PENDING',  bg: 'rgba(178,106,0,0.10)',   color: '#B26A00',  border: 'rgba(178,106,0,0.25)' },
};

const METHOD_ICON = {
  CASH:  <AttachMoneyIcon sx={{ fontSize: 13 }} />,
  MOI:   <CreditCardIcon sx={{ fontSize: 13 }} />,
  DEBIT: <CreditCardIcon sx={{ fontSize: 13 }} />,
  MISC:  null,
};

const METHOD_LABEL = { CASH: 'Cash', MOI: 'MOI', DEBIT: 'Debit', MISC: 'Misc' };

// ── Quick filter chip data ──────────────────────────────────────────────────
const DATE_CHIPS_FULL = [
  { id: '',       label: 'All time' },
  { id: 'today',  label: 'Today' },
  { id: 'week',   label: 'This week' },
  { id: 'month',  label: 'This month' },
];
const DATE_CHIPS_EMPLOYEE = [
  { id: 'today',  label: 'Today' },
];
const METHOD_CHIPS = [
  { id: '',     label: 'Any method' },
  { id: 'CASH', label: 'Cash' },
  { id: 'MOI',  label: 'MOI' },
  { id: 'DEBIT', label: 'Debit' },
];
const STATUS_CHIPS = [
  { id: '',         label: 'Any status' },
  { id: 'PAID',     label: 'Paid' },
  { id: 'REFUNDED', label: 'Refunded' },
];

function toDateRange(id) {
  const now = new Date();
  if (id === 'today') {
    return { startDate: now.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) };
  }
  if (id === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 6);
    return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) };
  }
  if (id === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) };
  }
  return { startDate: '', endDate: '' };
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      letterSpacing: '0.06em', fontFamily: FONT,
    }}>
      {m.label}
    </span>
  );
}

// ── Transaction list card ─────────────────────────────────────────────────────
function TxCard({ tx, onClick }) {
  const p = tx.primaryPayment;
  const productName = tx.items?.[0]?.productName ?? '—';
  const time = new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: 0,
        background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
      }}
    >
      <CornerCard borderColor={C.border} cornerSize={20} cornerHeight={20} style={{ background: C.surface }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, padding: '13px 16px' }}>
      {/* Left icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 11, flexShrink: 0, alignSelf: 'center',
        background: tx.paymentStatus === 'REFUNDED' ? 'rgba(183,28,28,0.08)' : 'rgba(62,39,35,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ReceiptLongOutlinedIcon sx={{
          fontSize: 20,
          color: tx.paymentStatus === 'REFUNDED' ? C.error : C.primary,
        }} />
      </div>

      {/* Center content */}
      <div style={{ flex: 1, minWidth: 0, alignSelf: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
            {productName}
          </span>
          <StatusBadge status={tx.paymentStatus} />
        </div>
        <div style={{ fontSize: 11, color: C.textDim, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p?.buyer?.name && <span>{p.buyer.name} · </span>}
          {p?.method && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              {METHOD_ICON[p.method]} {METHOD_LABEL[p.method]}
              {p.card ? ` ···· ${p.card.last4}` : ''}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 2, letterSpacing: '0.02em' }}>
          {tx.invoiceNo} · {date} {time}
        </div>
      </div>

      {/* Right: amount + nav arrow */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        justifyContent: 'space-between', flexShrink: 0, gap: 8, alignSelf: 'stretch',
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.textPri, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums', lineHeight: '22px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>$</span>
          {Number(tx.grandTotal ?? 0).toFixed(2)}
        </span>
        <span style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: C.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronRightIcon sx={{ fontSize: 18, color: '#fff' }} />
        </span>
      </div>
      </div>
      </CornerCard>
    </button>
  );
}

// ── Filter chip row ───────────────────────────────────────────────────────────
function ChipRow({ chips, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id === value ? '' : c.id)}
          style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 20,
            border: `1px solid ${value === c.id ? C.primary : C.border}`,
            background: value === c.id ? C.primary : C.surface,
            color: value === c.id ? '#fff' : C.textSec,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
            transition: 'all 0.15s',
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ── Pagination helpers ────────────────────────────────────────────────────────
function buildPageList(current, total) {
  if (total <= 1) return [];
  const delta = 1;
  const range = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  const pages = [1];
  if (range[0] > 2) pages.push('…');
  pages.push(...range);
  if (range[range.length - 1] < total - 1) pages.push('…');
  if (total > 1) pages.push(total);
  return pages;
}

function Pagination({ page, pages, onGoTo }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 0 4px', flexWrap: 'wrap' }}>
      {/* Prev */}
      <button
        onClick={() => onGoTo(page - 1)}
        disabled={page === 1}
        style={{
          width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${C.border}`, background: C.surface, cursor: page === 1 ? 'default' : 'pointer',
          opacity: page === 1 ? 0.35 : 1,
        }}
      >
        <ChevronLeftIcon sx={{ fontSize: 20, color: C.textSec }} />
      </button>

      {buildPageList(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`ell-${i}`} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: C.textDim, fontFamily: FONT }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onGoTo(p)}
            style={{
              width: 36, height: 36, borderRadius: 9,
              border: `1px solid ${p === page ? C.primary : C.border}`,
              background: p === page ? C.primary : C.surface,
              color: p === page ? '#fff' : C.textSec,
              fontSize: 13, fontWeight: p === page ? 800 : 600,
              cursor: p === page ? 'default' : 'pointer',
              fontFamily: FONT, transition: 'all 0.15s',
            }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onGoTo(page + 1)}
        disabled={page === pages}
        style={{
          width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${C.border}`, background: C.surface, cursor: page === pages ? 'default' : 'pointer',
          opacity: page === pages ? 0.35 : 1,
        }}
      >
        <ChevronRightIcon sx={{ fontSize: 20, color: C.textSec }} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const isPrivileged = user?.role === 'Manager' || user?.role === 'Admin';

  const [search, setSearch]       = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [method, setMethod]       = useState('');
  const [status, setStatus]       = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const debounceRef = useRef(null);

  const fetchTransactions = async (pageNum = 1) => {
    setLoading(true);
    setError('');
    const { startDate, endDate } = toDateRange(dateFilter);
    const params = new URLSearchParams({
      page: pageNum, limit: 20,
      ...(search.trim() && { search: search.trim() }),
      ...(method     && { method }),
      ...(status     && { status }),
      ...(startDate  && { startDate }),
      ...(endDate    && { endDate }),
    });
    try {
      const res = await fetch(`${API}/api/sales?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load transactions');
      const data = await res.json();
      // batch all state in one commit — setLoading here, not in finally
      setTransactions(data.transactions);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
      setLoading(false);
    } catch (e) {
      setError(e.message || 'Failed to load transactions');
      setLoading(false);
    }
  };

  // Single effect — search gets 380ms debounce, filter changes are immediate
  useEffect(() => {
    const delay = search.trim() ? 380 : 0;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTransactions(1), delay);
    return () => clearTimeout(debounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, method, status, search, token]);

  const goToPage = (p) => {
    if (p < 1 || p > pages || p === page) return;
    fetchTransactions(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToDetail = (tx) => {
    const basePath = user?.role === 'Manager' || user?.role === 'Admin'
      ? '/manager'
      : '/employee';
    navigate(`${basePath}/transactions/${tx._id}`);
  };

  const isEmpty = !loading && transactions.length === 0;

  const dateChips = isPrivileged ? DATE_CHIPS_FULL : DATE_CHIPS_EMPLOYEE;

  return (
    <div style={{ fontFamily: FONT, paddingBottom: 80 }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        padding: '14px 16px 0',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {isPrivileged ? 'All Transactions' : 'My Transactions'}
            </p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
              Transactions
              {total > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: C.textDim, marginLeft: 8 }}>{total}</span>}
            </h1>
          </div>
          <button
            onClick={() => setShowFilters((f) => !f)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 9,
              border: `1px solid ${showFilters ? C.primary : C.border}`,
              background: showFilters ? C.primary : C.surface,
              color: showFilters ? '#fff' : C.textSec,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <TuneOutlinedIcon sx={{ fontSize: 16 }} />
            Filter
          </button>
        </div>

        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '8px 12px', marginBottom: 10,
        }}>
          <SearchOutlinedIcon sx={{ fontSize: 18, color: C.textDim, flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, buyer name…"
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 13,
              fontWeight: 500, color: C.textPri, background: 'transparent',
              fontFamily: FONT,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <CloseOutlinedIcon sx={{ fontSize: 16, color: C.textDim }} />
            </button>
          )}
        </div>

        {/* Filter chips — expand on toggle */}
        {showFilters && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>
            <ChipRow chips={dateChips}    value={dateFilter} onChange={setDateFilter} />
            <ChipRow chips={METHOD_CHIPS} value={method}     onChange={setMethod} />
            <ChipRow chips={STATUS_CHIPS} value={status}     onChange={setStatus} />
          </div>
        )}
        {!showFilters && isPrivileged && (
          <div style={{ paddingBottom: 10 }}>
            <ChipRow chips={dateChips} value={dateFilter} onChange={setDateFilter} />
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Skeleton: only on initial empty load — not on refetch */}
        {loading && transactions.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            height: 82, borderRadius: 12, background: `linear-gradient(90deg, #EFE7E2 25%, #F5F0EC 50%, #EFE7E2 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            border: `1px solid ${C.border}`,
          }} />
        ))}

        {/* Error state */}
        {error && !loading && (
          <div style={{
            padding: '20px 16px', textAlign: 'center',
            background: 'rgba(183,28,28,0.06)', border: '1px solid rgba(183,28,28,0.20)',
            borderRadius: 12,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.error }}>{error}</p>
            <button
              onClick={() => fetchTransactions(1, false)}
              style={{ marginTop: 10, padding: '7px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !error && (
          <div style={{
            padding: '48px 24px', textAlign: 'center',
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
          }}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 40, color: C.textDim, display: 'block', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textSec }}>No transactions found</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDim }}>
              {search ? 'Try a different search or clear the filters.' : 'Transactions will appear here after the first sale.'}
            </p>
            {(search || method || status || dateFilter) && (
              <button
                onClick={() => { setSearch(''); setMethod(''); setStatus(''); setDateFilter(''); }}
                style={{ marginTop: 14, padding: '7px 18px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Transaction list — stays mounted; dims during refetch instead of swapping to skeleton */}
        {transactions.length > 0 && (
          <div style={{ opacity: loading ? 0.45 : 1, transition: 'opacity 0.2s', pointerEvents: loading ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transactions.map((tx) => (
              <TxCard key={tx._id} tx={tx} onClick={() => goToDetail(tx)} />
            ))}
            {pages > 1 && (
              <div style={{ marginTop: 4 }}>
                <Pagination page={page} pages={pages} onGoTo={goToPage} />
                <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 11, color: C.textDim, fontFamily: FONT }}>
                  Page {page} of {pages} · {total} transaction{total !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
