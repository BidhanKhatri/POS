import React, { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import { useMediaQuery } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import useAuthStore from '../store/useAuthStore';

const API = import.meta.env.VITE_API_BASE_URL ?? '';
const LOW = 5;

const C = {
  bg: '#F5F3F1', surface: '#ffffff', border: '#DDD2CC',
  hover: '#F3EDE9', textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C', info: '#0277BD',
  elevated: '#EFE7E2', tableHdr: '#F3EDE9',
};

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 14, color: C.textPri,
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
};

const ALL_TABS = [
  { id: 'stock',   label: 'Stk Move'    },
  { id: 'history', label: 'Move Hstry'  },
  { id: 'edit',    label: 'Edit Product' },
  { id: 'delete',  label: 'Delete'      },
];

const MOV_COLOR = { RESTOCK: C.success, ADJUSTMENT: C.info, SALE: C.error, VOID: C.warning, REFUND: C.textSec };

function StockPill({ qty }) {
  if (qty === 0) return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(183,28,28,0.10)', color: C.error }}>OUT</span>;
  if (qty <= LOW) return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(178,106,0,0.10)', color: C.warning }}>LOW</span>;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(46,125,79,0.10)', color: C.success }}>OK</span>;
}

/* ── Unified Product Actions Dialog ─────────────────────────────── */
function ProductActionsDialog({ open, product, token, onClose, onRefresh, stockTracking = true }) {
  const TABS = ALL_TABS.filter(t => stockTracking || t.id !== 'stock');
  const [tab, setTab] = useState('history');

  const [moveType, setMoveType] = useState('RESTOCK');
  const [moveQty, setMoveQty] = useState('');
  const [moveRemarks, setMoveRemarks] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveErr, setMoveErr] = useState('');

  const [movements, setMovements] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState('');

  const [deleting, setDeleting] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!open || !product) return;
    setTab(stockTracking ? 'stock' : 'history');
    setMoveType('RESTOCK'); setMoveQty(''); setMoveRemarks(''); setMoveErr('');
    setMovements([]); setHistLoading(false);
    setEditForm({
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      price: product.price ?? '',
      costPrice: product.costPrice ?? '',
      quickSlot: product.quickSlot || '',
    });
    setEditErr('');
  }, [open, product?._id]);

  useEffect(() => {
    if (tab !== 'history' || !product || movements.length > 0) return;
    setHistLoading(true);
    fetch(`${API}/api/products/${product._id}/movements`, { headers })
      .then(r => r.json())
      .then(d => { setMovements(Array.isArray(d) ? d : []); setHistLoading(false); })
      .catch(() => setHistLoading(false));
  }, [tab]);

  const submitStockMove = async () => {
    const n = parseInt(moveQty, 10);
    if (!moveQty || isNaN(n) || n <= 0) { setMoveErr('Enter a valid quantity greater than 0.'); return; }
    if (moveType === 'ADJUSTMENT' && n > (product?.stockQty || 0)) { setMoveErr('Cannot remove more than current stock.'); return; }
    setMoveSaving(true); setMoveErr('');
    try {
      const res = await fetch(`${API}/api/products/${product._id}/stock`, {
        method: 'POST', headers,
        body: JSON.stringify({ movementType: moveType, quantity: n, remarks: moveRemarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      onRefresh(); onClose();
    } catch (e) { setMoveErr(e.message); }
    finally { setMoveSaving(false); }
  };

  const submitEdit = async () => {
    if (!editForm.name?.trim() || !editForm.sku?.trim() || editForm.price === '' || editForm.costPrice === '') {
      setEditErr('Name, SKU, Sell Price and Cost Price are required.'); return;
    }
    setEditSaving(true); setEditErr('');
    try {
      const payload = {
        name: editForm.name.trim(),
        sku: editForm.sku.trim().toUpperCase(),
        price: parseFloat(editForm.price),
        costPrice: parseFloat(editForm.costPrice),
        quickSlot: editForm.quickSlot ? parseInt(editForm.quickSlot, 10) : undefined,
      };
      if (editForm.barcode?.trim()) payload.barcode = editForm.barcode.trim();
      const res = await fetch(`${API}/api/products/${product._id}`, {
        method: 'PUT', headers, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      onRefresh(); onClose();
    } catch (e) { setEditErr(e.message); }
    finally { setEditSaving(false); }
  };

  const submitDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/products/${product._id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      onRefresh(); onClose();
    } catch { /* silent */ }
    finally { setDeleting(false); }
  };

  if (!product) return null;

  const movePreview = moveQty && !isNaN(parseInt(moveQty))
    ? (moveType === 'RESTOCK'
        ? (product.stockQty || 0) + parseInt(moveQty)
        : Math.max(0, (product.stockQty || 0) - parseInt(moveQty)))
    : null;

  const ef = (k) => (e) => setEditForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        style: {
          borderRadius: 16,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflow: 'hidden',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <div style={{
        padding: '16px 16px 0',
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {product.name}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: C.textSec }}>
              SKU: <strong>{product.sku}</strong>
              {product.quickSlot ? ` · Slot P${product.quickSlot}` : ''}
              {' · '}
              {stockTracking ? (
                <span style={{ fontWeight: 700, color: product.stockQty === 0 ? C.error : product.stockQty <= LOW ? C.warning : C.success }}>
                  {product.stockQty} in stock
                </span>
              ) : (
                <span style={{ fontWeight: 700, color: C.textDim }}>tracking disabled</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, marginLeft: 8 }}
          >
            <CloseOutlinedIcon sx={{ fontSize: 20, color: C.textDim }} />
          </button>
        </div>

        <div style={{ display: 'flex' }}>
          {TABS.map(({ id, label }) => {
            const active = tab === id;
            const isDel = id === 'delete';
            const activeColor = isDel ? C.error : C.primary;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? `2px solid ${activeColor}` : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: active ? 800 : 600,
                  color: active ? activeColor : C.textDim,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>

        {tab === 'stock' && (
          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {moveErr && (
              <div style={{ background: 'rgba(183,28,28,0.08)', border: '1px solid rgba(183,28,28,0.22)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.error }}>
                {moveErr}
              </div>
            )}

            <div>
              <label style={labelStyle}>Movement Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { type: 'RESTOCK',    label: 'Stock In',  color: C.success, Icon: AddCircleOutlineOutlinedIcon    },
                  { type: 'ADJUSTMENT', label: 'Stock Out', color: C.error,   Icon: RemoveCircleOutlineOutlinedIcon },
                ].map(({ type: t, label, color, Icon }) => (
                  <button key={t} onClick={() => setMoveType(t)} style={{
                    flex: 1, padding: '12px 8px', borderRadius: 9, cursor: 'pointer',
                    border: moveType === t ? `2px solid ${color}` : `1px solid ${C.border}`,
                    background: moveType === t ? `${color}10` : '#fff',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s',
                  }}>
                    <Icon sx={{ fontSize: 22, color: moveType === t ? color : C.textDim }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: moveType === t ? color : C.textSec }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Quantity *</label>
              <input style={inputStyle} type="number" min="1" value={moveQty} onChange={e => setMoveQty(e.target.value)} placeholder="Enter quantity" />
            </div>

            <div>
              <label style={labelStyle}>Remarks</label>
              <input style={inputStyle} value={moveRemarks} onChange={e => setMoveRemarks(e.target.value)} placeholder="e.g. Supplier delivery" />
            </div>

            {movePreview !== null && (
              <div style={{ background: C.hover, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>Stock after movement</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: movePreview === 0 ? C.error : movePreview <= LOW ? C.warning : C.success }}>
                  {movePreview}
                </span>
              </div>
            )}

            <button
              onClick={submitStockMove}
              disabled={moveSaving}
              style={{
                width: '100%', padding: '12px', borderRadius: 9, border: 'none',
                background: moveType === 'RESTOCK' ? C.success : C.error,
                fontSize: 14, fontWeight: 700, color: '#fff',
                cursor: moveSaving ? 'not-allowed' : 'pointer', opacity: moveSaving ? 0.7 : 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {moveSaving ? 'Saving…' : moveType === 'RESTOCK' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        )}

        {tab === 'history' && (
          histLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Loading…</div>
          ) : movements.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <HistoryOutlinedIcon sx={{ fontSize: 34, color: C.textDim, display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>No movement history yet</p>
            </div>
          ) : (
            movements.map((m, i) => {
              const isPos = m.quantity > 0;
              const col = MOV_COLOR[m.movementType] || C.textDim;
              return (
                <div key={m._id || i} style={{
                  padding: '12px 16px',
                  borderBottom: i < movements.length - 1 ? '1px solid #F0E8E4' : 'none',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 6,
                    background: `${col}18`, color: col, letterSpacing: '0.05em', flexShrink: 0,
                  }}>
                    {m.movementType}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>
                      <span style={{ color: isPos ? C.success : C.error }}>{isPos ? '+' : ''}{m.quantity}</span>
                      {m.remarks && <span style={{ fontWeight: 400, color: C.textSec }}> · {m.remarks}</span>}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: C.textDim }}>
                      {m.beforeQty} → {m.afterQty} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )
        )}

        {tab === 'edit' && (
          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {editErr && (
              <div style={{ background: 'rgba(183,28,28,0.08)', border: '1px solid rgba(183,28,28,0.22)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.error }}>
                {editErr}
              </div>
            )}

            <div>
              <label style={labelStyle}>Product Name *</label>
              <input style={inputStyle} value={editForm.name || ''} onChange={ef('name')} placeholder="e.g. Coca Cola 500ml" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>SKU *</label>
                <input style={inputStyle} value={editForm.sku || ''} onChange={ef('sku')} />
              </div>
              <div>
                <label style={labelStyle}>Barcode</label>
                <input style={inputStyle} value={editForm.barcode || ''} onChange={ef('barcode')} placeholder="Optional" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Sell Price *</label>
                <input style={inputStyle} type="number" min="0" step="0.01" value={editForm.price ?? ''} onChange={ef('price')} />
              </div>
              <div>
                <label style={labelStyle}>Cost Price *</label>
                <input style={inputStyle} type="number" min="0" step="0.01" value={editForm.costPrice ?? ''} onChange={ef('costPrice')} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Quick Slot (1–9)</label>
              <input style={inputStyle} type="number" min="1" max="9" value={editForm.quickSlot || ''} onChange={ef('quickSlot')} placeholder="Optional POS quick button" />
            </div>

            <p style={{ margin: 0, fontSize: 11, color: C.textDim, lineHeight: '16px' }}>
              To adjust stock levels, use the Stk Move tab.
            </p>

            <button
              onClick={submitEdit}
              disabled={editSaving}
              style={{
                width: '100%', padding: '12px', borderRadius: 9, border: 'none',
                background: C.primary, fontSize: 14, fontWeight: 700, color: '#fff',
                cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {tab === 'delete' && (
          <div style={{ padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(183,28,28,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 30, color: C.error }} />
            </div>

            <div>
              <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: C.textPri }}>Remove Product?</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textSec, lineHeight: '20px', maxWidth: 280 }}>
                <strong>{product.name}</strong> will be deactivated and hidden from the POS terminal. All sales history is preserved and can be restored by an Admin.
              </p>
            </div>

            <div style={{
              width: '100%', background: '#FFF5F5', border: '1px solid rgba(183,28,28,0.18)',
              borderRadius: 10, padding: '12px 14px', textAlign: 'left',
            }}>
              {stockTracking && (
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.error }}>
                  · Current stock of <strong>{product.stockQty}</strong> units will no longer be tracked
                </p>
              )}
              <p style={{ margin: stockTracking ? '4px 0 0' : 0, fontSize: 12, fontWeight: 600, color: C.error }}>
                · This action can be reversed by contacting an Admin
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button onClick={onClose} style={{
                flex: 1, padding: '12px', borderRadius: 9, border: `1px solid ${C.border}`,
                background: '#fff', fontSize: 14, fontWeight: 600, color: C.textSec, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                Cancel
              </button>
              <button onClick={submitDelete} disabled={deleting} style={{
                flex: 1, padding: '12px', borderRadius: 9, border: 'none',
                background: C.error, fontSize: 14, fontWeight: 700, color: '#fff',
                cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {deleting ? 'Removing…' : 'Remove Product'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ── Add Product Dialog ──────────────────────────────────────────── */
function AddProductDialog({ open, onClose, onSave, stockTracking = true }) {
  const blank = { name: '', sku: '', barcode: '', price: '', costPrice: '', stockQty: '0', quickSlot: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setForm(blank); setErr(''); }, [open]);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim() || !form.sku.trim() || form.price === '' || form.costPrice === '') {
      setErr('Name, SKU, Sell Price and Cost Price are required.'); return;
    }
    setSaving(true); setErr('');
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        price: parseFloat(form.price),
        costPrice: parseFloat(form.costPrice),
        stockQty: parseInt(form.stockQty, 10) || 0,
        quickSlot: form.quickSlot ? parseInt(form.quickSlot, 10) : undefined,
      };
      if (form.barcode.trim()) payload.barcode = form.barcode.trim();
      await onSave(payload);
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ style: { borderRadius: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" } }}>

      <div style={{ padding: '18px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.textPri }}>Add Product</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <CloseOutlinedIcon sx={{ fontSize: 20, color: C.textDim }} />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        {err && (
          <div style={{ background: 'rgba(183,28,28,0.08)', border: '1px solid rgba(183,28,28,0.22)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.error }}>
            {err}
          </div>
        )}

        <div>
          <label style={labelStyle}>Product Name *</label>
          <input style={inputStyle} value={form.name} onChange={f('name')} placeholder="e.g. Coca Cola 500ml" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>SKU *</label>
            <input style={inputStyle} value={form.sku} onChange={f('sku')} placeholder="COLA001" />
          </div>
          <div>
            <label style={labelStyle}>Barcode</label>
            <input style={inputStyle} value={form.barcode} onChange={f('barcode')} placeholder="Optional" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Sell Price *</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.price} onChange={f('price')} placeholder="0.00" />
          </div>
          <div>
            <label style={labelStyle}>Cost Price *</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={form.costPrice} onChange={f('costPrice')} placeholder="0.00" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {stockTracking ? (
            <div>
              <label style={labelStyle}>Opening Stock</label>
              <input style={inputStyle} type="number" min="0" value={form.stockQty} onChange={f('stockQty')} placeholder="0" />
            </div>
          ) : (
            <div>
              <label style={{ ...labelStyle, color: C.textDim }}>Opening Stock</label>
              <input style={{ ...inputStyle, color: C.textDim, background: C.elevated, cursor: 'not-allowed' }} value="—" readOnly />
            </div>
          )}
          <div>
            <label style={labelStyle}>Quick Slot (1–9)</label>
            <input style={inputStyle} type="number" min="1" max="9" value={form.quickSlot} onChange={f('quickSlot')} placeholder="Optional" />
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 18px', display: 'flex', gap: 8, borderTop: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 9, border: `1px solid ${C.border}`, background: '#fff', fontSize: 14, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 9, border: 'none', background: C.primary, fontSize: 14, fontWeight: 700, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {saving ? 'Adding…' : 'Add Product'}
        </button>
      </div>
    </Dialog>
  );
}

/* ── Desktop KPI Card ────────────────────────────────────────────── */
function DesktopKpiCard({ label, value, icon: Icon, color, iconBg }) {
  return (
    <div style={{
      position: 'relative', background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTop: `1.5px solid ${color}`, borderLeft: `1.5px solid ${color}`, borderTopLeftRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottom: `1.5px solid ${color}`, borderRight: `1.5px solid ${color}`, borderBottomRightRadius: 10, pointerEvents: 'none' }} />
      <div style={{ width: 42, height: 42, borderRadius: 11, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 21, color }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.textPri, letterSpacing: '-0.6px', lineHeight: 1 }}>{value}</p>
        <p style={{ margin: '5px 0 0', fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function ManagerInventoryPage() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageErr, setPageErr] = useState('');
  const [stockTracking, setStockTracking] = useState(true);

  const isDesktop = useMediaQuery('(min-width:1024px)');
  const isCompact = useMediaQuery('(max-width:430px)');

  const [addDlg, setAddDlg] = useState(false);
  const [actionsDlg, setActionsDlg] = useState({ open: false, product: null });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API}/api/settings/stock-tracking`, { headers })
      .then(r => r.json())
      .then(d => setStockTracking(d.stockTrackingEnabled ?? true))
      .catch(() => {});
  }, [token]);

  const fetchProducts = useCallback(async () => {
    setLoading(true); setPageErr('');
    try {
      const res = await fetch(`${API}/api/products`, { headers });
      if (!res.ok) throw new Error('Failed to load products');
      setProducts(await res.json());
    } catch (e) { setPageErr(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleAddProduct = async (payload) => {
    const res = await fetch(`${API}/api/products`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Save failed');
    setAddDlg(false);
    fetchProducts();
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const totalCount = products.length;
  const lowCount   = products.filter(p => p.stockQty > 0 && p.stockQty <= LOW).length;
  const outCount   = products.filter(p => p.stockQty === 0).length;

  const dialogs = (
    <>
      <AddProductDialog
        open={addDlg}
        onClose={() => setAddDlg(false)}
        onSave={handleAddProduct}
        stockTracking={stockTracking}
      />
      <ProductActionsDialog
        open={actionsDlg.open}
        product={actionsDlg.product}
        token={token}
        onClose={() => setActionsDlg({ open: false, product: null })}
        onRefresh={fetchProducts}
        stockTracking={stockTracking}
      />
    </>
  );

  const disabledBanner = !stockTracking && (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: 'rgba(178,106,0,0.07)', border: '1px solid rgba(178,106,0,0.25)',
      borderRadius: 10, padding: '10px 14px',
    }}>
      <BlockOutlinedIcon sx={{ fontSize: 16, color: C.warning, flexShrink: 0, marginTop: '1px' }} />
      <p style={{ margin: 0, fontSize: 12, color: '#7A4F00', fontWeight: 500, lineHeight: '18px' }}>
        <strong>Stock Tracking Disabled</strong> — quantity updates, low-stock alerts, and stock deductions are
        inactive. To re-enable, go to <strong>Settings › Inventory</strong>.
      </p>
    </div>
  );

  /* ══════════════════════════════════════════
     DESKTOP
  ══════════════════════════════════════════ */
  if (isDesktop) {
    const DESKTOP_COLS = '1fr 90px 120px 100px 100px 56px 90px 42px';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg }}>

        {/* Top bar */}
        <div style={{ padding: '24px 32px 20px', flexShrink: 0, background: C.bg }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Manager Portal</p>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri, letterSpacing: '-0.4px' }}>Inventory Management</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={fetchProducts}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <RefreshOutlinedIcon sx={{ fontSize: 16 }} /> Refresh
              </button>
              <button
                onClick={() => setAddDlg(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <AddOutlinedIcon sx={{ fontSize: 16 }} /> Add Product
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 240px))', gap: 14, marginBottom: 16 }}>
            <DesktopKpiCard label="Total Products"  value={totalCount} icon={Inventory2OutlinedIcon}   color={C.primary} iconBg="rgba(62,39,35,0.09)"  />
            <DesktopKpiCard label="Low Stock"        value={stockTracking ? lowCount : '—'}   icon={WarningAmberOutlinedIcon} color={stockTracking ? C.warning : C.textDim} iconBg={stockTracking ? 'rgba(178,106,0,0.10)' : C.elevated} />
            <DesktopKpiCard label="Out of Stock"     value={stockTracking ? outCount : '—'}   icon={ErrorOutlineOutlinedIcon} color={stockTracking ? C.error : C.textDim}   iconBg={stockTracking ? 'rgba(183,28,28,0.09)' : C.elevated} />
          </div>

          {/* Disabled banner */}
          {disabledBanner}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', borderTop: `1px solid ${C.border}` }}>
          <div style={{ height: '100%', overflowY: 'auto', padding: '20px 32px 32px' }}>

            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <SearchOutlinedIcon sx={{ fontSize: 17, color: C.textDim, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by product name, SKU or barcode…"
                style={{ ...inputStyle, padding: '10px 12px 10px 38px', fontSize: 13, borderRadius: 9 }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}>
                  <CloseOutlinedIcon sx={{ fontSize: 15, color: C.textDim }} />
                </button>
              )}
            </div>

            {/* Error banner */}
            {pageErr && (
              <div style={{ background: 'rgba(183,28,28,0.08)', border: '1px solid rgba(183,28,28,0.22)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.error }}>
                {pageErr}
              </div>
            )}

            {/* Product table */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>

              {/* Table header */}
              <div style={{
                background: C.tableHdr, borderBottom: `1px solid ${C.border}`,
                padding: '10px 20px',
                display: 'grid', gridTemplateColumns: DESKTOP_COLS,
                gap: 8, alignItems: 'center',
              }}>
                {['Product', 'SKU', 'Barcode', 'Sell Price', 'Cost Price', 'Slot', 'Stock', 'Actions'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</span>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: '56px 24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Loading products…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F5F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Inventory2OutlinedIcon sx={{ fontSize: 26, color: C.primary }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.textPri, margin: 0 }}>
                    {search ? 'No products match your search' : 'No products configured'}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: 0, maxWidth: 300, lineHeight: '18px' }}>
                    {search ? 'Try a different name, SKU or barcode.' : 'Click "Add Product" to create your first product.'}
                  </p>
                </div>
              ) : filtered.map((p, i) => (
                <div
                  key={p._id}
                  style={{
                    padding: '13px 20px',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                    display: 'grid', gridTemplateColumns: DESKTOP_COLS,
                    gap: 8, alignItems: 'center',
                    background: i % 2 ? '#FDFCFB' : C.surface,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.hover}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#FDFCFB' : C.surface}
                >
                  {/* Product name + sub-meta */}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </p>
                    {p.quickSlot && (
                      <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 600, color: C.textDim }}>
                        POS Slot P{p.quickSlot}
                      </p>
                    )}
                  </div>

                  {/* SKU */}
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    {p.sku}
                  </span>

                  {/* Barcode */}
                  <span style={{ fontSize: 12, color: p.barcode ? C.textSec : C.textDim, fontFamily: 'monospace' }}>
                    {p.barcode || '—'}
                  </span>

                  {/* Sell Price */}
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri }}>
                    ${p.price.toFixed(2)}
                  </span>

                  {/* Cost Price */}
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>
                    {p.costPrice != null ? `$${p.costPrice.toFixed(2)}` : '—'}
                  </span>

                  {/* Quick Slot */}
                  <span style={{ fontSize: 12, fontWeight: 700, color: p.quickSlot ? C.primary : C.textDim }}>
                    {p.quickSlot ? `P${p.quickSlot}` : '—'}
                  </span>

                  {/* Stock */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {stockTracking ? (
                      <>
                        <span style={{ fontSize: 14, fontWeight: 800, color: p.stockQty === 0 ? C.error : p.stockQty <= LOW ? C.warning : C.textPri, lineHeight: 1 }}>
                          {p.stockQty}
                        </span>
                        <StockPill qty={p.stockQty} />
                      </>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.textDim }}>—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => setActionsDlg({ open: true, product: p })}
                    title="Manage product"
                    style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      border: `1px solid ${C.border}`,
                      background: C.surface,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.primary,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.borderColor = C.primary; e.currentTarget.querySelector('svg').style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; e.currentTarget.querySelector('svg').style.color = C.primary; }}
                  >
                    <TuneOutlinedIcon sx={{ fontSize: 16, color: C.primary, transition: 'color 0.15s' }} />
                  </button>
                </div>
              ))}
            </div>

            {filtered.length > 0 && (
              <p style={{ margin: '12px 0 0', fontSize: 11, color: C.textDim }}>
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}{search ? ' matched' : ' total'}
                {stockTracking && lowCount > 0 && <span style={{ color: C.warning, fontWeight: 700 }}> · {lowCount} low stock</span>}
                {stockTracking && outCount > 0 && <span style={{ color: C.error, fontWeight: 700 }}> · {outCount} out of stock</span>}
                {!stockTracking && <span style={{ color: C.textDim, fontWeight: 600 }}> · stock tracking disabled</span>}
              </p>
            )}
          </div>
        </div>

        {dialogs}
      </div>
    );
  }

  /* ══════════════════════════════════════════
     MOBILE (unchanged layout)
  ══════════════════════════════════════════ */
  return (
    <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 2px' }}>
            Manager Portal
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.textPri, margin: 0, letterSpacing: '-0.2px' }}>
            Inventory
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchProducts} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshOutlinedIcon sx={{ fontSize: 18, color: C.textDim }} />
          </button>
          <button onClick={() => setAddDlg(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <AddOutlinedIcon sx={{ fontSize: 16 }} />
            Add Product
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Products',     short: 'Prdts',   value: totalCount,                                color: '#3E2723',                      iconBg: 'rgba(62,39,35,0.09)',                        border: '#3E2723', Icon: Inventory2OutlinedIcon   },
          { label: 'Low Stock',    short: 'Low Stk', value: stockTracking ? lowCount   : '—',          color: stockTracking ? C.warning : C.textDim, iconBg: stockTracking ? 'rgba(178,106,0,0.10)' : C.elevated, border: stockTracking ? C.warning : C.border, Icon: WarningAmberOutlinedIcon },
          { label: 'Out of Stock', short: 'No Stk',  value: stockTracking ? outCount   : '—',          color: stockTracking ? C.error   : C.textDim, iconBg: stockTracking ? 'rgba(183,28,28,0.09)' : C.elevated, border: stockTracking ? C.error   : C.border, Icon: ErrorOutlineOutlinedIcon },
        ].map(({ label, short, value, color, iconBg, border, Icon }) => (
          <div key={label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderLeft: `2px solid ${border}`, borderRadius: 10,
            padding: '12px 10px', display: 'flex', alignItems: 'center', gap: 9,
          }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 17, color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color, lineHeight: '22px', letterSpacing: '-0.2px' }}>{value}</p>
              <p style={{ margin: 0, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: '13px', whiteSpace: 'nowrap', fontSize: isCompact ? 8.5 : 9 }}>
                {isCompact ? short : label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Disabled banner */}
      {disabledBanner && <div style={{ marginBottom: 14 }}>{disabledBanner}</div>}

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <SearchOutlinedIcon sx={{ fontSize: 18, color: C.textDim, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or SKU…"
          style={{ ...inputStyle, padding: '9px 12px 9px 34px', fontSize: 13 }}
        />
      </div>

      {/* Error banner */}
      {pageErr && (
        <div style={{ background: 'rgba(183,28,28,0.08)', border: '1px solid rgba(183,28,28,0.22)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.error }}>
          {pageErr}
        </div>
      )}

      {/* Product table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          background: '#F3EDE9', borderBottom: `1px solid ${C.border}`,
          padding: '9px 14px',
          display: 'grid', gridTemplateColumns: '1fr 58px 66px 36px',
          gap: 6, alignItems: 'center',
        }}>
          {['Product', 'Stock', 'Price', ''].map((h, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '44px 24px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>Loading products…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F5F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 26, color: C.primary }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.textPri, margin: 0 }}>
              {search ? 'No products match your search' : 'No products configured'}
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: 0, maxWidth: 240, lineHeight: '18px' }}>
              {search ? 'Try a different name or SKU.' : 'Tap "Add Product" to create your first product.'}
            </p>
          </div>
        ) : filtered.map((p, i) => (
          <div key={p._id} style={{
            padding: '11px 14px',
            borderBottom: i < filtered.length - 1 ? '1px solid #F0E8E4' : 'none',
            display: 'grid', gridTemplateColumns: '1fr 58px 66px 36px',
            gap: 6, alignItems: 'center',
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
              {stockTracking ? (
                <>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, lineHeight: '18px', color: p.stockQty === 0 ? C.error : p.stockQty <= LOW ? C.warning : C.textPri }}>
                    {p.stockQty}
                  </p>
                  <StockPill qty={p.stockQty} />
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textDim }}>—</p>
              )}
            </div>

            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.textPri }}>
              ${p.price.toFixed(2)}
            </p>

            <button
              onClick={() => setActionsDlg({ open: true, product: p })}
              title="Manage product"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.surface,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.primary, flexShrink: 0,
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.borderColor = C.primary; e.currentTarget.querySelector('svg').style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; e.currentTarget.querySelector('svg').style.color = C.primary; }}
            >
              <TuneOutlinedIcon sx={{ fontSize: 16, color: C.primary, transition: 'color 0.15s' }} />
            </button>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: C.textDim, textAlign: 'center' }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}{search ? ' matched' : ' total'}
          {!stockTracking && <span style={{ color: C.textDim, fontWeight: 600 }}> · stock tracking disabled</span>}
        </p>
      )}

      {dialogs}
    </div>
  );
}
