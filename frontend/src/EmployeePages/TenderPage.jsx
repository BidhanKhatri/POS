import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import Payment from 'payment';
import CardBrandIcon from '../components/CardBrandIcon';
import { CARD_BRAND_META } from '../components/cardBrandMeta';
import { printReceipt, downloadPDF } from '../utils/receiptUtils';
import useAuthStore from '../store/useAuthStore';
import { useShiftGate } from '../context/ShiftGateContext';
import CornerCard from '../components/CornerCard/CornerCard';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';

import { API_URL as API } from '../config/api';

const PAYMENT_METHODS = [
  { id: 'MOI', label: 'MOI', icon: CreditCardIcon },
];

const CARD_BRANDS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'];
const CARD_TYPES  = ['CREDIT', 'DEBIT'];

// MOI is currently the only payment method in use, same as the sale-side
// PAYMENT_METHODS — the other refund methods are commented out (not deleted)
// so they're a one-line change to bring back once more methods are supported.
const REFUND_METHODS = [
  // { id: 'CASH', label: 'Cash' },
  { id: 'MOI', label: 'MOI' },
  // { id: 'DEBIT', label: 'Debit Card' },
  // { id: 'MISC', label: 'Misc' },
];
const REFUND_REASONS = ['Defective', 'Wrong Item', 'Customer Changed Mind', 'Price Error', 'Other'];

function genIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `rf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const fieldLabel = {
  fontSize: 11, fontWeight: 700, color: '#A09490', letterSpacing: '0.07em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
};
const fieldInput = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #DDD2CC', fontSize: 16, color: '#2B1D1A',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

// ── Shared receipt row helper ───────────────────────────────────────────────
function ReceiptRow({ label, children, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F0E8E3' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A', textAlign: 'right', maxWidth: '62%', fontFamily: mono ? 'monospace' : "'Plus Jakarta Sans', sans-serif" }}>{children}</span>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ onClick, Icon, label, loading, filled }) {
  return (
    <button
      onClick={onClick}
      disabled={!!loading}
      style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '13px 6px', borderRadius: 12,
        border: `1px solid ${filled ? '#3E2723' : '#DDD2CC'}`,
        background: filled ? '#3E2723' : '#ffffff',
        color: filled ? '#D4A373' : '#3E2723',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
        boxShadow: filled ? '0 3px 0 #2A1715' : '0 2px 0 #ddd0c8',
        transition: 'opacity 0.15s',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <Icon sx={{ fontSize: 22 }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textAlign: 'center', lineHeight: '14px' }}>
        {label}
      </span>
    </button>
  );
}

// ── Sale-complete screen with receipt actions ────────────────────────────────
function CompletedSaleScreen({ sale, token, API, onNewSale, paymentMethods }) {
  const isDesktop = useMediaQuery('(min-width:1024px)');
  const isRefund  = sale.transactionType === 'RF';
  const mLabel    = paymentMethods.find((m) => m.id === sale.method)?.label || sale.method;
  const total     = sale.grandTotal ?? sale.amount;
  const dateStr   = sale.createdAt
    ? new Date(sale.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  const statusBg    = isRefund ? 'rgba(183,28,28,0.10)' : 'rgba(46,125,79,0.10)';
  const statusColor = isRefund ? '#B71C1C' : '#2E7D4F';
  const statusLabel = isRefund ? 'REFUNDED' : 'PAID';

  const [emailOpen, setEmailOpen]     = useState(false);
  const [emailAddr, setEmailAddr]     = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [pdfLoading, setPdfLoading]   = useState(false);

  const handleEmail = async () => {
    if (!emailAddr.trim()) return;
    setEmailSending(true); setEmailResult(null);
    try {
      const res = await fetch(`${API}/api/sales/${sale.invoiceNo}/email-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: emailAddr.trim(), sale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send email');
      setEmailResult({ ok: true, msg: `Receipt sent to ${emailAddr.trim()}` });
    } catch (e) {
      setEmailResult({ ok: false, msg: e.message });
    } finally { setEmailSending(false); }
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try { await downloadPDF(sale); } catch { /* silent */ }
    finally { setPdfLoading(false); }
  };

  // Shared receipt card JSX
  const receiptCard = (
    <CornerCard borderColor="#DDD2CC" style={{ background: '#ffffff', marginBottom: 16 }}>
      <div style={{ background: '#FAF7F5', borderBottom: '1px solid #DDD2CC', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <ReceiptLongOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Receipt</span>
      </div>
      <div style={{ padding: '4px 16px 12px' }}>
        {sale.items && sale.items.length > 1 ? (
          sale.items.map((item, idx) => (
            <ReceiptRow key={item.id || idx} label={item.product?.code || `Item ${idx + 1}`}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <span>{item.product?.name}</span>
                <span style={{ fontSize: 11, color: '#A09490', fontWeight: 500 }}>{item.qty} × ${item.sellingPrice}</span>
              </div>
            </ReceiptRow>
          ))
        ) : (
          <ReceiptRow label={sale.product?.code || 'Item'}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span>{sale.product?.name}</span>
              <span style={{ fontSize: 11, color: '#A09490', fontWeight: 500 }}>1 × ${total}</span>
            </div>
          </ReceiptRow>
        )}
        <div style={{ borderTop: '1.5px dashed #E6DAD5', margin: '8px 0' }} />
        <ReceiptRow label={isRefund ? 'Total Refunded' : 'Total Paid'}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#2B1D1A' }}>${total}</span>
        </ReceiptRow>
        <ReceiptRow label="Status">
          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 10, background: statusBg, color: statusColor, border: `1px solid ${statusColor}33`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{statusLabel}</span>
        </ReceiptRow>
        <div style={{ borderTop: '1.5px dashed #E6DAD5', margin: '8px 0' }} />
        <ReceiptRow label="Payment">{mLabel}{sale.card ? ` (${sale.card.cardType}) ${sale.card.brand} •••• ${sale.card.last4}` : ''}</ReceiptRow>
        {sale.buyer?.name  && <ReceiptRow label="Buyer">{sale.buyer.name}</ReceiptRow>}
        <ReceiptRow label="Invoice" mono>{sale.invoiceNo}</ReceiptRow>
        {dateStr && <ReceiptRow label="Date"><span style={{ color: '#6B5B57' }}>{dateStr}</span></ReceiptRow>}
      </div>
    </CornerCard>
  );

  // Shared actions panel JSX
  const actionsPanel = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Receipt Actions</span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <ActionBtn onClick={() => printReceipt(sale)} Icon={PrintOutlinedIcon} label="Print" />
        <ActionBtn onClick={() => { setEmailOpen((o) => !o); setEmailResult(null); }} Icon={EmailOutlinedIcon} label="Email" />
        <ActionBtn onClick={handleDownloadPDF} Icon={DownloadOutlinedIcon} label={pdfLoading ? 'Wait…' : 'PDF'} loading={pdfLoading} />
      </div>
      {emailOpen && (
        <div style={{ background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#2B1D1A' }}>Send receipt by email</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" value={emailAddr} onChange={(e) => { setEmailAddr(e.target.value); setEmailResult(null); }} placeholder="customer@example.com"
              style={{ flex: 1, padding: '8px 11px', borderRadius: 8, border: '1px solid #DDD2CC', fontSize: 16, color: '#2B1D1A', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
            <button onClick={handleEmail} disabled={emailSending || !emailAddr.trim()}
              style={{ padding: '8px 14px', borderRadius: 8, flexShrink: 0, background: emailSending || !emailAddr.trim() ? '#EFE7E2' : '#3E2723', color: emailSending || !emailAddr.trim() ? '#A09490' : '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: emailSending ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <SendOutlinedIcon sx={{ fontSize: 15 }} />
              {emailSending ? '…' : 'Send'}
            </button>
          </div>
          {emailResult && <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: emailResult.ok ? '#2E7D4F' : '#B71C1C' }}>{emailResult.msg}</p>}
        </div>
      )}
    </>
  );

  // Shared New Sale button
  const newSaleBtn = (
    <button onClick={onNewSale} style={{ width: '100%', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, border: '2px solid #D4A373', background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)', color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '0.06em', boxShadow: '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373', cursor: 'pointer' }}>
      <AddCircleOutlineIcon sx={{ fontSize: 20 }} />
      New Sale
    </button>
  );

  // ── Desktop completed sale ──
  if (isDesktop) return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F5F3F1' }}>

      {/* Left — receipt */}
      <div style={{ width: 420, flexShrink: 0, borderRight: '1px solid #E4DAD5', background: '#FDFBF9', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '28px 24px' }}>
        {/* Success banner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 28, color: statusColor }} />
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2B1D1A' }}>{isRefund ? 'Refund Complete' : 'Payment Accepted'}</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textAlign: 'center' }}>Invoice #{sale.invoiceNo}</p>
        </div>
        {receiptCard}
      </div>

      {/* Right — actions + new sale */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '28px 32px' }}>
        <p style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 800, color: '#2B1D1A' }}>What's next?</p>
        <div style={{ marginBottom: 24 }}>{actionsPanel}</div>
        <div style={{ marginTop: 'auto' }}>{newSaleBtn}</div>
      </div>
    </div>
  );

  // ── Mobile completed sale ──
  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {receiptCard}
      <div style={{ marginBottom: 16 }}>{actionsPanel}</div>
      {newSaleBtn}
    </div>
  );
}

