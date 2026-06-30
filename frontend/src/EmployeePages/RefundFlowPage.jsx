import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import useAuthStore from '../store/useAuthStore';

import { API_URL as API } from '../config/api';

const C = {
  primary: '#3E2723', accent: '#D4A373', error: '#B71C1C', success: '#2E7D4F',
  warning: '#B26A00', textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1', elevated: '#EFE7E2',
};

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash' },
  { id: 'CREDIT', label: 'Credit Card' },
  { id: 'DEBIT', label: 'Debit Card' },
  { id: 'MISC', label: 'Misc' },
];

const CARD_BRANDS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'];

const REASONS = ['Defective', 'Wrong Item', 'Customer Changed Mind', 'Price Error', 'Other'];

const fieldLabel = {
  fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.07em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
};
const fieldInput = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 14, color: C.textPri,
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function genIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `rf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function RefundFlowPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const terminalPath = pathname.startsWith('/manager') ? '/manager/terminal' : '/employee/terminal';
  const token = useAuthStore((s) => s.token);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // Context carried over from the Terminal (amount typed + product picked
  // before pressing "Refund Product") — used to pre-select the matching
  // invoice line item once a real invoice is found, never trusted on its own.
  const incoming = location.state || {};
  const incomingAmount = incoming.amount ?? null;
  const incomingProduct = incoming.product ?? null;

  const [step, setStep] = useState('search'); // 'search' | 'form' | 'submitted'

  // ── Search ──
  const [invoiceNo, setInvoiceNo] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);

  // ── Selected invoice detail ──
  const [sale, setSale] = useState(null);
  const [originalPayment, setOriginalPayment] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Refund form ──
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState(null);
  const [cardBrand, setCardBrand] = useState('VISA');
  const [cardLast4, setCardLast4] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhoneInput, setBuyerPhoneInput] = useState('');
  const [buyerEmailInput, setBuyerEmailInput] = useState('');
  const [buyerVerified, setBuyerVerified] = useState(false);
  const [reason, setReason] = useState(null);
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(genIdempotencyKey());

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  const audioCtx = useRef(null);
  const beep = useCallback((freq = 880, durationMs = 55, type = 'square', gain = 0.12) => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.connect(vol); vol.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      vol.gain.setValueAtTime(gain, ctx.currentTime);
      vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + durationMs / 1000);
    } catch { /* audio not supported */ }
  }, []);

  const handleBack = () => {
    beep(300, 130, 'sawtooth', 0.11);
    if (step === 'form') {
      setStep('search');
      setSale(null);
      setSelectedItemId(null);
    } else {
      navigate(terminalPath);
    }
  };

  /* ── Step 1: Search ──
     Also passes the terminal context (product + amount) through as extra
     match criteria — narrows results to invoices that actually contain that
     product at that price, instead of relying on invoice/phone text alone. */
  const handleSearch = async () => {
    if (!invoiceNo.trim() && !buyerPhone.trim() && !incomingProduct && incomingAmount == null) {
      setSearchError('Enter an invoice number or buyer phone to search.');
      return;
    }
    setSearching(true);
    setSearchError('');
    setSearched(true);
    beep(987, 65, 'sine', 0.10);
    try {
      const params = new URLSearchParams();
      if (invoiceNo.trim()) params.set('invoiceNo', invoiceNo.trim());
      if (buyerPhone.trim()) params.set('buyerPhone', buyerPhone.trim());
      if (incomingProduct?.name) params.set('productName', incomingProduct.name);
      if (incomingAmount != null) params.set('amount', incomingAmount);
      const res = await fetch(`${API}/api/sales/search?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Search failed');
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setSearchError(e.message);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  /* ── Step 2: Select invoice → load detail ── */
  const handleSelectInvoice = async (invoice) => {
    beep(1046, 60, 'sine', 0.10);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API}/api/sales/${invoice._id}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load invoice');
      setSale(data.sale);
      const payment = data.payments?.[0] || null;
      setOriginalPayment(payment);
      setMethod(payment?.method || null);
      setBuyerName(payment?.buyer?.name || '');
      setBuyerPhoneInput(payment?.buyer?.phone || '');
      setBuyerEmailInput(payment?.buyer?.email || '');
      setCardBrand(payment?.card?.brand || 'VISA');

      // Pre-select the item matching what was picked on the terminal, if any.
      const matchedItem = incomingProduct
        ? data.sale.items.find((i) => String(i.productId) === String(incomingProduct.productId))
        : null;
      if (matchedItem) {
        const remaining = matchedItem.quantity - (matchedItem.refundedQty || 0);
        setSelectedItemId(remaining > 0 ? matchedItem._id : null);
        const unitPrice = matchedItem.total / matchedItem.quantity;
        const estimatedQty = incomingAmount && unitPrice
          ? Math.min(remaining, Math.max(1, Math.round(incomingAmount / unitPrice)))
          : 1;
        setQuantity(remaining > 0 ? estimatedQty : 1);
      } else {
        setSelectedItemId(null);
        setQuantity(1);
      }
      setBuyerVerified(false);
      setReason(null);
      setNotes('');
      setIdempotencyKey(genIdempotencyKey());
      setSubmitError('');
      setStep('form');
    } catch (e) {
      setSearchError(e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectedItem = sale?.items?.find((i) => i._id === selectedItemId) || null;
  const remainingQty = selectedItem ? selectedItem.quantity - (selectedItem.refundedQty || 0) : 0;
  const refundAmount = selectedItem
    ? Math.round(((selectedItem.total / selectedItem.quantity) * quantity) * 100) / 100
    : 0;

  const isCardTender = method === 'CREDIT' || method === 'DEBIT';
  const methodOverridden = !!originalPayment && method !== originalPayment.method;
  const cardLast4Valid = !isCardTender || /^\d{4}$/.test(cardLast4.trim());

  const canSubmit = !!selectedItem
    && quantity >= 1 && quantity <= remainingQty
    && !!method && cardLast4Valid
    && buyerName.trim().length > 0
    && !!reason
    && !submitting;

  const handleSelectItem = (item) => {
    if (item.quantity - (item.refundedQty || 0) <= 0) return;
    beep(987, 65, 'sine', 0.10);
    setSelectedItemId(item._id);
    setQuantity(1);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    beep(1318, 90, 'sine', 0.13);
    setTimeout(() => beep(1567, 70, 'sine', 0.09), 80);
    try {
      const body = {
        saleId: sale._id,
        saleItemId: selectedItemId,
        quantity,
        paymentMethod: method,
        buyer: {
          name: buyerName.trim(),
          phone: buyerPhoneInput.trim() || undefined,
          email: buyerEmailInput.trim() || undefined,
        },
        buyerVerified,
        reason: notes.trim() ? `${reason} — ${notes.trim()}` : reason,
        idempotencyKey,
      };
      if (isCardTender) body.card = { brand: cardBrand, last4: cardLast4.trim() };

      const res = await fetch(`${API}/api/overrides`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit refund request');

      setSubmitted({
        invoiceNo: sale.invoiceNo,
        productName: selectedItem.productName,
        sku: selectedItem.sku,
        quantity,
        amount: refundAmount,
        method,
      });
      setStep('submitted');
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextSale = () => {
    beep(784, 80, 'sine', 0.12);
    setTimeout(() => beep(1046, 110, 'sine', 0.10), 75);
    navigate(terminalPath, { replace: true });
  };

  /* ───────────────────────── Step: Submitted ───────────────────────── */
  if (step === 'submitted' && submitted) {
    return (
      <div style={{ padding: '16px 16px 24px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 132px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0 22px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(178,106,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 30, color: C.warning }} />
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Refund Request Submitted</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDim, textAlign: 'center', maxWidth: 320, lineHeight: '18px' }}>
            A manager must verify their PIN in the Overrides queue before this refund is finalized.
          </p>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ background: 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Refund Request</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 11px', borderRadius: 20, background: 'rgba(178,106,0,0.20)', border: '1px solid rgba(178,106,0,0.40)', color: '#ffcc80' }}>PENDING</span>
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Refund Amount</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: C.textPri, letterSpacing: '-0.8px' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.accent, marginRight: 1 }}>$</span>{submitted.amount}
            </span>
          </div>
          <div style={{ margin: '0 20px', borderTop: '1.5px dashed #E6DAD5' }} />
          <div style={{ padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Invoice</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{submitted.invoiceNo}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Item</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{submitted.productName} ×{submitted.quantity}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Method</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{submitted.method}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 12 }} />
        <button onClick={handleNextSale} style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12,
          border: `2px solid ${C.accent}`, background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)', color: '#fff',
          fontSize: 15, fontWeight: 800, letterSpacing: '0.06em', cursor: 'pointer',
          boxShadow: '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373',
        }}>
          Next Sale
        </button>
      </div>
    );
  }

  /* ───────────────────────── Step: Search ───────────────────────── */
  if (step === 'search') {
    return (
      <div style={{ padding: '16px 16px 24px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.primary, cursor: 'pointer' }}>
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Refund — Find Invoice</p>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Sale lookup</p>
          </div>
        </div>

        {incomingProduct && (
          <div className="ticket-card" style={{
            background: C.surface, borderRadius: 10, marginBottom: 14,
            display: 'flex', alignItems: 'center', height: 40,
            // Apple-icon-style bevel — a soft inset highlight glowing from the
            // top-left corner and a soft inset shadow from the bottom-right,
            // not a hard line spanning the full edge.
            boxShadow: 'inset 1px 1px 1px 0 rgba(255,255,255,0.85), inset -1px -1px 1px 0 rgba(62,39,35,0.18)',
          }}>
            <div style={{ flex: 1, padding: '0 12px', position: 'relative', minWidth: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
              <span style={{ padding: '2px 7px', borderRadius: 5, background: '#3E2723', color: C.accent, fontSize: 11, fontWeight: 800, marginRight: 8, flexShrink: 0 }}>
                {incomingProduct.code}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {incomingProduct.name}
              </span>
              <span className="ticket-divider-v" style={{ position: 'absolute', top: 0, bottom: 0, right: 0 }} />
              <span className="ticket-notch" style={{ width: 14, height: 14, top: -7, right: -7 }} />
              <span className="ticket-notch" style={{ width: 14, height: 14, bottom: -7, right: -7 }} />
            </div>
            {incomingAmount != null && (
              <div style={{ width: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri }}>${incomingAmount}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Lookup ticket — perforated stub with bite notches on each side ── */}
        <div className="ticket-card" style={{
          background: C.surface,
          borderRadius: 14,
          marginBottom: 20,
          boxShadow: '0 4px 0 #c8bdb8, 0 8px 20px rgba(62,39,35,0.08)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)',
            padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 16, color: C.accent }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Invoice Lookup Ticket
            </span>
          </div>

          <div style={{ padding: '16px 18px 18px' }}>
            <label style={fieldLabel}>Invoice Number</label>
            <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="e.g. INV-123456" style={fieldInput} />
          </div>

          {/* Perforated divider with bite notches */}
          <div className="ticket-divider-h" style={{ position: 'relative', margin: '0 18px' }}>
            <span className="ticket-notch" style={{ top: -9, left: -27 }} />
            <span className="ticket-notch" style={{ top: -9, right: -27 }} />
          </div>

          <div style={{ padding: '18px 18px 16px' }}>
            <label style={fieldLabel}>Buyer Phone</label>
            <input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Optional — search by phone instead" style={fieldInput} />
          </div>

          <div className="ticket-torn-edge" />
        </div>

        {searchError && (
          <p style={{ fontSize: 13, fontWeight: 600, color: C.error, marginBottom: 12 }}>{searchError}</p>
        )}

        <button onClick={handleSearch} disabled={searching} style={{
          width: '100%', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 12, border: `2px solid ${C.accent}`, background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
          color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '0.05em',
          boxShadow: '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28)',
          cursor: searching ? 'not-allowed' : 'pointer', opacity: searching ? 0.6 : 1, marginBottom: 20,
        }}>
          <SearchOutlinedIcon sx={{ fontSize: 18 }} />
          {searching ? 'Searching…' : 'Search Invoice'}
        </button>

        {loadingDetail && (
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.textDim }}>Loading invoice…</p>
        )}

        {searched && !searching && results.length === 0 && !searchError && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 28, color: C.textDim, marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: C.textPri, margin: 0 }}>No matching invoices</p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.textSec, margin: '4px 0 0' }}>Check the invoice number or phone and try again.</p>
          </div>
        )}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ ...fieldLabel, marginBottom: 0 }}>{results.length} Match{results.length !== 1 ? 'es' : ''} Found</p>
            {results.map((r) => (
              <button key={r._id} onClick={() => handleSelectInvoice(r)} className="ticket-card" style={{
                textAlign: 'left', background: C.surface, borderRadius: 12,
                boxShadow: '0 3px 0 #c8bdb8, 0 6px 14px rgba(62,39,35,0.07)',
                cursor: 'pointer', display: 'flex', alignItems: 'stretch', padding: 0,
              }}>
                <div style={{ flex: 1, padding: '14px 16px', position: 'relative' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri, letterSpacing: '-0.1px' }}>{r.invoiceNo}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 600, color: C.textDim }}>
                    {new Date(r.createdAt).toLocaleDateString([], { dateStyle: 'medium' })} · {r.employeeId?.name || 'Unknown'}
                  </p>
                  {/* Vertical perforation with top/bottom bite notches */}
                  <span className="ticket-divider-v" style={{ position: 'absolute', top: 0, bottom: 0, right: 0 }} />
                  <span className="ticket-notch" style={{ top: -9, right: -9 }} />
                  <span className="ticket-notch" style={{ bottom: -9, right: -9 }} />
                </div>
                <div style={{ width: 92, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPri }}>${r.grandTotal?.toFixed(2)}</p>
                  <ArrowBackIcon sx={{ fontSize: 14, color: C.textDim, transform: 'rotate(180deg)' }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ───────────────────────── Step: Form ───────────────────────── */
  return (
    <div style={{ padding: '16px 16px 24px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.primary, cursor: 'pointer' }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Refund Details</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Invoice {sale.invoiceNo}</p>
        </div>
      </div>

      {/* Invoice summary */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total</p>
          <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: C.textPri }}>${sale.grandTotal?.toFixed(2)}</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '4px 10px', borderRadius: 20, background: C.elevated, color: C.primary }}>
          {sale.paymentStatus}
        </span>
      </div>

      {/* Item selection */}
      <p style={{ ...fieldLabel, marginBottom: 8 }}>Select Item to Refund</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {sale.items.map((item) => {
          const remaining = item.quantity - (item.refundedQty || 0);
          const isSelected = selectedItemId === item._id;
          const disabled = remaining <= 0;
          return (
            <button key={item._id} onClick={() => handleSelectItem(item)} disabled={disabled} style={{
              textAlign: 'left', padding: '12px 14px', borderRadius: 10,
              border: isSelected ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
              background: disabled ? C.bg : isSelected ? 'rgba(212,163,115,0.10)' : '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{item.productName} <span style={{ color: C.textDim, fontWeight: 500 }}>({item.sku})</span></span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.textPri }}>${item.total.toFixed(2)}</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, color: disabled ? C.error : C.textSec }}>
                {disabled ? 'Fully refunded' : `Qty ${item.quantity} · ${remaining} remaining refundable`}
              </p>
            </button>
          );
        })}
      </div>

      {selectedItem && (
        <>
          {/* Quantity */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={fieldLabel}>Refund Quantity</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 800 }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.textPri, minWidth: 24, textAlign: 'center' }}>{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(remainingQty, q + 1))} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 800 }}>+</button>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={fieldLabel}>Refund Amount</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.textPri }}>${refundAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Refund method */}
          <p style={{ ...fieldLabel, marginBottom: 8 }}>Refund Method</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
            {PAYMENT_METHODS.map(({ id, label }) => {
              const isSelected = method === id;
              const isOriginal = originalPayment?.method === id;
              return (
                <button key={id} onClick={() => { beep(987, 65, 'sine', 0.10); setMethod(id); }} style={{
                  padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                  border: isSelected ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                  background: isSelected ? 'rgba(212,163,115,0.10)' : '#fff', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{label}</span>
                  {isOriginal && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: C.success }}>ORIGINAL</span>}
                </button>
              );
            })}
          </div>
          {methodOverridden && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: C.warning, marginBottom: 12 }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 15 }} />
              Different from the original payment method — this will be flagged for manager review.
            </p>
          )}

          {isCardTender && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={fieldLabel}>Card Brand</label>
                <select value={cardBrand} onChange={(e) => setCardBrand(e.target.value)} style={fieldInput}>
                  {CARD_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Last 4 Digits *</label>
                <input value={cardLast4} inputMode="numeric" maxLength={4}
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234" style={fieldInput} />
              </div>
            </div>
          )}

          {/* Buyer verification */}
          <p style={{ ...fieldLabel, marginBottom: 8 }}>Buyer Verification</p>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={fieldLabel}>Name *</label>
              <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} style={fieldInput} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={fieldLabel}>Phone</label>
                <input value={buyerPhoneInput} onChange={(e) => setBuyerPhoneInput(e.target.value)} style={fieldInput} />
              </div>
              <div>
                <label style={fieldLabel}>Email</label>
                <input value={buyerEmailInput} onChange={(e) => setBuyerEmailInput(e.target.value)} style={fieldInput} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer' }}>
              <input type="checkbox" checked={buyerVerified} onChange={(e) => setBuyerVerified(e.target.checked)} />
              I've confirmed this matches the buyer on the original invoice
            </label>
          </div>

          {/* Reason */}
          <p style={{ ...fieldLabel, marginBottom: 8 }}>Refund Reason</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {REASONS.map((r) => {
              const isSelected = reason === r;
              return (
                <button key={r} onClick={() => setReason(r)} style={{
                  padding: '7px 14px', borderRadius: 20,
                  border: isSelected ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                  background: isSelected ? C.primary : '#fff', color: isSelected ? '#fff' : C.textSec,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {r}
                </button>
              );
            })}
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes (optional)"
            style={{ ...fieldInput, minHeight: 64, resize: 'vertical', marginBottom: 16 }} />

          {submitError && (
            <p style={{ fontSize: 13, fontWeight: 600, color: C.error, marginBottom: 12, textAlign: 'center' }}>{submitError}</p>
          )}

          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            width: '100%', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderRadius: 12, border: canSubmit ? `2px solid ${C.accent}` : '1px solid #4a3329',
            background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)', color: '#fff',
            fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
            opacity: canSubmit ? 1 : 0.42, cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />
            {submitting ? 'Submitting…' : 'Submit Refund Request'}
          </button>
        </>
      )}
    </div>
  );
}
