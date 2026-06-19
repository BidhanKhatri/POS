import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import { printReceipt, downloadPDF } from '../utils/receiptUtils';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const PAYMENT_METHODS = [
  { id: 'CASH',   label: 'Cash',        icon: AttachMoneyIcon },
  { id: 'CREDIT', label: 'Credit Card', icon: CreditCardIcon },
  { id: 'DEBIT',  label: 'Debit Card',  icon: PaymentIcon },
  { id: 'MISC',   label: 'Misc',        icon: MoreHorizIcon },
];

const CARD_BRANDS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'];

const fieldLabel = {
  fontSize: 11, fontWeight: 700, color: '#A09490', letterSpacing: '0.07em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
};
const fieldInput = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #DDD2CC', fontSize: 14, color: '#2B1D1A',
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
  const isRefund = sale.transactionType === 'RF';
  const mLabel = paymentMethods.find((m) => m.id === sale.method)?.label || sale.method;
  const total = sale.grandTotal ?? sale.amount;
  const dateStr = sale.createdAt
    ? new Date(sale.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  const statusBg    = isRefund ? 'rgba(183,28,28,0.10)' : 'rgba(46,125,79,0.10)';
  const statusColor = isRefund ? '#B71C1C' : '#2E7D4F';
  const statusLabel = isRefund ? 'REFUNDED' : 'PAID';

  // Email state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAddr, setEmailAddr] = useState(sale.buyer?.email || '');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  // PDF state
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleEmail = async () => {
    if (!emailAddr.trim()) return;
    setEmailSending(true);
    setEmailResult(null);
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
    } finally {
      setEmailSending(false);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try { await downloadPDF(sale); }
    catch { /* silent */ }
    finally { setPdfLoading(false); }
  };

  return (
    <div style={{
      padding: '20px 16px 28px',
      maxWidth: 480,
      margin: '0 auto',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      paddingBottom: 80,
    }}>

      {/* ── Receipt card ── */}
      <CornerCard borderColor="#DDD2CC" style={{ background: '#ffffff', marginBottom: 16 }}>
        <div style={{
          background: '#FAF7F5', borderBottom: '1px solid #DDD2CC',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ReceiptLongOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Receipt
          </span>
        </div>

        <div style={{ padding: '4px 16px 12px' }}>
          {/* Product row (acts as the "item" row) */}
          <ReceiptRow label={sale.product?.code || 'Item'}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
              <span>{sale.product?.name}</span>
              <span style={{ fontSize: 11, color: '#A09490', fontWeight: 500 }}>
                1 × ${total}
              </span>
            </div>
          </ReceiptRow>

          {/* Dashed divider */}
          <div style={{ borderTop: '1.5px dashed #E6DAD5', margin: '8px 0' }} />

          {/* Total paid */}
          <ReceiptRow label={isRefund ? 'Total Refunded' : 'Total Paid'}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#2B1D1A' }}>${total}</span>
          </ReceiptRow>

          {/* Status badge row */}
          <ReceiptRow label="Status">
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 10,
              background: statusBg, color: statusColor,
              border: `1px solid ${statusColor}33`,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {statusLabel}
            </span>
          </ReceiptRow>

          {/* Dashed divider */}
          <div style={{ borderTop: '1.5px dashed #E6DAD5', margin: '8px 0' }} />

          {/* Payment + buyer details */}
          <ReceiptRow label="Payment">
            {mLabel}{sale.card ? ` •••• ${sale.card.last4}` : ''}
          </ReceiptRow>
          {sale.buyer?.name  && <ReceiptRow label="Buyer">{sale.buyer.name}</ReceiptRow>}
          {sale.buyer?.phone && <ReceiptRow label="Phone">{sale.buyer.phone}</ReceiptRow>}
          {sale.buyer?.email && <ReceiptRow label="Email">{sale.buyer.email}</ReceiptRow>}
          <ReceiptRow label="Invoice" mono>{sale.invoiceNo}</ReceiptRow>
          {dateStr && <ReceiptRow label="Date"><span style={{ color: '#6B5B57' }}>{dateStr}</span></ReceiptRow>}
        </div>
      </CornerCard>

      {/* ── Receipt actions ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Receipt Actions
          </span>
          <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <ActionBtn onClick={() => printReceipt(sale)} Icon={PrintOutlinedIcon} label="Print" />
          <ActionBtn
            onClick={() => { setEmailOpen((o) => !o); setEmailResult(null); }}
            Icon={EmailOutlinedIcon}
            label="Email"
          />
          <ActionBtn
            onClick={handleDownloadPDF}
            Icon={DownloadOutlinedIcon}
            label={pdfLoading ? 'Wait…' : 'PDF'}
            loading={pdfLoading}
          />
        </div>

        {/* Email panel */}
        {emailOpen && (
          <div style={{
            background: '#ffffff', border: '1px solid #DDD2CC', borderRadius: 12,
            padding: '12px 14px', marginBottom: 10,
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#2B1D1A' }}>Send receipt by email</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                value={emailAddr}
                onChange={(e) => { setEmailAddr(e.target.value); setEmailResult(null); }}
                placeholder="customer@example.com"
                style={{
                  flex: 1, padding: '8px 11px', borderRadius: 8,
                  border: '1px solid #DDD2CC', fontSize: 13, color: '#2B1D1A',
                  background: '#fff', outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
              <button
                onClick={handleEmail}
                disabled={emailSending || !emailAddr.trim()}
                style={{
                  padding: '8px 14px', borderRadius: 8, flexShrink: 0,
                  background: emailSending || !emailAddr.trim() ? '#EFE7E2' : '#3E2723',
                  color: emailSending || !emailAddr.trim() ? '#A09490' : '#fff',
                  border: 'none', fontSize: 13, fontWeight: 700,
                  cursor: emailSending ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <SendOutlinedIcon sx={{ fontSize: 15 }} />
                {emailSending ? '…' : 'Send'}
              </button>
            </div>
            {emailResult && (
              <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: emailResult.ok ? '#2E7D4F' : '#B71C1C' }}>
                {emailResult.msg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── New Sale ── */}
      <button
        onClick={onNewSale}
        style={{
          width: '100%', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          borderRadius: 12,
          border: '2px solid #D4A373',
          background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
          color: '#fff',
          fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
          boxShadow: '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373',
          cursor: 'pointer',
        }}
      >
        <AddCircleOutlineIcon sx={{ fontSize: 20 }} />
        New Sale
      </button>
    </div>
  );
}

export default function TenderPage() {
  const navigate              = useNavigate();
  const location              = useLocation();
  const { amount, product, transactionType, discount } = location.state || {};
  // discount = { type, value, amount: dollarOff, finalAmount, overrideId } | null
  const chargeAmount = discount ? discount.finalAmount : amount;
  const terminalPath          = location.pathname.startsWith('/manager') ? '/manager/terminal' : '/employee/terminal';
  const token                 = useAuthStore((s) => s.token);

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing]         = useState(false);
  const [error, setError]                   = useState('');
  const [completedSale, setCompletedSale]   = useState(null);
  const [pendingOverride, setPendingOverride] = useState(null);

  // Buyer details — collected for every tender type so a refund can be traced back
  // to the person. Card payments only ever capture a masked reference (brand + last
  // 4 digits) from the terminal/processor — never the full PAN, expiry, or CVV.
  const [buyerName, setBuyerName]   = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [cardBrand, setCardBrand]   = useState('VISA');
  const [cardLast4, setCardLast4]   = useState('');

  // When arriving from an approved discount override (via DiscountPage polling or
  // OverridesPage Resume), pre-fill the payment/buyer fields that were captured
  // at override-submission time so the employee only needs to confirm.
  useEffect(() => {
    if (discount?.prefill) {
      const { method, buyer, card } = discount.prefill;
      if (method) setSelectedMethod(method);
      if (buyer?.name)  setBuyerName(buyer.name);
      if (buyer?.phone) setBuyerPhone(buyer.phone);
      if (buyer?.email) setBuyerEmail(buyer.email);
      if (card?.brand)  setCardBrand(card.brand);
      if (card?.last4)  setCardLast4(card.last4);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  const isRefund   = transactionType === 'RF';
  const isCardTender = selectedMethod === 'CREDIT' || selectedMethod === 'DEBIT';

  const buyerNameValid = buyerName.trim().length > 0;
  const cardLast4Valid = !isCardTender || /^\d{4}$/.test(cardLast4.trim());
  const canSubmit = !!selectedMethod && buyerNameValid && cardLast4Valid && !processing;

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
          phone: buyerPhone.trim() || undefined,
          email: buyerEmail.trim() || undefined,
        },
      };
      if (isCardTender) {
        payment.card = { brand: cardBrand, last4: cardLast4.trim() };
      }

      if (isRefund) {
        // Refunds aren't processed directly by the employee — they're sent to the
        // manager's Overrides queue and only take effect once PIN-authorized there.
        const res = await fetch(`${API}/api/overrides`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount,
            productId: product.productId,
            paymentMethod: selectedMethod,
            buyer: payment.buyer,
            card: payment.card,
            reason: `Refund requested at terminal for ${product.code} — ${product.name}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to submit refund request');

        setPendingOverride({
          id: data._id,
          createdAt: data.createdAt,
          amount,
          product,
          method: selectedMethod,
          buyer: payment.buyer,
          card: payment.card || null,
        });
        return;
      }

      // When a discount override was pre-approved (Sale already exists as APPROVED),
      // finalize it via /complete rather than creating a duplicate Sale document.
      const isOverrideSale = !!discount?.saleId;
      const saleRes = isOverrideSale
        ? await fetch(`${API}/api/sales/${discount.saleId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ discountOverrideId: discount.overrideId }),
          })
        : await fetch(`${API}/api/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              items: [{
                productId:  product.productId,
                quantity:   1,
                unitPrice:  amount,
                discount:   discount ? discount.amount : 0,
              }],
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
        grandTotal: data.grandTotal,
        amount,
        product,
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

  if (pendingOverride) {
    const methodLabel = PAYMENT_METHODS.find((m) => m.id === pendingOverride.method)?.label || pendingOverride.method;

    return (
      <div style={{
        padding: '16px 16px 24px',
        maxWidth: 480,
        margin: '0 auto',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100dvh - 132px)',
      }}>

        {/* ── Pending header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0 22px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(178,106,0,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 30, color: '#B26A00' }} />
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2B1D1A' }}>
            Refund Request Submitted
          </p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#A09490', letterSpacing: '0.04em', textAlign: 'center', maxWidth: 320, lineHeight: '18px' }}>
            A manager must verify their PIN in the Overrides queue before this refund is finalized.
          </p>
        </div>

        {/* ── Request card ── */}
        <CornerCard borderColor="#DDD2CC" cornerSize={20} cornerHeight={20} style={{ background: '#ffffff', marginBottom: 20 }}>
          <div style={{
            background: '#FAF7F5', borderBottom: '1px solid #DDD2CC',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              <ShoppingBagOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
              Refund Request
            </span>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              padding: '2px 10px', borderRadius: 20,
              background: 'rgba(178,106,0,0.10)',
              border: '1px solid rgba(178,106,0,0.30)',
              color: '#B26A00',
            }}>
              PENDING
            </span>
          </div>

          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Refund Amount
            </span>
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
                <span style={{ padding: '2px 10px', borderRadius: 6, background: '#3E2723', color: '#D4A373', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em' }}>
                  {pendingOverride.product.code}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A' }}>{pendingOverride.product.name}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Payment Method</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2B1D1A' }}>
                {methodLabel}{pendingOverride.card ? ` •••• ${pendingOverride.card.last4}` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Buyer</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A' }}>{pendingOverride.buyer?.name}</span>
            </div>
          </div>
        </CornerCard>

        <div style={{ flex: 1, minHeight: 12 }} />

        {/* ── Next Sale ── */}
        <button
          onClick={handleNextSale}
          style={{
            height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderRadius: 12,
            border: '2px solid #D4A373',
            background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
            color: '#fff',
            fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
            boxShadow: '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373',
            cursor: 'pointer',
          }}
        >
          Next Sale
        </button>
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

  if (!amount || !product) {
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

  return (
    <div style={{
      padding: '16px 16px 24px',
      maxWidth: 480,
      margin: '0 auto',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      /* fill available viewport so actions anchor to the bottom */
      minHeight: 'calc(100dvh - 132px)',
    }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={handleCancel}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 10,
            border: '1px solid #DDD2CC', background: '#fff', color: '#3E2723',
            cursor: 'pointer', boxShadow: '0 2px 0 #c4b8b2', flexShrink: 0,
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#2B1D1A', lineHeight: 1.25 }}>
            Select Tender
          </p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            Choose payment method
          </p>
        </div>
      </div>

      {/* ── Transaction summary card (receipt style) ── */}
      <CornerCard borderColor="#DDD2CC" style={{ background: '#ffffff', marginBottom: 24 }}>

        {/* Card header strip */}
        <div style={{
          background: '#FAF7F5', borderBottom: '1px solid #DDD2CC',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <ShoppingBagOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
            Transaction Summary
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
            padding: '2px 10px', borderRadius: 20,
            background: isRefund ? 'rgba(183,28,28,0.10)' : 'rgba(46,125,79,0.10)',
            border: `1px solid ${isRefund ? 'rgba(183,28,28,0.30)' : 'rgba(46,125,79,0.30)'}`,
            color: isRefund ? '#B71C1C' : '#2E7D4F',
          }}>
            {isRefund ? 'REFUND' : 'SALE'}
          </span>
        </div>

        {/* Amount row */}
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {discount ? 'Original Amount' : 'Total Amount'}
          </span>
          <span style={{ fontSize: discount ? 18 : 28, fontWeight: 800, color: discount ? '#6B5B57' : '#2B1D1A', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums', textDecoration: discount ? 'line-through' : 'none' }}>
            <span style={{ fontSize: discount ? 13 : 16, fontWeight: 700, color: '#A09490', marginRight: 1 }}>$</span>
            {amount}
          </span>
        </div>

        {/* Discount rows — only rendered when a discount was applied */}
        {discount && (
          <>
            <div style={{ padding: '0 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Discount {discount.type === 'PERCENTAGE' ? `(${discount.value}%)` : '(Fixed)'}
                {discount.overrideId && (
                  <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: 'rgba(178,106,0,0.18)', color: '#B26A00', letterSpacing: '0.06em' }}>
                    OVERRIDE
                  </span>
                )}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#2E7D4F' }}>
                −${discount.amount.toFixed(2)}
              </span>
            </div>
            <div style={{ padding: '0 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Total Charged
              </span>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#6B5B57', marginRight: 1 }}>$</span>
                {chargeAmount.toFixed(2)}
              </span>
            </div>
          </>
        )}

        {/* Dashed separator */}
        <div style={{ margin: '0 20px', borderTop: '1.5px dashed #DDD2CC' }} />

        {/* Product & type rows */}
        <div style={{ padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Product
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '2px 10px', borderRadius: 6,
                background: '#3E2723', color: '#D4A373',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
              }}>
                {product.code}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A' }}>
                {product.name}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Type
            </span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: isRefund ? '#B71C1C' : '#2E7D4F',
              letterSpacing: '0.04em',
            }}>
              {isRefund ? 'Refund' : 'Sale'}
            </span>
          </div>
        </div>
      </CornerCard>

      {/* ── Payment method section ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#A09490',
          letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          Payment Method
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      {/* ── 2×2 payment grid — fluid, works on all mobile sizes ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
      }}>
        {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
          const isSelected = selectedMethod === id;
          return (
            <button
              key={id}
              onClick={() => {
                beep(987, 65, 'sine', 0.10); // mid ping — payment method selected
                setSelectedMethod(id);
              }}
              className="active:translate-y-[4px]"
              style={{
                height: 96,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 9,
                borderRadius: 14,
                border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC',
                background: isSelected
                  ? 'linear-gradient(160deg, #5D4037 0%, #3E2723 100%)'
                  : '#ffffff',
                boxShadow: isSelected
                  ? '0 4px 0 #2A1715, 0 6px 16px rgba(42,23,21,0.22)'
                  : '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                outline: 'none',
              }}
            >
              <Icon sx={{
                fontSize: 30,
                color: isSelected ? '#D4A373' : '#6B5B57',
                transition: 'color 0.15s',
              }} />
              <span style={{
                fontSize: 13, fontWeight: 700, letterSpacing: '0.01em',
                color: isSelected ? '#ffffff' : '#2B1D1A',
                transition: 'color 0.15s',
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Buyer details ── */}
      {selectedMethod && (
        <div style={{
          marginTop: 18,
          background: '#ffffff',
          border: '1px solid #DDD2CC',
          borderRadius: 14,
          padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Buyer Details
            </span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Name *</label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Buyer's full name"
              style={fieldInput}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: isCardTender ? 12 : 0 }}>
            <div>
              <label style={fieldLabel}>Phone</label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="Optional"
                style={fieldInput}
              />
            </div>
            <div>
              <label style={fieldLabel}>Email</label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="Optional"
                style={fieldInput}
              />
            </div>
          </div>

          {isCardTender && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#C4B5B0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Card Reference (from terminal)
                </span>
                <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={fieldLabel}>Card Brand</label>
                  <select
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    style={fieldInput}
                  >
                    {CARD_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>Last 4 Digits *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1234"
                    style={fieldInput}
                  />
                </div>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, fontWeight: 500, color: '#A09490', lineHeight: '16px' }}>
                Only the masked card reference is stored — never the full card number, expiry, or CVV.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Error message ── */}
      {error && (
        <p style={{
          margin: '14px 0 0', fontSize: 13, fontWeight: 600, color: '#B71C1C',
          textAlign: 'center', lineHeight: '18px',
        }}>
          {error}
        </p>
      )}

      {/* ── Spacer — pushes actions to bottom ── */}
      <div style={{ flex: 1, minHeight: 28 }} />

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Process Payment */}
        <button
          onClick={handleProcess}
          disabled={!canSubmit}
          style={{
            height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderRadius: 12,
            border: canSubmit ? '2px solid #D4A373' : '1px solid #4a3329',
            background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
            color: '#fff',
            fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
            boxShadow: canSubmit
              ? '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373'
              : '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.16)',
            opacity: canSubmit ? 1 : 0.42,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          <CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />
          {processing ? 'Processing…' : 'Process Payment'}
        </button>

        {/* Divider with label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#C4B5B0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#EDE5E0' }} />
        </div>

        {/* Cancel Transaction */}
        <button
          onClick={handleCancel}
          style={{
            height: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            borderRadius: 12,
            border: '1px solid #f4b8b8',
            background: '#fff',
            color: '#B71C1C',
            fontSize: 14, fontWeight: 700, letterSpacing: '0.03em',
            boxShadow: '0 2px 0 #e8c8c8, 0 4px 10px rgba(183,28,28,0.06)',
            cursor: 'pointer',
          }}
        >
          <BlockIcon sx={{ fontSize: 17 }} />
          Cancel Transaction
        </button>

      </div>
    </div>
  );
}
