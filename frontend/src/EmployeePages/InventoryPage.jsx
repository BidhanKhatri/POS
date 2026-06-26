import React, { useState, useEffect, useCallback } from 'react';
import { useMediaQuery } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import QrCodeOutlinedIcon from '@mui/icons-material/QrCodeOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';
import { useSocketEvent } from '../context/SocketContext';
import { EVENTS } from '../socket/events';

const API = import.meta.env.VITE_API_BASE_URL ?? '';
const LOW = 5;
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  bg: '#F5F3F1', surface: '#ffffff', border: '#DDD2CC',
  hover: '#F3EDE9', textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9',
};

function StockPill({ qty }) {
  if (qty === 0) return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(183,28,28,0.10)', color: C.error }}>OUT</span>;
  if (qty <= LOW) return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(178,106,0,0.10)', color: C.warning }}>LOW</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(46,125,79,0.10)', color: C.success }}>OK</span>;
}

export default function InventoryPage() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageErr, setPageErr] = useState('');
  const [stockTracking, setStockTracking] = useState(true);
  const isDesktop = useMediaQuery('(min-width:1024px)');

  useEffect(() => {
    fetch(`${API}/api/settings/stock-tracking`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setStockTracking(d.stockTrackingEnabled ?? true))
      .catch(() => {});
  }, [token]);

  const fetchProducts = useCallback(async () => {
    setLoading(true); setPageErr('');
    try {
      const res = await fetch(`${API}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load inventory');
      setProducts(await res.json());
    } catch (e) { setPageErr(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Real-time: update stock qty in-place when a barcode sync comes in,
  // and refresh the full list on a low-stock alert
  useSocketEvent(EVENTS.BARCODE_STOCK_SYNC, ({ productId, stockQty }) => {
    setProducts((prev) =>
      prev.map((p) => p._id === productId ? { ...p, stockQty } : p)
    );
  });
  useSocketEvent(EVENTS.INVENTORY_LOWSTOCK, () => fetchProducts());

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const totalCount = products.length;
  const lowCount   = products.filter(p => p.stockQty > 0 && p.stockQty <= LOW).length;
  const outCount   = products.filter(p => p.stockQty === 0).length;
  const okCount    = products.filter(p => p.stockQty > LOW).length;

  const STATS = [
    { label: 'Total Items', value: totalCount,                           color: C.primary,                            iconBg: 'rgba(62,39,35,0.09)',                        Icon: Inventory2OutlinedIcon   },
    { label: 'In Stock',       value: stockTracking ? okCount  : '—',       color: stockTracking ? C.success : C.textDim, iconBg: stockTracking ? 'rgba(46,125,79,0.10)' : C.elevated, Icon: Inventory2OutlinedIcon   },
    { label: 'Low Stock',      value: stockTracking ? lowCount : '—',       color: stockTracking ? C.warning : C.textDim, iconBg: stockTracking ? 'rgba(178,106,0,0.10)' : C.elevated, Icon: WarningAmberOutlinedIcon },
    { label: 'Out of Stock',   value: stockTracking ? outCount : '—',       color: stockTracking ? C.error   : C.textDim, iconBg: stockTracking ? 'rgba(183,28,28,0.09)' : C.elevated, Icon: ErrorOutlineOutlinedIcon },
  ];

  const disabledBanner = !stockTracking && (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'rgba(178,106,0,0.07)', border: '1px solid rgba(178,106,0,0.25)',
      borderRadius: 10, padding: '10px 14px', marginBottom: 14,
    }}>
      <BlockOutlinedIcon sx={{ fontSize: 16, color: C.warning, flexShrink: 0, marginTop: '1px' }} />
      <p style={{ margin: 0, fontSize: 12, color: '#7A4F00', fontWeight: 500, lineHeight: '18px', fontFamily: FONT }}>
        <strong>Stock Tracking Disabled</strong> — quantity levels are not being updated. Product and price information remain active.
      </p>
    </div>
  );

  // ── Mobile layout ────────────────────────────────────────────────────────────
  if (!isDesktop) {
    return (
      <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>

        {/* Page header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 20, color: C.primary }} />
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>Inventory</h1>
            </div>
            <button onClick={fetchProducts} style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshOutlinedIcon sx={{ fontSize: 17, color: C.textDim }} />
            </button>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>View current stock levels and product details.</p>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {STATS.slice(0, 3).map(({ label, value, color, iconBg, Icon }) => (
            <CornerCard key={label} borderColor={C.border} cornerSize={18} cornerHeight={18} style={{ background: C.surface }}>
              <div style={{ padding: '11px 10px', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon sx={{ fontSize: 16, color }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color, lineHeight: '22px', letterSpacing: '-0.2px' }}>{value}</p>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</p>
                </div>
              </div>
            </CornerCard>
          ))}
        </div>

        {/* Disabled banner */}
        {disabledBanner}

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <SearchOutlinedIcon sx={{ fontSize: 18, color: C.textDim, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SKU or barcode…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, background: C.surface, outline: 'none', boxSizing: 'border-box', fontFamily: FONT }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
              <CloseOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
            </button>
          )}
        </div>

        {/* Error */}
        {pageErr && (
          <div style={{ background: 'rgba(183,28,28,0.08)', border: '1px solid rgba(183,28,28,0.22)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.error }}>{pageErr}</div>
        )}

        {/* Table */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: C.tableHdr, borderBottom: `1px solid ${C.border}`, padding: '9px 14px', display: 'grid', gridTemplateColumns: '1fr 58px 66px', gap: 6, alignItems: 'center' }}>
            {['Product', 'Stock', 'Price'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>
          {loading ? (
            <div style={{ padding: '44px 24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Inventory2OutlinedIcon sx={{ fontSize: 26, color: C.primary }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.textPri, margin: 0 }}>{search ? 'No products match your search' : 'No products configured'}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: 0, maxWidth: 240, lineHeight: '18px' }}>{search ? 'Try a different name, SKU or barcode.' : 'Products will appear here once configured by a manager.'}</p>
            </div>
          ) : filtered.map((p, i) => (
            <div key={p._id} style={{ padding: '11px 14px', borderBottom: i < filtered.length - 1 ? `1px solid #F0E8E4` : 'none', display: 'grid', gridTemplateColumns: '1fr 58px 66px', gap: 6, alignItems: 'center', background: i % 2 ? '#FDFCFB' : C.surface }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.04em' }}>{p.sku}{p.quickSlot ? ` · P${p.quickSlot}` : ''}</p>
              </div>
              <div>
                {stockTracking ? (
                  <>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, lineHeight: '18px', color: p.stockQty === 0 ? C.error : p.stockQty <= LOW ? C.warning : C.textPri }}>{p.stockQty}</p>
                    <StockPill qty={p.stockQty} />
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textDim }}>—</p>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>${p.price.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {filtered.length > 0 && (
          <p style={{ margin: '10px 0 0', fontSize: 11, color: C.textDim, textAlign: 'center' }}>
            {filtered.length} product{filtered.length !== 1 ? 's' : ''}{search ? ' matched' : ' total'}
            {stockTracking && lowCount > 0 && <span style={{ color: C.warning, fontWeight: 700 }}> · {lowCount} low stock</span>}
            {stockTracking && outCount > 0 && <span style={{ color: C.error, fontWeight: 700 }}> · {outCount} out of stock</span>}
            {!stockTracking && <span style={{ color: C.textDim }}> · stock tracking disabled</span>}
          </p>
        )}
      </div>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px 40px', fontFamily: FONT, background: C.bg, minHeight: '100dvh' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 19, color: '#D4A373' }} />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>Inventory</h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textSec }}>
            View current stock levels and product details across all items.
          </p>
        </div>
        <button
          onClick={fetchProducts}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 9,
            border: `1px solid ${C.border}`, background: C.surface,
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.textSec,
          }}
        >
          <RefreshOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {STATS.map(({ label, value, color, iconBg, Icon }) => (
          <CornerCard key={label} borderColor={C.border} cornerSize={20} cornerHeight={20} style={{ background: C.surface }}>
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon sx={{ fontSize: 22, color }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color, lineHeight: '32px', letterSpacing: '-0.5px' }}>{value}</p>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
              </div>
            </div>
          </CornerCard>
        ))}
      </div>

      {/* Disabled banner */}
      {disabledBanner}

      {/* Search + error */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <SearchOutlinedIcon sx={{ fontSize: 18, color: C.textDim, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU or barcode…"
            style={{ width: '100%', padding: '10px 36px 10px 38px', borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri, background: C.surface, outline: 'none', boxSizing: 'border-box', fontFamily: FONT }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
              <CloseOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
            </button>
          )}
        </div>
        {pageErr && (
          <div style={{ marginTop: 10, background: 'rgba(183,28,28,0.08)', border: '1px solid rgba(183,28,28,0.22)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.error }}>{pageErr}</div>
        )}
      </div>

      {/* Product table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{
          background: C.tableHdr, borderBottom: `1px solid ${C.border}`,
          padding: '11px 20px',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 120px 90px 90px 80px',
          gap: 12, alignItems: 'center',
        }}>
          {['Product', 'SKU', 'Barcode', 'Slot', 'Stock', 'Price'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Loading inventory…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: C.elevated, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 30, color: C.primary }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.textPri, margin: 0 }}>
              {search ? 'No products match your search' : 'No products configured'}
            </p>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.textSec, margin: 0, maxWidth: 280, lineHeight: '20px' }}>
              {search ? 'Try a different name, SKU or barcode.' : 'Products will appear here once configured by a manager.'}
            </p>
          </div>
        ) : filtered.map((p, i) => (
          <div key={p._id} style={{
            padding: '13px 20px',
            borderBottom: i < filtered.length - 1 ? `1px solid #F0E8E4` : 'none',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 120px 90px 90px 80px',
            gap: 12, alignItems: 'center',
            background: i % 2 ? '#FDFCFB' : C.surface,
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.hover}
            onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#FDFCFB' : C.surface}
          >
            {/* Name + active badge */}
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: C.elevated, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Inventory2OutlinedIcon sx={{ fontSize: 16, color: C.primary }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                {p.isActive === false && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: 'rgba(183,28,28,0.09)', color: C.error }}>INACTIVE</span>
                )}
              </div>
            </div>

            {/* SKU */}
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDim, fontFamily: 'monospace', letterSpacing: '0.04em' }}>{p.sku}</p>

            {/* Barcode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
              {p.barcode ? (
                <>
                  <QrCodeOutlinedIcon sx={{ fontSize: 13, color: C.success, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.barcode}</span>
                </>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>—</span>
              )}
            </div>

            {/* Quick slot */}
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: p.quickSlot ? C.textPri : C.textDim }}>
              {p.quickSlot ? `P${p.quickSlot}` : '—'}
            </p>

            {/* Stock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {stockTracking ? (
                <>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: p.stockQty === 0 ? C.error : p.stockQty <= LOW ? C.warning : C.textPri }}>{p.stockQty}</p>
                  <StockPill qty={p.stockQty} />
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textDim }}>—</p>
              )}
            </div>

            {/* Price */}
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>${p.price.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <p style={{ margin: '12px 0 0', fontSize: 12, color: C.textDim }}>
          Showing {filtered.length} of {totalCount} product{totalCount !== 1 ? 's' : ''}
          {search && ' matching search'}
          {stockTracking && lowCount > 0 && <span style={{ color: C.warning, fontWeight: 700 }}> · {lowCount} low stock</span>}
          {stockTracking && outCount > 0 && <span style={{ color: C.error, fontWeight: 700 }}> · {outCount} out of stock</span>}
          {!stockTracking && <span style={{ color: C.textDim }}> · stock tracking disabled</span>}
        </p>
      )}
    </div>
  );
}
