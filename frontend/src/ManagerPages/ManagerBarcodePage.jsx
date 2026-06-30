import React, { useState, useEffect, useRef, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CloseIcon from '@mui/icons-material/Close';
import useAuthStore from '../store/useAuthStore';
import { API_URL as API_BASE } from '../config/api';

const C = {
  brown: '#3E2723',
  brownLight: '#6D4C41',
  bg: '#F5F3F1',
  white: '#ffffff',
  border: '#DDD2CC',
  muted: '#A09490',
  text: '#2B1D1A',
  accent: '#F2EBE5',
  green: '#2E7D32',
  greenBg: '#E8F5E9',
  greenBorder: '#A5D6A7',
  amber: '#E65100',
  amberBg: '#FFF3E0',
  red: '#C62828',
  redBg: '#FFEBEE',
};

// ── Inline barcode SVG component ──────────────────────────────────────────────
function BarcodeSVG({ value, height = 48 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.4,
        height,
        displayValue: false,
        margin: 4,
        background: 'transparent',
        lineColor: C.text,
      });
    } catch (_) {}
  }, [value, height]);

  return <svg ref={svgRef} style={{ display: 'block', maxWidth: '100%' }} />;
}

// ── Print a single barcode label as PDF ───────────────────────────────────────
async function printBarcodePDF(barcode) {
  return new Promise((resolve, reject) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    try {
      JsBarcode(svg, barcode.barcodeValue, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: false,
        margin: 6,
        background: '#ffffff',
        lineColor: '#2B1D1A',
      });
    } catch (err) {
      return reject(err);
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 300;
      canvas.height = img.height || 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const imgData = canvas.toDataURL('image/png');

      // Label: 62mm × 32mm
      const doc = new jsPDF({ unit: 'mm', format: [62, 32], orientation: 'landscape' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(43, 29, 26);

      const name = barcode.productName || '';
      const truncated = name.length > 38 ? name.slice(0, 36) + '…' : name;
      doc.text(truncated, 31, 5, { align: 'center' });

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 80, 75);
      doc.text(`SKU: ${barcode.sku}`, 31, 9, { align: 'center' });

      doc.addImage(imgData, 'PNG', 6, 11, 50, 14);

      doc.setFontSize(6);
      doc.setFont('courier', 'bold');
      doc.setTextColor(43, 29, 26);
      doc.text(barcode.barcodeValue, 31, 28, { align: 'center' });

      doc.save(`barcode-${barcode.sku}.pdf`);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render barcode image'));
    };
    img.src = url;
  });
}

// ── Toast notification ─────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'error' ? C.red : type === 'warn' ? C.amber : C.green;

  return (
    <div style={{
      position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
      background: bg, color: '#fff',
      padding: '10px 18px', borderRadius: 12,
      fontSize: 13, fontWeight: 700,
      boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8,
      maxWidth: 'calc(100vw - 32px)',
    }}>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}>
        <CloseIcon sx={{ fontSize: 15 }} />
      </button>
    </div>
  );
}

// ── Product row (Generate tab) ─────────────────────────────────────────────────
function ProductRow({ product, token, onGenerated }) {
  const [busy, setBusy] = useState(false);
  const hasBarcode = Boolean(product.barcodeRecord);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/barcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate barcode');
      onGenerated({ type: 'success', message: `Barcode generated for ${product.name}` });
    } catch (err) {
      onGenerated({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Status indicator */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: hasBarcode ? C.green : C.muted,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: C.muted, fontWeight: 500 }}>
          SKU: {product.sku} · ${Number(product.price).toFixed(2)}
        </p>
        {hasBarcode && (
          <p style={{ margin: '2px 0 0', fontSize: 10, color: C.green, fontWeight: 600, fontFamily: 'monospace' }}>
            {product.barcodeRecord.barcodeValue}
          </p>
        )}
      </div>

      {hasBarcode ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 14, color: C.green }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>Generated</span>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={busy}
          style={{
            padding: '7px 12px',
            background: busy ? C.muted : C.brown,
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            flexShrink: 0,
          }}
        >
          <AddCircleOutlineIcon sx={{ fontSize: 13 }} />
          {busy ? 'Generating…' : 'Generate'}
        </button>
      )}
    </div>
  );
}