export default function TenderPage() {
  const navigate              = useNavigate();
  const location              = useLocation();
  const isDesktop             = useMediaQuery('(min-width:1024px)');
  const { amount, product, items, transactionType, discount: resumedDiscount, priceOverride } = location.state || {};
  // items          = [{id, product, sellingPrice, qty}] for multi-item carts | undefined for legacy single
  // resumedDiscount = { type, value, amount: dollarOff, finalAmount, overrideId, saleId, prefill } | null
  //                   — only present when arriving via OverridesPage "Resume" on an approved discount override.
  // priceOverride  = { saleId, overrideId, items?, varianceItems?, defaultPrice?, sellingPrice?, variancePercent?, prefill } | null

  // Discount applied inline on this page — either entered directly (within the manager's
  // limit) or the result of an in-page override request that a manager approved.
  // { type, value, amount: dollarOff, finalAmount, overrideId, saleId } | null
  const [localDiscount, setLocalDiscount] = useState(null);
  const discount = resumedDiscount || localDiscount;

  // Subtotal of all cart items (or fallback to legacy single-item amount)
  const cartSubtotal = items
    ? items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0)
    : (amount || 0);

  const chargeAmount = priceOverride
    ? (priceOverride.items
        ? priceOverride.items.reduce((s, i) => s + i.sellingPrice * i.qty, 0)
        : (priceOverride.sellingPrice || cartSubtotal))
    : discount
    ? discount.finalAmount
    : cartSubtotal;
  const terminalPath          = location.pathname.startsWith('/manager') ? '/manager/terminal' : '/employee/terminal';
  const token                 = useAuthStore((s) => s.token);
  const { forceLocked, lockReason } = useShiftGate();

  // Defaults to 'MOI' — the only payment method currently offered — so the
  // buyer details section shows immediately instead of waiting on a method
  // selection step (see commented-out paymentGrid above).
  const [selectedMethod, setSelectedMethod] = useState('MOI');
  const [processing, setProcessing]         = useState(false);
  const [error, setError]                   = useState('');
  const [completedSale, setCompletedSale]   = useState(null);
  const [pendingOverride, setPendingOverride] = useState(null);

  // Buyer details — collected for every tender type so a refund can be traced back
  // to the person. Card payments only ever capture a masked reference (type + brand
  // + last 4 digits) from the terminal/processor — never the full PAN, expiry, or CVV.
  const [buyerName, setBuyerName]   = useState('');
  const [cardType, setCardType]     = useState('CREDIT');
  const [cardBrand, setCardBrand]   = useState('VISA');
  const [cardLast4, setCardLast4]   = useState('');

  // ── Inline refund flow ──────────────────────────────────────────────────
  // Refunds now locate the original invoice right here on the Tender page
  // instead of hopping to a separate Find Invoice / Refund Details page. The
  // item being refunded is whatever the employee picked on the Terminal
  // (`product`/`items[0]`) — this step only resolves which real sale + line
  // item it corresponds to, so the refund stays properly accounted
  // (refundedQty/refundedAmount on the original sale). Submitting always goes
  // to the Overrides queue for manager approval — there is no on-page manager
  // PIN step.
  const [refundInvoiceNo, setRefundInvoiceNo] = useState('');
  const [refundCardSearch, setRefundCardSearch] = useState('');
  const [refundSearching, setRefundSearching] = useState(false);
  const [refundSearchError, setRefundSearchError] = useState('');
  const [refundSearched, setRefundSearched]   = useState(false);
  const [refundResults, setRefundResults]     = useState([]);
  const [matchedSale, setMatchedSale]         = useState(null);
  const [matchedItem, setMatchedItem]         = useState(null);
  const [matchedOriginalPayment, setMatchedOriginalPayment] = useState(null);
  const [refundQty, setRefundQty]             = useState(1);
  // The amount the employee actually hands back to the customer — prefilled
  // from what they entered on the Terminal (e.g. $70 of a $100 item). The tip
  // is never typed in directly; it's always Original Refund − this amount.
  const [refundFinalRaw, setRefundFinalRaw]   = useState(() => String(items?.[0]?.sellingPrice ?? amount ?? ''));
  // Fixed to 'MOI' — the only refund method currently offered — so the
  // method-selection grid stays hidden, same as the sale-side flow.
  const [refundMethod]                        = useState('MOI');
  const [refundCardType, setRefundCardType]   = useState('CREDIT');
  const [refundCardBrand, setRefundCardBrand] = useState('VISA');
  const [refundCardLast4, setRefundCardLast4] = useState('');
  const [refundReason, setRefundReason]       = useState(null);
  const [refundNotes, setRefundNotes]         = useState('');
  const [refundIdempotencyKey]                = useState(genIdempotencyKey);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundSubmitError, setRefundSubmitError] = useState('');

  // When arriving from an approved discount override (via OverridesPage Resume),
  // pre-fill the payment/buyer fields that were captured at override-submission
  // time so the employee only needs to confirm.
  useEffect(() => {
    const prefill = discount?.prefill || priceOverride?.prefill;
    if (prefill) {
      const { method, paymentMethod, buyer, card } = prefill;
      const m = method || paymentMethod;
      if (m) setSelectedMethod(m);
      if (buyer?.name)    setBuyerName(buyer.name);
      if (card?.cardType) setCardType(card.cardType);
      if (card?.brand)    setCardBrand(card.brand);
      if (card?.last4)    setCardLast4(card.last4);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  const isRefund   = transactionType === 'RF';
  const isCardTender = selectedMethod === 'MOI';

  const buyerNameValid = buyerName.trim().length > 0;
  const cardLast4Valid = !isCardTender || /^\d{4}$/.test(cardLast4.trim());

  // ── Refund calculations — Original Refund (the item's value for the chosen
  // quantity) − Amount actually handed to the customer = Tip. The employee
  // never types a tip directly; it's always the leftover once the "amount to
  // refund customer" (prefilled from what they entered on the Terminal) is
  // set against the item's real value.
  const refundRemainingQty = matchedItem ? matchedItem.quantity - (matchedItem.refundedQty || 0) : 0;
  const refundAmount = matchedItem
    ? Math.round(((matchedItem.total / matchedItem.quantity) * refundQty) * 100) / 100
    : 0;
  const refundFinalInput = parseFloat(refundFinalRaw) || 0;
  const refundFinalValid = refundFinalInput >= 0 && refundFinalInput <= refundAmount;
  const refundFinalAmount = Math.max(0, Math.round(Math.min(refundFinalInput, refundAmount) * 100) / 100);
  const refundTipAmount = Math.max(0, Math.round((refundAmount - refundFinalAmount) * 100) / 100);
  const refundIsCardTender = refundMethod === 'MOI' || refundMethod === 'DEBIT';
  const refundCardValid = !refundIsCardTender || /^\d{4}$/.test(refundCardLast4.trim());
  const canSubmitRefundRequest = !!matchedItem
    && refundQty >= 1 && refundQty <= refundRemainingQty
    && !!refundMethod && refundCardValid
    && !!refundReason && refundFinalValid
    && !refundSubmitting;

  // ── Inline discount entry ──────────────────────────────────────────────────
  // Discount is only offered on a fresh sale (not refunds, not an already-resumed
  // discount/price override). Employees can apply any discount amount directly —
  // there is no configurable cap. Only discounts at or above this fixed threshold
  // require a manager-approved override before the sale can complete.
  const DISCOUNT_OVERRIDE_THRESHOLD_PERCENT = 50;
  const [discountType, setDiscountType]         = useState('PERCENTAGE'); // 'PERCENTAGE' | 'FIXED'
  const [discountInputRaw, setDiscountInputRaw] = useState('');
  const [discountInputError, setDiscountInputError] = useState('');
  const [discountReason, setDiscountReason]     = useState('');
  const [discountOverrideError, setDiscountOverrideError] = useState('');
  const [discountSubmitting, setDiscountSubmitting]       = useState(false);
  // phase: 'entry' | 'pending' | 'denied' — 'entry' covers both "no discount yet" and
  // "discount applied/approved", distinguished by whether `discount` is set.
  const [discountPhase, setDiscountPhase] = useState('entry');
  const [discountDeniedBy, setDiscountDeniedBy] = useState('');
  const discountPollRef = useRef(null);

  // Discount is optional, so it's only revealed once the MOI payment details
  // (method, buyer name, card reference) are filled in — keeps the required
  // fields front-and-center instead of competing with an optional one.
  const showDiscountSection = !isRefund && !resumedDiscount && !priceOverride
    && !!selectedMethod && buyerNameValid && cardLast4Valid;

  const discountInputNum = parseFloat(discountInputRaw) || 0;
  const discountComputedAmount = discountType === 'PERCENTAGE'
    ? Math.round((cartSubtotal * Math.min(discountInputNum, 100)) / 100 * 100) / 100
    : Math.min(discountInputNum, cartSubtotal - 0.01);
  const discountFinalAmount   = Math.max(0, cartSubtotal - discountComputedAmount);
  const discountPercentOfSub  = cartSubtotal > 0 ? (discountComputedAmount / cartSubtotal) * 100 : 0;
  const discountExceedsLimit  = discountInputNum > 0 && discountPercentOfSub >= DISCOUNT_OVERRIDE_THRESHOLD_PERCENT;
  // Blocks payment while an over-threshold discount is typed in but neither applied nor requested yet.
  const discountUnresolved = showDiscountSection && !discount && discountInputNum > 0 && discountExceedsLimit;

  const canSubmit = !!selectedMethod && buyerNameValid && cardLast4Valid && !processing && !discountUnresolved;

  // Bind payment.js's keypress-level numeric restriction to the Last-4 input so
  // non-digit characters (including paste of letters/symbols) are rejected as the
  // employee types, rather than silently stripped after the fact.
  const cardLast4Ref = useRef(null);
  useEffect(() => {
    if (cardLast4Ref.current) Payment.restrictNumeric(cardLast4Ref.current);
  }, [isCardTender]);

  const audioCtx = useRef(null);

  /* ── Web Audio beep generator — same register-terminal feel as TerminalPage ── */
  const beep = useCallback((freq = 880, durationMs = 55, type = 'square', gain = 0.12) => {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.connect(vol);
      vol.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      vol.gain.setValueAtTime(gain, ctx.currentTime);
      vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch { /* audio not supported */ }
  }, []);

  const handleCancel = () => {
    beep(300, 130, 'sawtooth', 0.11);         // low buzz — cancel/reset
    navigate(terminalPath);
  };

  // ── Inline discount: apply / remove / request override ────────────────────
  const handleApplyDiscount = () => {
    setDiscountInputError('');
    if (discountInputNum <= 0) { setDiscountInputError('Enter a discount amount greater than 0.'); return; }
    if (discountComputedAmount >= cartSubtotal) { setDiscountInputError('Discount cannot equal or exceed the total amount.'); return; }
    if (discountExceedsLimit) return; // handled by the override request button instead

    setLocalDiscount({
      type: discountType, value: discountInputNum, amount: discountComputedAmount,
      finalAmount: discountFinalAmount, overrideId: null, saleId: null,
    });
  };

  const handleRemoveDiscount = () => {
    setLocalDiscount(null);
    setDiscountInputRaw('');
    setDiscountReason('');
    setDiscountInputError('');
  };

  const stopDiscountPolling = useCallback(() => {
    if (discountPollRef.current) {
      clearInterval(discountPollRef.current);
      discountPollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopDiscountPolling(), [stopDiscountPolling]);

  const startDiscountPolling = useCallback((overrideId) => {
    stopDiscountPolling();
    discountPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/overrides/${overrideId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'APPROVED') {
          stopDiscountPolling();
          setLocalDiscount({
            type: discountType, value: discountInputNum, amount: discountComputedAmount,
            finalAmount: discountFinalAmount, overrideId, saleId: data.saleId || null,
          });
          setDiscountPhase('entry');
        } else if (data.status === 'DENIED') {
          stopDiscountPolling();
          setDiscountDeniedBy(data.approvedBy?.name || 'Manager');
          setDiscountPhase('denied');
        }
      } catch { /* network hiccup — keep polling */ }
    }, 3000);
  }, [token, discountType, discountInputNum, discountComputedAmount, discountFinalAmount, stopDiscountPolling]);

  const handleRequestDiscountOverride = async () => {
    setDiscountOverrideError('');
    if (!discountReason.trim()) { setDiscountOverrideError('Reason is required.'); return; }
    if (!selectedMethod) { setDiscountOverrideError('Select a payment method first.'); return; }
    if (!buyerNameValid) { setDiscountOverrideError('Enter the buyer\'s name first.'); return; }
    if (isCardTender && !cardLast4Valid) { setDiscountOverrideError('Enter the 4-digit card reference first.'); return; }

    const saleContext = {
      paymentMethod: selectedMethod,
      buyer: { name: buyerName.trim() },
      ...(isCardTender && { card: { cardType, brand: cardBrand, last4: cardLast4.trim() } }),
    };

    const singleProduct = product || items?.[0]?.product;
    const overrideProductName = (items && items.length > 1) ? `${items.length} items` : singleProduct?.name;
    const saleItems = (items && items.length > 0)
      ? items.map((i) => ({
          productId:   i.product.productId,
          productName: i.product.name,
          sku:         i.product.sku || '',
          unitPrice:   i.sellingPrice,
          qty:         i.qty,
        }))
      : null;

    setDiscountSubmitting(true);
    try {
      const res = await fetch(`${API}/api/overrides/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId:      singleProduct?.productId,
          productName:    overrideProductName,
          sku:            singleProduct?.sku,
          amount:         cartSubtotal,
          discountType,
          discountValue:  discountInputNum,
          discountAmount: discountComputedAmount,
          reason:         discountReason.trim(),
          saleContext,
          ...(saleItems && saleItems.length > 1 && { items: saleItems }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit override request');
      setDiscountPhase('pending');
      startDiscountPolling(data._id);
    } catch (e) {
      setDiscountOverrideError(e.message);
    } finally {
      setDiscountSubmitting(false);
    }
  };

  const handleCancelDiscountOverride = () => {
    stopDiscountPolling();
    setDiscountPhase('entry');
  };

  const handleRetryDiscount = () => {
    setDiscountPhase('entry');
    setDiscountDeniedBy('');
    setDiscountReason('');
  };

  const handleProcess = async () => {
    if (!canSubmit) return;
    beep(1318, 90, 'sine', 0.13);             // high confirm chime
    setTimeout(() => beep(1567, 70, 'sine', 0.09), 80); // two-tone ding

    setProcessing(true);
    setError('');
    try {
      const payment = {
        method: selectedMethod,
        amount: chargeAmount,
        buyer: {
          name: buyerName.trim(),
        },
      };
      if (isCardTender) {
        payment.card = { cardType, brand: cardBrand, last4: cardLast4.trim() };
      }

      // Resolve the single product reference for refunds and legacy single-item paths
      const singleProduct = product || items?.[0]?.product;

      // When a discount or price-change override was pre-approved (Sale already
      // exists as APPROVED), finalize it via /complete instead of creating a new one.
      const overrideSaleId  = discount?.saleId || priceOverride?.saleId;
      const overrideId      = discount?.overrideId || priceOverride?.overrideId;
      const isOverrideSale  = !!overrideSaleId;

      // Build line items for new (non-override) sale creation
      const saleLineItems = items && items.length > 0
        ? items.map((i) => ({
            productId: i.product.productId,
            quantity:  i.qty,
            unitPrice: i.sellingPrice,
            discount:  0,
          }))
        : [{
            productId: singleProduct?.productId,
            quantity:  1,
            unitPrice: amount,
            discount:  discount ? discount.amount : 0,
          }];

      const saleRes = isOverrideSale
        ? await fetch(`${API}/api/sales/${overrideSaleId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ discountOverrideId: overrideId }),
          })
        : await fetch(`${API}/api/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              items: saleLineItems,
              payments: [payment],
              discountTotal: discount ? discount.amount : 0,
              ...(discount?.overrideId && { discountOverrideId: discount.overrideId }),
            }),
          });
      const res  = saleRes;
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to process sale');

      setCompletedSale({
        saleId: data._id,
        invoiceNo: data.invoiceNo,
        createdAt: data.createdAt,
        grandTotal: data.grandTotal ?? chargeAmount,
        amount: chargeAmount,
        items,          // multi-item array (may be undefined for legacy)
        product: singleProduct,
        transactionType,
        method: selectedMethod,
        buyer: payment.buyer,
        card: payment.card || null,
      });
    } catch (e) {
      setError(e.message || 'Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const handleNextSale = () => {
    beep(784, 80, 'sine', 0.12);
    setTimeout(() => beep(1046, 110, 'sine', 0.10), 75);
    navigate(terminalPath, { replace: true });
  };

  // ── Refund: search for the original invoice by number or masked card ──────
  // Searches only on what the employee explicitly enters — the terminal's
  // product/amount context is never sent to this request, only used later to
  // auto-match the line item once an invoice is loaded.
  const handleRefundSearch = async () => {
    if (!refundInvoiceNo.trim() && !refundCardSearch.trim()) {
      setRefundSearchError('Enter an invoice number or card last 4 digits to search.');
      return;
    }
    setRefundSearching(true);
    setRefundSearchError('');
    setRefundSearched(true);
    beep(987, 65, 'sine', 0.10);
    try {
      const params = new URLSearchParams();
      if (refundInvoiceNo.trim()) params.set('invoiceNo', refundInvoiceNo.trim());
      if (refundCardSearch.trim()) params.set('cardLast4', refundCardSearch.trim());
      const res = await fetch(`${API}/api/sales/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Search failed');
      setRefundResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setRefundSearchError(e.message);
      setRefundResults([]);
    } finally {
      setRefundSearching(false);
    }
  };

  // ── Refund: pick an invoice → auto-match the item the employee already
  // selected on the terminal (no separate item-picker UI). ──
  const handleSelectRefundInvoice = async (invoice) => {
    beep(1046, 60, 'sine', 0.10);
    setRefundSearchError('');
    try {
      const res = await fetch(`${API}/api/sales/${invoice._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load invoice');
      const saleDetail = data.sale;
      const singleProduct = product || items?.[0]?.product;
      const item = singleProduct
        ? saleDetail.items.find((i) => String(i.productId) === String(singleProduct.productId))
        : null;
      if (!item) {
        setRefundSearchError('This item was not found on that invoice.');
        return;
      }
      const remaining = item.quantity - (item.refundedQty || 0);
      if (remaining <= 0) {
        setRefundSearchError('This item has already been fully refunded on that invoice.');
        return;
      }
      const originalPayment = data.payments?.[0] || null;
      // Quantity defaults to 1 — the "amount" entered on the Terminal is now
      // the actual amount to hand back to the customer, not proportional to
      // unit price × qty, so it can no longer be used to infer a quantity.
      setMatchedSale(saleDetail);
      setMatchedItem(item);
      setMatchedOriginalPayment(originalPayment);
      setRefundQty(1);
      // MOI is the only refund method offered — no need to read the original
      // payment's method back in.
      setRefundCardType(originalPayment?.card?.cardType || 'CREDIT');
      setRefundCardBrand(originalPayment?.card?.brand || 'VISA');
      // Stays on the same 'form' step — matching an invoice just reveals the
      // rest of the refund fields inline, no page navigation.
    } catch (e) {
      setRefundSearchError(e.message);
    }
  };

  const handleClearMatch = () => {
    beep(300, 130, 'sawtooth', 0.11);
    setMatchedSale(null);
    setMatchedItem(null);
    setMatchedOriginalPayment(null);
    setRefundResults([]);
    setRefundSearched(false);
  };

  // ── Refund: submit the request — creates a PENDING ManagerOverride and
  // drops straight into the Overrides queue for a manager to approve from
  // ManagerOverridePage. There is no on-page manager PIN step in the employee
  // portal; this is the only outcome once submitted. ──
  const handleSubmitRefundRequest = async () => {
    if (!canSubmitRefundRequest) return;
    setRefundSubmitting(true);
    setRefundSubmitError('');
    beep(1318, 90, 'sine', 0.13);
    setTimeout(() => beep(1567, 70, 'sine', 0.09), 80);
    try {
      // No buyer details are collected during a refund — the buyer name is
      // carried over from the original sale's payment record so the backend's
      // audit trail still has one, without asking the employee anything.
      const body = {
        saleId: matchedSale._id,
        saleItemId: matchedItem._id,
        quantity: refundQty,
        paymentMethod: refundMethod,
        buyer: { name: matchedOriginalPayment?.buyer?.name?.trim() || 'Walk-in Customer' },
        reason: refundNotes.trim() ? `${refundReason} — ${refundNotes.trim()}` : refundReason,
        idempotencyKey: refundIdempotencyKey,
        tipAmount: refundTipAmount,
      };
      if (refundIsCardTender) body.card = { cardType: refundCardType, brand: refundCardBrand, last4: refundCardLast4.trim() };

      const res = await fetch(`${API}/api/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit refund request');

      setPendingOverride({
        id: data._id,
        createdAt: data.createdAt,
        amount: refundAmount,
        product: { code: matchedItem.sku, name: matchedItem.productName },
        method: refundMethod,
        buyer: body.buyer,
        card: body.card || null,
      });
    } catch (e) {
      setRefundSubmitError(e.message);
    } finally {
      setRefundSubmitting(false);
    }
  };

  // ── Discount override: awaiting manager approval ───────────────────────────
  if (discountPhase === 'pending') {
    return (
      <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(178,106,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HourglassEmptyOutlinedIcon sx={{ fontSize: 28, color: '#B26A00' }} />
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2B1D1A' }}>Awaiting Manager Approval</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#A09490', textAlign: 'center', maxWidth: 300, lineHeight: '18px' }}>
            A manager must authorize this discount in the Overrides queue. This page will continue automatically once approved.
          </p>
        </div>

        <CornerCard borderColor="#DDD2CC" cornerSize={20} cornerHeight={20} style={{ background: '#ffffff', marginBottom: 20 }}>
          <div style={{ background: '#FAF7F5', borderBottom: '1px solid #DDD2CC', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShoppingBagOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Discount Requested</span>
          </div>
          <div style={{ padding: '4px 16px 12px' }}>
            <ReceiptRow label="Original Amount"><span style={{ fontVariantNumeric: 'tabular-nums' }}>${cartSubtotal}</span></ReceiptRow>
            <ReceiptRow label="Discount">
              <span style={{ color: '#B26A00', fontWeight: 800 }}>
                {discountType === 'PERCENTAGE' ? `${discountInputNum}%` : `$${discountInputNum}`} (−${discountComputedAmount.toFixed(2)})
              </span>
            </ReceiptRow>
            <ReceiptRow label="Final Total"><span style={{ fontSize: 16, fontWeight: 800, color: '#2B1D1A' }}>${discountFinalAmount.toFixed(2)}</span></ReceiptRow>
            <ReceiptRow label="Payment">
              {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label || selectedMethod}
              {isCardTender && cardLast4 ? ` (${cardType}) ${cardBrand} •••• ${cardLast4}` : ''}
            </ReceiptRow>
            <ReceiptRow label="Buyer">{buyerName}</ReceiptRow>
          </div>
        </CornerCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => { stopDiscountPolling(); navigate(terminalPath.replace('/terminal', '/overrides')); }}
            style={{ padding: '13px', borderRadius: 10, border: '1px solid #DDD2CC', background: '#ffffff', fontSize: 14, fontWeight: 700, color: '#6B5B57', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            View Overrides
          </button>
          <button onClick={handleCancelDiscountOverride}
            style={{ padding: '12px', borderRadius: 10, border: '1px solid #f4b8b8', background: '#fff', fontSize: 14, fontWeight: 700, color: '#B71C1C', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Back to Editing
          </button>
        </div>
      </div>
    );
  }

  // ── Discount override: denied ───────────────────────────────────────────────
  if (discountPhase === 'denied') {
    return (
      <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(183,28,28,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BlockIcon sx={{ fontSize: 28, color: '#B71C1C' }} />
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2B1D1A' }}>Discount Denied</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#6B5B57', textAlign: 'center' }}>
            {discountDeniedBy} denied this discount request.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleRetryDiscount}
            style={{ padding: '12px', borderRadius: 10, border: '1px solid #DDD2CC', background: '#ffffff', fontSize: 14, fontWeight: 700, color: '#6B5B57', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Try Different Discount
          </button>
          <button onClick={() => { handleRetryDiscount(); handleRemoveDiscount(); }}
            style={{ padding: '12px', borderRadius: 10, border: 'none', background: '#3E2723', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Continue Without Discount
          </button>
        </div>
      </div>
    );
  }

  if (pendingOverride) {
    const methodLabel = PAYMENT_METHODS.find((m) => m.id === pendingOverride.method)?.label || pendingOverride.method;

    const pendingCard = (
      <CornerCard borderColor="#DDD2CC" cornerSize={20} cornerHeight={20} style={{ background: '#ffffff', marginBottom: 20 }}>
        <div style={{ background: '#FAF7F5', borderBottom: '1px solid #DDD2CC', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <ShoppingBagOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
            Refund Request
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '2px 10px', borderRadius: 20, background: 'rgba(178,106,0,0.10)', border: '1px solid rgba(178,106,0,0.30)', color: '#B26A00' }}>PENDING</span>
        </div>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Refund Amount</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#D4A373', marginRight: 1 }}>$</span>
            {pendingOverride.amount}
          </span>
        </div>
        <div style={{ margin: '0 20px', borderTop: '1.5px dashed #E6DAD5' }} />
        <div style={{ padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Product</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '2px 10px', borderRadius: 6, background: '#3E2723', color: '#D4A373', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em' }}>{pendingOverride.product.code}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A' }}>{pendingOverride.product.name}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Payment Method</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B1D1A' }}>{methodLabel}{pendingOverride.card ? ` (${pendingOverride.card.cardType}) ${pendingOverride.card.brand} •••• ${pendingOverride.card.last4}` : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Buyer</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A' }}>{pendingOverride.buyer?.name}</span>
          </div>
        </div>
      </CornerCard>
    );

    const nextSaleBtn = (
      <button onClick={handleNextSale} style={{ height: 56, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, border: '2px solid #D4A373', background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)', color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '0.06em', boxShadow: '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373', cursor: 'pointer' }}>
        Next Sale
      </button>
    );

    if (isDesktop) return (
      <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F5F3F1' }}>
        {/* Left — status */}
        <div style={{ width: 420, flexShrink: 0, borderRight: '1px solid #E4DAD5', background: '#FDFBF9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(178,106,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 34, color: '#B26A00' }} />
          </div>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2B1D1A', textAlign: 'center' }}>Refund Request Submitted</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#A09490', letterSpacing: '0.04em', textAlign: 'center', maxWidth: 300, lineHeight: '20px' }}>
            A manager must verify their PIN in the Overrides queue before this refund is finalized.
          </p>
        </div>
        {/* Right — card + action */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '32px 36px' }}>
          <p style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: '#2B1D1A' }}>Request Details</p>
          {pendingCard}
          <div style={{ marginTop: 'auto' }}>{nextSaleBtn}</div>
        </div>
      </div>
    );

    return (
      <div style={{ padding: '16px 16px 24px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 132px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0 22px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(178,106,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 30, color: '#B26A00' }} />
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2B1D1A' }}>Refund Request Submitted</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#A09490', letterSpacing: '0.04em', textAlign: 'center', maxWidth: 320, lineHeight: '18px' }}>
            A manager must verify their PIN in the Overrides queue before this refund is finalized.
          </p>
        </div>
        {pendingCard}
        <div style={{ flex: 1, minHeight: 12 }} />
        {nextSaleBtn}
      </div>
    );
  }

  if (completedSale) {
    return (
      <CompletedSaleScreen
        sale={completedSale}
        token={token}
        API={API}
        onNewSale={handleNextSale}
        paymentMethods={PAYMENT_METHODS}
      />
    );
  }

  const hasValidState = (items && items.length > 0) || (amount && product);
  if (!hasValidState) {
    return (
      <div style={{
        padding: '40px 20px', textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <p style={{ color: '#B71C1C', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
          Invalid session — no transaction data.
        </p>
        <button
          onClick={() => navigate(terminalPath)}
          style={{
            padding: '11px 28px', background: '#3E2723', color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Back to Terminal
        </button>
      </div>
    );
  }

  // ── Shared: transaction summary card ────────────────────────────────────────
  const summaryCard = (
    <CornerCard borderColor="#DDD2CC" style={{ background: '#ffffff', marginBottom: 24 }}>
      <div style={{ background: '#FAF7F5', borderBottom: '1px solid #DDD2CC', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          <ShoppingBagOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
          Transaction Summary
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '2px 10px', borderRadius: 20, background: isRefund ? 'rgba(183,28,28,0.10)' : 'rgba(46,125,79,0.10)', border: `1px solid ${isRefund ? 'rgba(183,28,28,0.30)' : 'rgba(46,125,79,0.30)'}`, color: isRefund ? '#B71C1C' : '#2E7D4F' }}>
          {isRefund ? 'REFUND' : 'SALE'}
        </span>
      </div>

      {items && items.length > 1 && !discount && !priceOverride && (
        <div style={{ padding: '10px 18px 0' }}>
          {items.map((item, idx) => (
            <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: idx < items.length - 1 ? '1px solid #F0E8E3' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ padding: '1px 6px', borderRadius: 4, background: '#3E2723', color: '#D4A373', fontSize: 10, fontWeight: 800 }}>{item.product.code}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B5B57' }}>{item.product.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2B1D1A', fontVariantNumeric: 'tabular-nums' }}>${item.sellingPrice}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {priceOverride ? (priceOverride.defaultPrice ? 'Catalog Price' : 'Subtotal') : discount ? 'Original Amount' : items && items.length > 1 ? 'Subtotal' : 'Total Amount'}
        </span>
        <span style={{ fontSize: (discount || priceOverride) ? 18 : 28, fontWeight: 800, color: (discount || priceOverride) ? '#6B5B57' : '#2B1D1A', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums', textDecoration: (discount || priceOverride) ? 'line-through' : 'none' }}>
          <span style={{ fontSize: (discount || priceOverride) ? 13 : 16, fontWeight: 700, color: '#A09490', marginRight: 1 }}>$</span>
          {priceOverride && priceOverride.defaultPrice ? priceOverride.defaultPrice : cartSubtotal}
        </span>
      </div>

      {discount && (
        <>
          <div style={{ padding: '0 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Discount {discount.type === 'PERCENTAGE' ? `(${discount.value}%)` : '(Fixed)'}
              {discount.overrideId && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: 'rgba(178,106,0,0.18)', color: '#B26A00', letterSpacing: '0.06em' }}>OVERRIDE</span>}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#2E7D4F' }}>−${discount.amount.toFixed(2)}</span>
          </div>
          <div style={{ padding: '0 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Charged</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#6B5B57', marginRight: 1 }}>$</span>{chargeAmount.toFixed(2)}
            </span>
          </div>
        </>
      )}

      {priceOverride && (
        <>
          <div style={{ padding: '0 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Variance
              <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: 'rgba(178,106,0,0.18)', color: '#B26A00', letterSpacing: '0.06em' }}>OVERRIDE</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#B26A00' }}>
              {priceOverride.sellingPrice > priceOverride.defaultPrice ? '+' : '−'}{Number(priceOverride.variancePercent || 0).toFixed(1)}%
            </span>
          </div>
          <div style={{ padding: '0 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selling Price</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#6B5B57', marginRight: 1 }}>$</span>{chargeAmount}
            </span>
          </div>
        </>
      )}

      <div style={{ margin: '0 20px', borderTop: '1.5px dashed #DDD2CC' }} />
      <div style={{ padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(!items || items.length <= 1) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Product</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(items?.[0]?.product || product) && (
                <>
                  <span style={{ padding: '2px 10px', borderRadius: 6, background: '#3E2723', color: '#D4A373', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em' }}>{(items?.[0]?.product || product)?.code}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A' }}>{(items?.[0]?.product || product)?.name}</span>
                </>
              )}
            </div>
          </div>
        )}
        {items && items.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Items</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B1D1A' }}>{items.length} products</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Type</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: isRefund ? '#B71C1C' : '#2E7D4F', letterSpacing: '0.04em' }}>{isRefund ? 'Refund' : 'Sale'}</span>
        </div>
      </div>
    </CornerCard>
  );

  // ── Shared: payment method grid ───────────────────────────────────────────
  // Commented out — MOI is currently the only payment method, so selection is
  // skipped and buyer details show by default (selectedMethod defaults to 'MOI').
  // Re-enable this block once additional payment methods are added back.
  // const paymentGrid = (
  //   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
  //     {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
  //       const isSelected = selectedMethod === id;
  //       return (
  //         <button key={id} onClick={() => { beep(987, 65, 'sine', 0.10); setSelectedMethod(id); }}
  //           className="active:translate-y-[4px]"
  //           style={{ height: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC', background: isSelected ? 'linear-gradient(160deg, #5D4037 0%, #3E2723 100%)' : '#ffffff', boxShadow: isSelected ? '0 4px 0 #2A1715, 0 6px 16px rgba(42,23,21,0.22)' : '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s', outline: 'none' }}>
  //           <Icon sx={{ fontSize: 30, color: isSelected ? '#D4A373' : '#6B5B57', transition: 'color 0.15s' }} />
  //           <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.01em', color: isSelected ? '#ffffff' : '#2B1D1A', transition: 'color 0.15s' }}>{label}</span>
  //         </button>
  //       );
  //     })}
  //   </div>
  // );

  // ── Shared: buyer details form ────────────────────────────────────────────
  // Not shown during refunds — refunds are identified purely by invoice/card
  // match, no buyer details are collected (see refundSection below).
  const buyerForm = !isRefund && selectedMethod && (
    <div style={{ marginTop: 18, background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 14, padding: '16px 18px' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 14 }}>Buyer Details</span>
      <div>
        <label style={fieldLabel}>Name *</label>
        <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Buyer's full name" style={fieldInput} />
      </div>
      {isCardTender && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
            <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#C4B5B0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Card Reference (from terminal)</span>
            <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Card Type *</label>
            <select value={cardType} onChange={(e) => setCardType(e.target.value)} style={fieldInput}>
              {CARD_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Card Brand</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {CARD_BRANDS.map((b) => {
                const isSelected = cardBrand === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setCardBrand(b)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                      padding: '8px 4px', borderRadius: 9,
                      border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC',
                      background: isSelected ? '#FAF3EC' : '#ffffff',
                      cursor: 'pointer', outline: 'none',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <CardBrandIcon brand={b} size={22} />
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.01em', color: isSelected ? '#3E2723' : '#A09490', whiteSpace: 'nowrap' }}>
                      {CARD_BRAND_META[b]?.label || b}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={fieldLabel}>Last 4 Digits *</label>
            <input ref={cardLast4Ref} type="text" inputMode="numeric" maxLength={4} value={cardLast4} onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" style={fieldInput} />
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11, fontWeight: 500, color: '#A09490', lineHeight: '16px' }}>
            Only the masked card reference is stored — never the full card number, expiry, or CVV.
          </p>
        </>
      )}
    </div>
  );

  // ── Shared: inline discount section ────────────────────────────────────────
  const discountSection = showDiscountSection && (
    <div style={{ marginTop: 18, background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Discount</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#A09490' }}>Excessive discount needs approval</span>
      </div>

      {discount ? (
        // ── Applied / approved discount summary ──
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF3EC', border: '1px solid #EADFD5', borderRadius: 10, padding: '10px 12px' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2B1D1A' }}>
              {discount.type === 'PERCENTAGE' ? `${discount.value}%` : `$${discount.value}`} off
              {discount.overrideId && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: 'rgba(178,106,0,0.18)', color: '#B26A00', letterSpacing: '0.06em' }}>APPROVED</span>}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: '#6B5B57' }}>−${discount.amount.toFixed(2)} · Final ${discount.finalAmount.toFixed(2)}</p>
          </div>
          {!resumedDiscount && (
            <button type="button" onClick={handleRemoveDiscount}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid #DDD2CC', background: '#fff', cursor: 'pointer' }}>
              <CloseOutlinedIcon sx={{ fontSize: 15, color: '#6B5B57' }} />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Type toggle — same button language as the MOI payment-method tile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { id: 'PERCENTAGE', label: 'Percentage %', Icon: PercentOutlinedIcon },
              { id: 'FIXED',      label: 'Fixed Amount $', Icon: AttachMoneyIcon },
            ].map(({ id, label, Icon }) => {
              const active = discountType === id;
              return (
                <button key={id} type="button"
                  onClick={() => { beep(987, 65, 'sine', 0.10); setDiscountType(id); setDiscountInputRaw(''); setDiscountInputError(''); }}
                  className="active:translate-y-[4px]"
                  style={{
                    height: 76, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7,
                    borderRadius: 14,
                    border: active ? '2px solid #D4A373' : '1px solid #DDD2CC',
                    background: active ? 'linear-gradient(160deg, #5D4037 0%, #3E2723 100%)' : '#ffffff',
                    boxShadow: active ? '0 4px 0 #2A1715, 0 6px 16px rgba(42,23,21,0.22)' : '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.05)',
                    cursor: 'pointer', outline: 'none',
                    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                  }}>
                  <Icon sx={{ fontSize: 24, color: active ? '#D4A373' : '#6B5B57', transition: 'color 0.15s' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.01em', color: active ? '#ffffff' : '#2B1D1A', transition: 'color 0.15s' }}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Input */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: '#A09490', pointerEvents: 'none' }}>
              {discountType === 'PERCENTAGE' ? '%' : '$'}
            </span>
            <input
              type="number" min="0" step="0.01"
              max={discountType === 'PERCENTAGE' ? 100 : cartSubtotal}
              value={discountInputRaw}
              onChange={(e) => { setDiscountInputRaw(e.target.value); setDiscountInputError(''); }}
              placeholder="0"
              style={{
                ...fieldInput, padding: '10px 12px 10px 28px',
                border: `1.5px solid ${discountInputError ? '#B71C1C' : discountExceedsLimit ? '#B26A00' : '#DDD2CC'}`,
              }}
            />
          </div>
          {discountInputError && <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#B71C1C' }}>{discountInputError}</p>}

          {discountInputNum > 0 && !discountExceedsLimit && (
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#2E7D4F' }}>
              −${discountComputedAmount.toFixed(2)} · Final ${discountFinalAmount.toFixed(2)}
            </p>
          )}

          {discountExceedsLimit ? (
            <div style={{ background: 'rgba(178,106,0,0.07)', border: '1px solid rgba(178,106,0,0.30)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: '#B26A00', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#B26A00' }}>
                  {DISCOUNT_OVERRIDE_THRESHOLD_PERCENT}%+ discount (−${discountComputedAmount.toFixed(2)}, final ${discountFinalAmount.toFixed(2)}) requires manager approval.
                </p>
              </div>
              <label style={fieldLabel}>Reason for override *</label>
              <textarea
                value={discountReason}
                onChange={(e) => { setDiscountReason(e.target.value); setDiscountOverrideError(''); }}
                placeholder="e.g. Loyalty customer, damaged packaging, manager pre-approval…"
                rows={2}
                style={{ ...fieldInput, resize: 'none', marginBottom: 8 }}
              />
              {discountOverrideError && <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#B71C1C' }}>{discountOverrideError}</p>}
              <button type="button" onClick={handleRequestDiscountOverride} disabled={discountSubmitting}
                style={{ width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: '#B26A00', color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', cursor: discountSubmitting ? 'wait' : 'pointer', opacity: discountSubmitting ? 0.7 : 1 }}>
                {discountSubmitting ? 'Submitting…' : 'Request Manager Override'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={handleApplyDiscount} disabled={discountInputNum <= 0}
              style={{ width: '100%', padding: '11px', borderRadius: 9, border: discountInputNum > 0 ? '1px solid #3E2723' : '1px solid #DDD2CC', background: discountInputNum > 0 ? '#3E2723' : '#fff', color: discountInputNum > 0 ? '#fff' : '#A09490', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', cursor: discountInputNum > 0 ? 'pointer' : 'not-allowed' }}>
              Apply Discount
            </button>
          )}
        </>
      )}
    </div>
  );

  // ── Shared: inline refund section — invoice/card match, tip, method, reason.
  // Renders right on the Select Tender page instead of a separate Locate
  // Invoice / Refund Details page. ──
  const refundSection = isRefund && (
    <div style={{ marginTop: 18, background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 14, padding: '16px 18px' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 14 }}>Match Original Invoice</span>

      {!matchedItem ? (
        <>
          {(product || items?.[0]?.product) && (
            <div style={{ background: '#FAF7F5', border: '1px solid #DDD2CC', borderRadius: 10, marginBottom: 14, display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 8 }}>
              <span style={{ padding: '2px 7px', borderRadius: 5, background: '#3E2723', color: '#D4A373', fontSize: 11, fontWeight: 800 }}>{(product || items?.[0]?.product)?.code}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2B1D1A', flex: 1 }}>{(product || items?.[0]?.product)?.name}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Matching this item</span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={fieldLabel}>Invoice Number</label>
              <input value={refundInvoiceNo} onChange={(e) => setRefundInvoiceNo(e.target.value)} placeholder="e.g. INV-123456" style={fieldInput} />
            </div>
            <div>
              <label style={fieldLabel}>Card Last 4 (Optional)</label>
              <input value={refundCardSearch} inputMode="numeric" maxLength={4}
                onChange={(e) => setRefundCardSearch(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234" style={fieldInput} />
            </div>
          </div>
          <button type="button" onClick={handleRefundSearch} disabled={refundSearching} style={{
            width: '100%', padding: '11px', borderRadius: 9, border: '1px solid #3E2723', background: '#3E2723',
            color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: refundSearching ? 'wait' : 'pointer', opacity: refundSearching ? 0.7 : 1,
          }}>
            <SearchOutlinedIcon sx={{ fontSize: 16 }} />
            {refundSearching ? 'Searching…' : 'Find Invoice'}
          </button>
          {refundSearchError && <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 600, color: '#B71C1C' }}>{refundSearchError}</p>}
          {refundSearched && !refundSearching && refundResults.length === 0 && !refundSearchError && (
            <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 600, color: '#6B5B57' }}>No matching invoices found — check the invoice number or card digits.</p>
          )}
          {refundResults.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {refundResults.map((r) => (
                <button key={r._id} type="button" onClick={() => handleSelectRefundInvoice(r)} style={{
                  textAlign: 'left', background: '#fff', border: '1px solid #DDD2CC', borderRadius: 10,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#2B1D1A' }}>{r.invoiceNo}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: '#A09490' }}>
                      {new Date(r.createdAt).toLocaleDateString([], { dateStyle: 'medium' })} · {r.employeeId?.name || 'Unknown'}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#2B1D1A' }}>${r.grandTotal?.toFixed(2)}</p>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF3EC', border: '1px solid #EADFD5', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#2B1D1A' }}>Invoice {matchedSale.invoiceNo} matched</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: '#6B5B57' }}>{matchedItem.productName} · {refundRemainingQty} remaining refundable</p>
            </div>
            <button type="button" onClick={handleClearMatch}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid #DDD2CC', background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              <CloseOutlinedIcon sx={{ fontSize: 15, color: '#6B5B57' }} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={fieldLabel}>Refund Quantity</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" onClick={() => setRefundQty((q) => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #DDD2CC', background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>−</button>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#2B1D1A', minWidth: 22, textAlign: 'center' }}>{refundQty}</span>
                <button type="button" onClick={() => setRefundQty((q) => Math.min(refundRemainingQty, q + 1))} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #DDD2CC', background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 800 }}>+</button>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={fieldLabel}>Original Refund</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2B1D1A' }}>${refundAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Amount actually handed to the customer — prefilled from what the
              employee entered on the Terminal. The tip is never typed in
              directly; it's always the item's real value minus this amount. */}
          <div style={{ borderTop: '1px dashed #DDD2CC', paddingTop: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ ...fieldLabel, marginBottom: 0 }}>Amount to Refund Customer</p>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#A09490' }}>Item value ${refundAmount.toFixed(2)}</span>
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: '#A09490', pointerEvents: 'none' }}>$</span>
              <input type="number" min="0" step="0.01" max={refundAmount} value={refundFinalRaw} onChange={(e) => setRefundFinalRaw(e.target.value)} placeholder="0.00"
                style={{ ...fieldInput, padding: '10px 12px 10px 26px', border: `1.5px solid ${!refundFinalValid ? '#B71C1C' : '#DDD2CC'}` }} />
            </div>
            {!refundFinalValid && (
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#B71C1C' }}>
                Amount must be between $0 and ${refundAmount.toFixed(2)}.
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Refund</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2B1D1A' }}>${refundAmount.toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              margin: '8px 0', padding: '8px 10px', borderRadius: 8,
              background: refundTipAmount > 0 ? 'rgba(178,106,0,0.10)' : '#F5F3F1',
              border: `1px solid ${refundTipAmount > 0 ? 'rgba(178,106,0,0.30)' : '#DDD2CC'}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: refundTipAmount > 0 ? '#B26A00' : '#A09490', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tip (Auto-Calculated)</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: refundTipAmount > 0 ? '#B26A00' : '#A09490' }}>−${refundTipAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 0' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#2B1D1A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Final Refund</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#2E7D4F' }}>${refundFinalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Refund method selection hidden while MOI is the only option —
              same pattern as the sale-side paymentGrid. Re-enable this grid
              when more refund methods return.
          <p style={{ ...fieldLabel, marginBottom: 8 }}>Refund Method</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
            {REFUND_METHODS.map(({ id, label }) => {
              const isSelected = refundMethod === id;
              return (
                <button key={id} type="button" onClick={() => { beep(987, 65, 'sine', 0.10); setRefundMethod(id); }} style={{
                  padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                  border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC',
                  background: isSelected ? 'rgba(212,163,115,0.10)' : '#fff', cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#2B1D1A' }}>{label}</span>
                </button>
              );
            })}
          </div>
          */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={fieldLabel}>Refund Method</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#2B1D1A' }}>{REFUND_METHODS.find((m) => m.id === refundMethod)?.label || refundMethod}</span>
          </div>

          {refundIsCardTender && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#C4B5B0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Card Reference (from terminal)</span>
                <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Card Type *</label>
                <select value={refundCardType} onChange={(e) => setRefundCardType(e.target.value)} style={fieldInput}>
                  {CARD_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={fieldLabel}>Card Brand</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {CARD_BRANDS.map((b) => {
                    const isSelected = refundCardBrand === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setRefundCardBrand(b)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                          padding: '8px 4px', borderRadius: 9,
                          border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC',
                          background: isSelected ? '#FAF3EC' : '#ffffff',
                          cursor: 'pointer', outline: 'none',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <CardBrandIcon brand={b} size={22} />
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.01em', color: isSelected ? '#3E2723' : '#A09490', whiteSpace: 'nowrap' }}>
                          {CARD_BRAND_META[b]?.label || b}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={fieldLabel}>Last 4 Digits *</label>
                <input inputMode="numeric" maxLength={4} value={refundCardLast4}
                  onChange={(e) => setRefundCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234" style={fieldInput} />
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, fontWeight: 500, color: '#A09490', lineHeight: '16px' }}>
                Only the masked card reference is stored — never the full card number, expiry, or CVV.
              </p>
            </div>
          )}

          <p style={{ ...fieldLabel, marginBottom: 8, marginTop: 4 }}>Refund Reason</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {REFUND_REASONS.map((r) => {
              const isSelected = refundReason === r;
              return (
                <button key={r} type="button" onClick={() => setRefundReason(r)} style={{
                  padding: '7px 14px', borderRadius: 20,
                  border: isSelected ? '1px solid #3E2723' : '1px solid #DDD2CC',
                  background: isSelected ? '#3E2723' : '#fff', color: isSelected ? '#fff' : '#6B5B57',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {r}
                </button>
              );
            })}
          </div>
          <textarea value={refundNotes} onChange={(e) => setRefundNotes(e.target.value)} placeholder="Additional notes (optional)"
            style={{ ...fieldInput, minHeight: 56, resize: 'vertical' }} />
        </>
      )}
    </div>
  );

  // ── Shared: shift-ended notice — non-blocking, since the employee was
  // already mid-checkout when the shift ended. Confirm still works (the
  // server allows a short grace window for sale creation); the NEXT visit
  // to the Terminal is what actually gets locked out (see ShiftGateContext). ──
  const shiftEndBanner = forceLocked && !isRefund && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 10, marginBottom: 16,
      background: 'rgba(183,28,28,0.07)', border: '1px solid rgba(183,28,28,0.22)',
    }}>
      <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: '#B71C1C', flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#B71C1C', lineHeight: 1.4 }}>
        {lockReason} Finish this transaction — you'll be locked out of new sales afterward.
      </span>
    </div>
  );

  // ── Shared: action buttons ─────────────────────────────────────────────────
  const actionButtons = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={isRefund ? handleSubmitRefundRequest : handleProcess} disabled={isRefund ? !canSubmitRefundRequest : !canSubmit}
        style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, border: (isRefund ? canSubmitRefundRequest : canSubmit) ? '2px solid #D4A373' : '1px solid #4a3329', background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)', color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '0.06em', boxShadow: (isRefund ? canSubmitRefundRequest : canSubmit) ? '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373' : '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.16)', opacity: (isRefund ? canSubmitRefundRequest : canSubmit) ? 1 : 0.42, cursor: (isRefund ? canSubmitRefundRequest : canSubmit) ? 'pointer' : 'not-allowed' }}>
        <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />
        {isRefund ? (refundSubmitting ? 'Submitting…' : 'Submit Refund Request') : (processing ? 'Processing…' : 'Process Payment')}
      </button>
      {refundSubmitError && <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#B71C1C', textAlign: 'center' }}>{refundSubmitError}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: '#C4B5B0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
      </div>
      <button onClick={handleCancel}
        style={{ height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, border: '1px solid #f4b8b8', background: '#fff', color: '#B71C1C', fontSize: 14, fontWeight: 700, letterSpacing: '0.03em', boxShadow: '0 2px 0 #e8c8c8, 0 4px 10px rgba(183,28,28,0.06)', cursor: 'pointer' }}>
        <BlockIcon sx={{ fontSize: 17 }} />
        Cancel Transaction
      </button>
    </div>
  );

  // ── Desktop tender form ───────────────────────────────────────────────────
  if (isDesktop) return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F5F3F1' }}>

      {/* Left — summary + payment method */}
      <div style={{ width: 420, flexShrink: 0, borderRight: '1px solid #E4DAD5', background: '#FDFBF9', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <button onClick={handleCancel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, border: '1px solid #DDD2CC', background: '#fff', color: '#3E2723', cursor: 'pointer', boxShadow: '0 2px 0 #c4b8b2', flexShrink: 0 }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </button>
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#2B1D1A' }}>Select Tender</p>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#A09490', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Confirm buyer details</p>
          </div>
        </div>
        {summaryCard}
        {/* Payment method selection hidden while MOI is the only option — see
            commented-out paymentGrid above. Re-add this divider + {paymentGrid}
            when more methods return. */}
      </div>

      {/* Right — buyer details + actions */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '28px 32px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#2B1D1A' }}>Payment Details</p>
        <p style={{ margin: '0 0 20px', fontSize: 12, fontWeight: 500, color: '#A09490' }}>
          Fill in buyer information to complete the transaction.
        </p>
        {shiftEndBanner}
        {buyerForm}
        {discountSection}
        {refundSection}
        {error && <p style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 600, color: '#B71C1C', lineHeight: '18px' }}>{error}</p>}
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>{actionButtons}</div>
      </div>
    </div>
  );

  // ── Mobile tender form ────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 16px 24px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 132px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={handleCancel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, border: '1px solid #DDD2CC', background: '#fff', color: '#3E2723', cursor: 'pointer', boxShadow: '0 2px 0 #c4b8b2', flexShrink: 0 }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2B1D1A', lineHeight: 1.25 }}>Select Tender</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Confirm buyer details</p>
        </div>
      </div>
      {summaryCard}
      {/* Payment method selection hidden while MOI is the only option — see
          commented-out paymentGrid above. Re-add this divider + {paymentGrid}
          when more methods return. */}
      {shiftEndBanner}
      {buyerForm}
      {discountSection}
      {refundSection}
      {error && <p style={{ margin: '14px 0 0', fontSize: 13, fontWeight: 600, color: '#B71C1C', textAlign: 'center', lineHeight: '18px' }}>{error}</p>}
      <div style={{ flex: 1, minHeight: 28 }} />
      {actionButtons}
    </div>
  );
}
