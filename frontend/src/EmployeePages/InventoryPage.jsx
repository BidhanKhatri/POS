import React, { useState, useEffect, useCallback } from 'react';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
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

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const totalCount = products.length;
  const lowCount   = products.filter(p => p.stockQty > 0 && p.stockQty <= LOW).length;
  const outCount   = products.filter(p => p.stockQty === 0).length;

  return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Inventory2OutlinedIcon sx={{ fontSize: 20, color: C.primary }} />
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, letterSpacing: '-0.2px' }}>
              Inventory
            </h1>
          </div>
          <button
            onClick={fetchProducts}
            style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              border: `1px solid ${C.border}`, background: C.surface,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 17, color: C.textDim }} />
          </button>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: C.textSec }}>
          View current stock levels and product details.
        </p>
      </div>

      {/* ── Stat strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Products',  value: totalCount, color: C.primary, iconBg: 'rgba(62,39,35,0.09)',  Icon: Inventory2OutlinedIcon   },
          { label: 'Low Stock', value: lowCount,   color: C.warning, iconBg: 'rgba(178,106,0,0.10)', Icon: WarningAmberOutlinedIcon },
          { label: 'Out',       value: outCount,   color: C.error,   iconBg: 'rgba(183,28,28,0.09)', Icon: ErrorOutlineOutlinedIcon },
        ].map(({ label, value, color, iconBg, Icon }) => (
          <CornerCard key={label} borderColor={C.border} cornerSize={18} cornerHeight={18} style={{ background: C.surface }}>
            <div style={{ padding: '11px 10px', display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon sx={{ fontSize: 16, color }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color, lineHeight: '22px', letterSpacing: '-0.2px' }}>{value}</p>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {label}
                </p>
              </div>
            </div>
          </CornerCard>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <SearchOutlinedIcon sx={{ fontSize: 18, color: C.textDim, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, SKU or barcode…"
          style={{
            width: '100%', padding: '9px 12px 9px 34px', borderRadius: 8,
            border: `1px solid ${C.border}`, fontSize: 13, color: C.textPri,
            background: C.surface, outline: 'none', boxSizing: 'border-box', fontFamily: FONT,
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
            <CloseOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
          </button>
        )}
      </div>

      {/* ── Error banner ── */}
      {pageErr && (
        <div style={{ background: 'rgba(183,28,28,0.08)', border: '1px solid rgba(183,28,28,0.22)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.error }}>
          {pageErr}
        </div>
      )}

      {/* ── Product table ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{
          background: C.tableHdr, borderBottom: `1px solid ${C.border}`,
          padding: '9px 14px',
          display: 'grid', gridTemplateColumns: '1fr 58px 66px',
          gap: 6, alignItems: 'center',
        }}>
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
            <p style={{ fontSize: 14, fontWeight: 700, color: C.textPri, margin: 0 }}>
              {search ? 'No products match your search' : 'No products configured'}
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: 0, maxWidth: 240, lineHeight: '18px' }}>
              {search ? 'Try a different name, SKU or barcode.' : 'Products will appear here once configured by a manager.'}
            </p>
          </div>
        ) : filtered.map((p, i) => (
          <div key={p._id} style={{
            padding: '11px 14px',
            borderBottom: i < filtered.length - 1 ? `1px solid #F0E8E4` : 'none',
            display: 'grid', gridTemplateColumns: '1fr 58px 66px',
            gap: 6, alignItems: 'center',
            background: i % 2 ? '#FDFCFB' : C.surface,
          }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
              </p>
              <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.04em' }}>
                {p.sku}{p.quickSlot ? ` · P${p.quickSlot}` : ''}
              </p>
            </div>

            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, lineHeight: '18px', color: p.stockQty === 0 ? C.error : p.stockQty <= LOW ? C.warning : C.textPri }}>
                {p.stockQty}
              </p>
              <StockPill qty={p.stockQty} />
            </div>

            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>
              ${p.price.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: C.textDim, textAlign: 'center' }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}{search ? ' matched' : ' total'}
          {lowCount > 0 && <span style={{ color: C.warning, fontWeight: 700 }}> · {lowCount} low stock</span>}
          {outCount > 0 && <span style={{ color: C.error, fontWeight: 700 }}> · {outCount} out of stock</span>}
        </p>
      )}

    </div>
  );
}