// ── Barcode card (List tab) ────────────────────────────────────────────────────
function BarcodeCard({ barcode, token, onAction }) {
  const [busy, setBusy] = useState(false);

  const regenerate = async () => {
    if (!window.confirm(`Regenerate barcode for ${barcode.productName}? The old barcode will stop working.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/barcodes/${barcode._id}/regenerate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Regeneration failed');
      onAction({ type: 'success', message: `Barcode regenerated for ${barcode.productName}`, refresh: true });
    } catch (err) {
      onAction({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const print = async () => {
    setBusy(true);
    try {
      await printBarcodePDF(barcode);
      // Track print in backend
      await fetch(`${API_BASE}/api/barcodes/${barcode._id}/print`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      onAction({ type: 'success', message: 'Label downloaded' });
    } catch (err) {
      onAction({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      background: C.white, borderRadius: 12,
      border: `1px solid ${C.border}`,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header row */}
      <div style={{
        padding: '12px 16px',
        background: C.accent,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 800, color: C.text }}>
            {barcode.productName}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.muted, fontWeight: 500 }}>
            SKU: {barcode.sku}
          </p>
        </div>
        <div style={{
          background: C.greenBg, border: `1px solid ${C.greenBorder}`,
          borderRadius: 20, padding: '3px 9px',
          fontSize: 10, fontWeight: 700, color: C.green,
        }}>
          CODE128
        </div>
      </div>

      {/* Barcode visual */}
      <div style={{
        padding: '14px 16px',
        display: 'flex', justifyContent: 'center',
        background: '#FAFAF9',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <BarcodeSVG value={barcode.barcodeValue} height={52} />
      </div>

      {/* Info grid */}
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderBottom: `1px solid ${C.border}` }}>
        <MiniInfo label="Barcode Value" value={barcode.barcodeValue} mono />
        <MiniInfo label="Generated" value={new Date(barcode.createdAt).toLocaleDateString()} />
        <MiniInfo label="By" value={barcode.generatedBy?.name || '—'} />
        <MiniInfo label="Print Count" value={barcode.printCount ?? 0} />
        {barcode.lastPrintedAt && (
          <MiniInfo label="Last Printed" value={new Date(barcode.lastPrintedAt).toLocaleDateString()} />
        )}
        {barcode.regenerationHistory?.length > 0 && (
          <MiniInfo label="Regenerated" value={`${barcode.regenerationHistory.length}×`} />
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
        <button
          onClick={print}
          disabled={busy}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 0',
            background: C.brown, color: '#fff',
            border: 'none', borderRadius: 9,
            fontSize: 12, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          <PrintOutlinedIcon sx={{ fontSize: 14 }} />
          Print Label
        </button>
        <button
          onClick={regenerate}
          disabled={busy}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 0',
            background: C.white, color: C.brownLight,
            border: `1.5px solid ${C.border}`, borderRadius: 9,
            fontSize: 12, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          <RefreshOutlinedIcon sx={{ fontSize: 14 }} />
          Regenerate
        </button>
      </div>
    </div>
  );
}

function MiniInfo({ label, value, mono }) {
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ManagerBarcodePage() {
  const { token } = useAuthStore();
  const [tab, setTab] = useState('list'); // 'list' | 'generate'
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // List tab state
  const [barcodes, setBarcodes] = useState([]);
  const [barcodesTotal, setBarcodesTotal] = useState(0);
  const [barcodesPage, setBarcodesPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Generate tab state
  const [products, setProducts] = useState([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsPage, setProductsPage] = useState(1);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState('');

  const searchInitRef = useRef(false);

  const showToast = useCallback((t) => setToast(t), []);

  // ── Fetch barcodes ─────────────────────────────────────────────────────────
  const fetchBarcodes = useCallback(async (page = 1, q = '') => {
    setListLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams({ page, limit: 20, ...(q && { search: q }) });
      const res = await fetch(`${API_BASE}/api/barcodes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load barcodes');
      setBarcodes(data.barcodes);
      setBarcodesTotal(data.total);
      setBarcodesPage(page);
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  }, [token]);

  // ── Fetch products with barcode status ─────────────────────────────────────
  const fetchProducts = useCallback(async (page = 1, q = '') => {
    setProdLoading(true);
    setProdError('');
    try {
      const params = new URLSearchParams({ page, limit: 20, ...(q && { search: q }) });
      const res = await fetch(`${API_BASE}/api/barcodes/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load products');
      setProducts(data.products);
      setProductsTotal(data.total);
      setProductsPage(page);
    } catch (err) {
      setProdError(err.message);
    } finally {
      setProdLoading(false);
    }
  }, [token]);

  // Load data on tab change / mount
  useEffect(() => {
    if (tab === 'list') fetchBarcodes(1, '');
    else fetchProducts(1, '');
    setSearch('');
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search debounce (skip on first mount — tab effect handles initial load) ──
  useEffect(() => {
    if (!searchInitRef.current) { searchInitRef.current = true; return; }
    const t = setTimeout(() => {
      if (tab === 'list') fetchBarcodes(1, search);
      else fetchProducts(1, search);
    }, 320);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = useCallback(({ type, message, refresh }) => {
    showToast({ type, message });
    if (refresh) {
      if (tab === 'list') fetchBarcodes(barcodesPage, search);
      else fetchProducts(productsPage, search);
    }
  }, [tab, barcodesPage, productsPage, search, fetchBarcodes, fetchProducts, showToast]);

  const handleGenerated = useCallback(({ type, message }) => {
    showToast({ type, message });
    // Refresh both tabs
    fetchProducts(productsPage, search);
    if (tab === 'list') fetchBarcodes(1, search);
  }, [productsPage, search, tab, fetchProducts, fetchBarcodes, showToast]);

  const hasPrev = tab === 'list' ? barcodesPage > 1 : productsPage > 1;
  const hasNext = tab === 'list'
    ? barcodesPage * 20 < barcodesTotal
    : productsPage * 20 < productsTotal;
  const total = tab === 'list' ? barcodesTotal : productsTotal;
  const page = tab === 'list' ? barcodesPage : productsPage;
  const loading = tab === 'list' ? listLoading : prodLoading;
  const pageError = tab === 'list' ? listError : prodError;

  const prev = () => {
    const p = page - 1;
    if (tab === 'list') fetchBarcodes(p, search);
    else fetchProducts(p, search);
  };
  const next = () => {
    const p = page + 1;
    if (tab === 'list') fetchBarcodes(p, search);
    else fetchProducts(p, search);
  };

  return (
    <div style={{
      padding: '0 0 32px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: C.bg,
      minHeight: '100dvh',
    }}>

      {/* Header */}
      <div style={{
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        padding: '20px 24px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: C.brown,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <QrCodeScannerIcon sx={{ fontSize: 18, color: '#D4A373' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Barcode Management</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{total} record{total !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { key: 'list', label: 'Barcode List' },
            { key: 'generate', label: 'Generate / Products' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '9px 18px',
                background: 'none', border: 'none',
                borderBottom: tab === key ? `2.5px solid ${C.brown}` : '2.5px solid transparent',
                color: tab === key ? C.brown : C.muted,
                fontSize: 13, fontWeight: tab === key ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: C.white, borderRadius: 11,
          border: `1px solid ${C.border}`,
          padding: '0 14px',
          marginBottom: 14,
        }}>
          <SearchIcon sx={{ fontSize: 18, color: C.muted }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'list' ? 'Search by product, SKU, or barcode…' : 'Search products…'}
            style={{
              flex: 1, padding: '11px 0',
              border: 'none', outline: 'none',
              fontSize: 13, fontWeight: 500, color: C.text,
              background: 'transparent', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <CloseIcon sx={{ fontSize: 15, color: C.muted }} />
            </button>
          )}
        </div>

        {/* Error */}
        {pageError && (
          <div style={{ background: C.redBg, borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, fontWeight: 600, color: C.red }}>
            {pageError}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, height: 80, opacity: 0.5 }} />
            ))}
          </div>
        )}

        {/* ── LIST TAB ─────────────────────────────────────────────────────── */}
        {!loading && tab === 'list' && (
          <>
            {barcodes.length === 0 ? (
              <EmptyState
                icon={<QrCodeScannerIcon sx={{ fontSize: 36, color: C.muted }} />}
                title={search ? 'No barcodes found' : 'No barcodes yet'}
                sub={search ? 'Try a different search' : 'Switch to "Generate / Products" to create barcodes'}
              />
            ) : (
              barcodes.map((b) => (
                <BarcodeCard key={b._id} barcode={b} token={token} onAction={handleAction} />
              ))
            )}
          </>
        )}

        {/* ── GENERATE TAB ─────────────────────────────────────────────────── */}
        {!loading && tab === 'generate' && (
          <>
            {/* Legend */}
            <div style={{
              display: 'flex', gap: 16, marginBottom: 12,
              padding: '10px 14px',
              background: C.white, borderRadius: 10, border: `1px solid ${C.border}`,
              fontSize: 11, fontWeight: 600, color: C.muted,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
                Has barcode
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.muted, display: 'inline-block' }} />
                Needs barcode
              </span>
            </div>

            {products.length === 0 ? (
              <EmptyState
                icon={<Inventory2OutlinedIcon sx={{ fontSize: 36, color: C.muted }} />}
                title={search ? 'No products found' : 'No products in inventory'}
                sub={search ? 'Try a different search' : 'Add products to inventory first'}
              />
            ) : (
              <div style={{
                background: C.white, borderRadius: 12,
                border: `1px solid ${C.border}`,
                overflow: 'hidden',
                marginBottom: 14,
              }}>
                {products.map((p) => (
                  <ProductRow key={p._id} product={p} token={token} onGenerated={handleGenerated} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {!loading && total > 20 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', marginTop: 8,
          }}>
            <button
              onClick={prev}
              disabled={!hasPrev}
              style={{
                padding: '8px 18px',
                background: hasPrev ? C.brown : C.bg,
                color: hasPrev ? '#fff' : C.muted,
                border: `1px solid ${hasPrev ? C.brown : C.border}`,
                borderRadius: 9,
                fontSize: 12, fontWeight: 700,
                cursor: hasPrev ? 'pointer' : 'not-allowed',
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
              Page {page} · {total} total
            </span>
            <button
              onClick={next}
              disabled={!hasNext}
              style={{
                padding: '8px 18px',
                background: hasNext ? C.brown : C.bg,
                color: hasNext ? '#fff' : C.muted,
                border: `1px solid ${hasNext ? C.brown : C.border}`,
                borderRadius: 9,
                fontSize: 12, fontWeight: 700,
                cursor: hasNext ? 'pointer' : 'not-allowed',
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{
      background: C.white, borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: '40px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      marginBottom: 14,
    }}>
      {icon}
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{title}</p>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, textAlign: 'center' }}>{sub}</p>
    </div>
  );
}
