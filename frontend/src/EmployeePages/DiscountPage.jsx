import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import BlockIcon from '@mui/icons-material/Block';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

import { API_URL as API } from '../config/api';
const FONT = "'Plus Jakarta Sans', sans-serif";

const PAYMENT_METHODS = [
  { id: 'CASH',   label: 'Cash',        icon: AttachMoneyIcon },
  { id: 'MOI',    label: 'MOI',         icon: CreditCardIcon },
  { id: 'DEBIT',  label: 'Debit Card',  icon: PaymentIcon },
  { id: 'MISC',   label: 'Misc',        icon: MoreHorizIcon },
];
const CARD_BRANDS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'];

const fieldLabel = {
  fontSize: 11, fontWeight: 700, color: '#A09490', letterSpacing: '0.07em',
  textTransform: 'uppercase', display: 'block', marginBottom: 5,
};
const fieldInput = {
  width: '100%', padding: '9px 10px', borderRadius: 7,
  border: '1px solid #DDD2CC', fontSize: 16, color: '#2B1D1A',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT,
};

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
};

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

export default function DiscountPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { amount, product, items, transactionType } = location.state || {};
  // items = [{id, product, sellingPrice, qty}] for multi-item sales; product = single item legacy
  const token     = useAuthStore((s) => s.token);

  const tenderPath  = location.pathname.startsWith('/manager') ? '/manager/tender'   : '/employee/tender';
  const terminalPath = location.pathname.startsWith('/manager') ? '/manager/terminal' : '/employee/terminal';

  // ── Discount entry state ──
  const [discountType, setDiscountType] = useState('PERCENTAGE'); // 'PERCENTAGE' | 'FIXED'
  const [inputRaw, setInputRaw]         = useState('');
  const [reason, setReason]             = useState('');
  const [limitError, setLimitError]     = useState('');
  const [inputError, setInputError]     = useState('');

  // ── Discount limit from settings ──
  const [maxDiscountPercent, setMaxDiscountPercent] = useState(10);

  // ── Override request state ──
  // phase: 'entry' | 'pending' | 'approved' | 'denied'
  const [phase, setPhase]         = useState('entry');
  const [overrideId, setOverrideId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState('');
  const [deniedBy, setDeniedBy]   = useState('');

  // ── Sale context captured before override submission ──
  // Stored server-side so manager sees full context and employee can resume.
  const [overridePayMethod, setOverridePayMethod] = useState(null);
  const [overrideBuyerName, setOverrideBuyerName] = useState('');
  const [overrideBuyerPhone, setOverrideBuyerPhone] = useState('');
  const [overrideBuyerEmail, setOverrideBuyerEmail] = useState('');
  const [overrideCardBrand, setOverrideCardBrand] = useState('VISA');
  const [overrideCardLast4, setOverrideCardLast4] = useState('');

  const pollRef = useRef(null);

  // ── Fetch discount limit on mount ──
  useEffect(() => {
    fetch(`${API}/api/settings/discount-limit`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.maxDiscountPercent != null) setMaxDiscountPercent(d.maxDiscountPercent); })
      .catch(() => {}); // silently fall back to default 10%
  }, [token]);

  // Guard: redirect if page loaded without valid terminal state
  useEffect(() => {
    const hasItems = (items && items.length > 0) || !!product;
    if (!amount || !hasItems || transactionType !== 'SL') {
      navigate(terminalPath, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Computed discount values ──
  const inputNum = parseFloat(inputRaw) || 0;

  const discountAmount = discountType === 'PERCENTAGE'
    ? Math.round((amount * Math.min(inputNum, 100)) / 100 * 100) / 100
    : Math.min(inputNum, amount - 0.01); // fixed can't wipe the whole sale

  const finalAmount = Math.max(0, amount - discountAmount);

  const discountPercent = amount > 0 ? (discountAmount / amount) * 100 : 0;

  const exceedsLimit = inputNum > 0 && discountPercent > maxDiscountPercent;

  // Override submission gate — requires reason + payment intent + buyer name
  const overrideIsCard = overridePayMethod === 'MOI' || overridePayMethod === 'DEBIT';
  const canSubmitOverride = !!reason.trim()
    && !!overridePayMethod
    && overrideBuyerName.trim().length > 0
    && (!overrideIsCard || /^\d{4}$/.test(overrideCardLast4.trim()));

  // Clear limit error when input drops back within bounds
  useEffect(() => {
    if (!exceedsLimit) setLimitError('');
  }, [exceedsLimit]);

  // ── Poll override status ──
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback((id, draftSaleId, saleContext) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/overrides/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'APPROVED') {
          stopPolling();
          setPhase('approved');
          // Brief moment to show "Approved" before navigating
          setTimeout(() => {
            navigate(tenderPath, {
              state: {
                amount,
                product,
                items,
                transactionType,
                discount: {
                  type:        discountType,
                  value:       inputNum,
                  amount:      discountAmount,
                  finalAmount,
                  overrideId:  id,
                  saleId:      draftSaleId,
                  prefill:     saleContext,
                },
              },
            });
          }, 1200);
        } else if (data.status === 'DENIED') {
          stopPolling();
          setDeniedBy(data.approvedBy?.name || 'Manager');
          setPhase('denied');
        }
      } catch { /* network hiccup — keep polling */ }
    }, 3000);
  }, [token, tenderPath, amount, product, transactionType, discountType, inputNum, discountAmount, finalAmount, stopPolling]);

  // ── Actions ──
  const handleSkip = () => {
    navigate(tenderPath, {
      state: { amount, product, items, transactionType, discount: null },
    });
  };

  const handleApply = () => {
    setInputError('');
    if (inputNum <= 0) { setInputError('Enter a discount amount greater than 0.'); return; }
    if (discountAmount >= amount) { setInputError('Discount cannot equal or exceed the total amount.'); return; }
    if (exceedsLimit) { setLimitError('Discount exceeds your limit. Enter a reason and request manager approval.'); return; }

    navigate(tenderPath, {
      state: {
        amount,
        product,
        items,
        transactionType,
        discount: {
          type: discountType,
          value: inputNum,
          amount: discountAmount,
          finalAmount,
          overrideId: null,
        },
      },
    });
  };

  const handleRequestOverride = async () => {
    setOverrideError('');
    if (!reason.trim()) { setOverrideError('Reason is required.'); return; }
    if (!overridePayMethod) { setOverrideError('Select a payment method.'); return; }
    if (!overrideBuyerName.trim()) { setOverrideError('Buyer name is required.'); return; }
    if (overrideIsCard && !/^\d{4}$/.test(overrideCardLast4.trim())) {
      setOverrideError('Enter the 4-digit card reference.'); return;
    }

    const saleContext = {
      paymentMethod: overridePayMethod,
      buyer: {
        name:  overrideBuyerName.trim(),
        phone: overrideBuyerPhone.trim() || undefined,
        email: overrideBuyerEmail.trim() || undefined,
      },
      ...(overrideIsCard && {
        card: { brand: overrideCardBrand, last4: overrideCardLast4.trim() },
      }),
    };

    // Build primary product identifiers for the override record
    const primaryProduct = (items && items.length > 0) ? items[0].product : product;
    const overrideProductName = (items && items.length > 1)
      ? `${items.length} items`
      : primaryProduct?.name;

    // Build items array for multi-item sale pre-creation
    const saleItems = (items && items.length > 0)
      ? items.map((i) => ({
          productId:   i.product.productId,
          productName: i.product.name,
          sku:         i.product.sku || '',
          unitPrice:   i.sellingPrice,
          qty:         i.qty,
        }))
      : null;

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/overrides/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId:      primaryProduct?.productId,
          productName:    overrideProductName,
          sku:            primaryProduct?.sku,
          amount,
          discountType,
          discountValue:  inputNum,
          discountAmount,
          reason:         reason.trim(),
          saleContext,
          ...(saleItems && saleItems.length > 1 && { items: saleItems }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit override request');
      setOverrideId(data._id);
      setPhase('pending');
      startPolling(data._id, data.saleId || null, saleContext);
    } catch (e) {
      setOverrideError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOverride = () => {
    stopPolling();
    setPhase('entry');
    setOverrideId(null);
  };

  const handleRetryDiscount = () => {
    setPhase('entry');
    setOverrideId(null);
    setDeniedBy('');
    setReason('');
  };

  // ─────────────────────────────────────────────────────────
  // PHASE: approved (brief flash before auto-navigate)
  // ─────────────────────────────────────────────────────────
  if (phase === 'approved') {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 480, margin: '0 auto', fontFamily: FONT, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(46,125,79,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircleOutlinedIcon sx={{ fontSize: 32, color: C.success }} />
        </div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Discount Approved</p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textSec }}>Proceeding to payment…</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // PHASE: pending (override submitted, waiting)
  // ─────────────────────────────────────────────────────────
  if (phase === 'pending') {
    return (
      <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(178,106,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HourglassEmptyOutlinedIcon sx={{ fontSize: 28, color: C.warning }} />
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Awaiting Manager Approval</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.textDim, textAlign: 'center', maxWidth: 300, lineHeight: '18px' }}>
            A manager must authorize this discount in the Overrides queue.
          </p>
        </div>

        {/* Discount summary */}
        <CornerCard borderColor={C.border} cornerSize={20} cornerHeight={20} style={{ background: C.surface, marginBottom: 20 }}>
          <div style={{ background: '#FAF7F5', borderBottom: `1px solid ${C.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShoppingBagOutlinedIcon style={{ fontSize: 14, color: C.textDim }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Transaction</span>
          </div>
          <div style={{ padding: '4px 16px 10px' }}>
            <Row label="Product">
              {items && items.length > 1
                ? `${items.length} items`
                : product
                ? <>{product.name} <span style={{ color: C.textDim, fontSize: 11 }}>({product.code})</span></>
                : items?.[0]?.product.name}
            </Row>
            <Row label="Original Amount"><span style={{ fontVariantNumeric: 'tabular-nums' }}>${amount}</span></Row>
            <Row label="Discount Requested">
              <span style={{ color: C.warning, fontWeight: 800 }}>
                {discountType === 'PERCENTAGE' ? `${inputNum}%` : `$${inputNum}`} (−${discountAmount.toFixed(2)})
              </span>
            </Row>
            <Row label="Final Total">
              <span style={{ fontSize: 16, fontWeight: 800, color: C.textPri }}>${finalAmount.toFixed(2)}</span>
            </Row>
            {overridePayMethod && (
              <Row label="Payment">
                {PAYMENT_METHODS.find((m) => m.id === overridePayMethod)?.label || overridePayMethod}
                {overrideIsCard && overrideCardLast4 ? ` •••• ${overrideCardLast4}` : ''}
              </Row>
            )}
            {overrideBuyerName && (
              <Row label="Buyer" last>{overrideBuyerName}</Row>
            )}
          </div>
        </CornerCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* View Overrides — top */}
          <button
            onClick={() => { stopPolling(); navigate('/employee/overrides'); }}
            style={{
              padding: '13px', borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.surface, fontSize: 14, fontWeight: 700, color: C.textSec,
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            View Overrides
          </button>

          {/* Next Sale — bottom, matches TenderPage completed-flow button */}
          <button
            onClick={() => { stopPolling(); navigate(terminalPath, { replace: true }); }}
            style={{
              height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 12,
              border: '2px solid #D4A373',
              background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
              color: '#fff',
              fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
              boxShadow: '0 4px 0 #2A1715, 0 6px 14px rgba(42,23,21,0.28), 0 0 0 1px #D4A373',
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            Next Sale
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // PHASE: denied
  // ─────────────────────────────────────────────────────────
  if (phase === 'denied') {
    return (
      <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(183,28,28,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BlockIcon sx={{ fontSize: 28, color: C.error }} />
          </div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Override Denied</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textSec, textAlign: 'center' }}>
            {deniedBy} denied this discount request.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleRetryDiscount}
            style={{
              padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.surface, fontSize: 14, fontWeight: 700, color: C.textSec,
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            Try Different Discount
          </button>
          <button
            onClick={handleSkip}
            style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: C.primary, fontSize: 14, fontWeight: 700, color: '#fff',
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            Continue Without Discount
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // PHASE: entry (main discount form)
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(terminalPath)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', boxShadow: '0 2px 0 #c4b8b2', flexShrink: 0 }}
        >
          <ArrowBackIcon sx={{ fontSize: 20, color: C.primary }} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, lineHeight: 1.25 }}>Apply Discount</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            Limit: {maxDiscountPercent}% per transaction
          </p>
        </div>
      </div>

      {/* ── Transaction summary card ── */}
      <CornerCard borderColor={C.border} style={{ background: C.surface, marginBottom: 6 }}>
        <div style={{ background: '#FAF7F5', borderBottom: `1px solid ${C.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <ShoppingBagOutlinedIcon style={{ fontSize: 14, color: C.textDim }} />
            Transaction
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>
            {items && items.length > 1
              ? `${items.length} items`
              : product
              ? `${product.code} · ${product.name}`
              : items?.[0]
              ? `${items[0].product.code} · ${items[0].product.name}`
              : ''}
          </span>
        </div>

        {/* Multi-item line list */}
        {items && items.length > 1 && (
          <div style={{ padding: '8px 16px 0' }}>
            {items.map((item, idx) => (
              <div key={item.id || idx} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 0', borderBottom: idx < items.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ padding: '1px 6px', borderRadius: 4, background: C.primary, color: C.accent, fontSize: 10, fontWeight: 800 }}>
                    {item.product.code}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>{item.product.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>${item.sellingPrice}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: items && items.length > 1 ? '8px 16px 12px' : '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {items && items.length > 1 ? 'Subtotal' : 'Sale Amount'}
          </span>
          <span style={{ fontSize: 28, fontWeight: 800, color: C.textPri, letterSpacing: '-0.8px', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.textSec, marginRight: 1 }}>$</span>{amount}
          </span>
        </div>
      </CornerCard>

      <Divider label="Discount" />

      {/* ── Type toggle ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { id: 'PERCENTAGE', label: 'Percentage %', Icon: PercentOutlinedIcon },
          { id: 'FIXED',      label: 'Fixed Amount $', Icon: AttachMoneyIcon },
        ].map(({ id, label, Icon }) => {
          const active = discountType === id;
          return (
            <button
              key={id}
              onClick={() => { setDiscountType(id); setInputRaw(''); setInputError(''); setLimitError(''); }}
              style={{
                padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                border: active ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                background: active ? C.primary : C.surface,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 0.15s', fontFamily: FONT,
              }}
            >
              <Icon sx={{ fontSize: 22, color: active ? C.accent : C.textDim }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : C.textSec }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Input ── */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          {discountType === 'PERCENTAGE' ? 'Discount Percentage' : 'Discount Amount'}
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, fontWeight: 700, color: C.textDim, pointerEvents: 'none' }}>
            {discountType === 'PERCENTAGE' ? '%' : '$'}
          </span>
          <input
            type="number"
            min="0"
            max={discountType === 'PERCENTAGE' ? 100 : amount}
            step="0.01"
            value={inputRaw}
            onChange={(e) => { setInputRaw(e.target.value); setInputError(''); setLimitError(''); }}
            placeholder="0"
            style={{
              width: '100%', padding: '12px 12px 12px 30px', borderRadius: 9,
              border: `1.5px solid ${(inputError || limitError) ? C.error : exceedsLimit ? C.warning : C.border}`,
              fontSize: 18, fontWeight: 700, color: C.textPri,
              background: C.surface, outline: 'none', boxSizing: 'border-box', fontFamily: FONT,
              transition: 'border-color 0.15s',
            }}
          />
        </div>
        {inputError && (
          <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 600, color: C.error }}>{inputError}</p>
        )}
      </div>

      {/* ── Live preview ── */}
      {inputNum > 0 && (
        <div style={{ background: C.bg, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <Row label="Original">${amount}</Row>
          <Row label="Discount">
            <span style={{ color: exceedsLimit ? C.warning : C.success, fontWeight: 800 }}>
              −${discountAmount.toFixed(2)}
              {discountType === 'FIXED' && amount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}> ({discountPercent.toFixed(1)}%)</span>
              )}
            </span>
          </Row>
          <div style={{ borderTop: `1.5px dashed ${C.border}`, margin: '8px 0' }} />
          <Row label="Final Total" last>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>
              ${finalAmount.toFixed(2)}
            </span>
          </Row>
        </div>
      )}

      {/* ── Limit warning + override section ── */}
      {exceedsLimit && (
        <div style={{ background: 'rgba(178,106,0,0.07)', border: `1px solid rgba(178,106,0,0.30)`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: C.warning, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.warning }}>
              Discount exceeds your limit of {maxDiscountPercent}%. Complete payment intent below, then request manager approval.
            </p>
          </div>

          {/* Reason */}
          <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Reason for override *
          </label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setOverrideError(''); }}
            placeholder="e.g. Loyalty customer, damaged packaging, manager pre-approval…"
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: `1px solid ${overrideError ? C.error : C.border}`,
              fontSize: 13, color: C.textPri, background: C.surface,
              outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: FONT,
              marginBottom: 12,
            }}
          />

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(178,106,0,0.25)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.warning, letterSpacing: '0.10em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Payment Intent
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(178,106,0,0.25)' }} />
          </div>

          {/* Payment method 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 10 }}>
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
              const sel = overridePayMethod === id;
              return (
                <button
                  key={id}
                  onClick={() => { setOverridePayMethod(id); setOverrideError(''); }}
                  style={{
                    height: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    borderRadius: 9,
                    border: sel ? `2px solid ${C.warning}` : `1px solid ${C.border}`,
                    background: sel ? 'rgba(178,106,0,0.12)' : C.surface,
                    cursor: 'pointer', fontFamily: FONT, outline: 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <Icon sx={{ fontSize: 18, color: sel ? C.warning : C.textDim }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: sel ? C.warning : C.textSec }}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Buyer details — shown once a payment method is chosen */}
          {overridePayMethod && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={fieldLabel}>Buyer Name *</label>
                <input
                  type="text"
                  value={overrideBuyerName}
                  onChange={(e) => { setOverrideBuyerName(e.target.value); setOverrideError(''); }}
                  placeholder="Buyer's full name"
                  style={fieldInput}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={fieldLabel}>Phone</label>
                  <input
                    type="tel"
                    value={overrideBuyerPhone}
                    onChange={(e) => setOverrideBuyerPhone(e.target.value)}
                    placeholder="Optional"
                    style={fieldInput}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>Email</label>
                  <input
                    type="email"
                    value={overrideBuyerEmail}
                    onChange={(e) => setOverrideBuyerEmail(e.target.value)}
                    placeholder="Optional"
                    style={fieldInput}
                  />
                </div>
              </div>
              {overrideIsCard && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={fieldLabel}>Card Brand</label>
                    <select
                      value={overrideCardBrand}
                      onChange={(e) => setOverrideCardBrand(e.target.value)}
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
                      value={overrideCardLast4}
                      onChange={(e) => { setOverrideCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4)); setOverrideError(''); }}
                      placeholder="1234"
                      style={fieldInput}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {overrideError && (
            <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 600, color: C.error }}>{overrideError}</p>
          )}
          {limitError && !overrideError && (
            <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 600, color: C.warning }}>{limitError}</p>
          )}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        {exceedsLimit ? (
          <button
            onClick={handleRequestOverride}
            disabled={submitting || !canSubmitOverride}
            style={{
              padding: '13px', borderRadius: 10, border: canSubmitOverride ? 'none' : `1px solid ${C.border}`,
              background: canSubmitOverride ? C.warning : C.bg,
              fontSize: 14, fontWeight: 800, color: canSubmitOverride ? '#fff' : C.textDim,
              cursor: (submitting || !canSubmitOverride) ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              fontFamily: FONT, letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
          >
            {submitting ? 'Submitting…' : 'Request Manager Override'}
          </button>
        ) : (
          <button
            onClick={handleApply}
            disabled={inputNum <= 0}
            style={{
              padding: '13px', borderRadius: 10, border: inputNum > 0 ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
              background: inputNum > 0 ? C.primary : C.surface,
              fontSize: 14, fontWeight: 800, color: inputNum > 0 ? '#fff' : C.textDim,
              cursor: inputNum > 0 ? 'pointer' : 'not-allowed',
              fontFamily: FONT, letterSpacing: '0.04em',
              boxShadow: inputNum > 0 ? '0 4px 0 #2A1715' : 'none',
              transition: 'all 0.15s',
            }}
          >
            Apply Discount
          </button>
        )}

        <button
          onClick={handleSkip}
          style={{
            padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.surface, fontSize: 14, fontWeight: 600, color: C.textSec,
            cursor: 'pointer', fontFamily: FONT,
          }}
        >
          Skip — No Discount
        </button>
      </div>

    </div>
  );
}

// ── Shared row helper ──
function Row({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: last ? 'none' : '1px solid #F0E8E3' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{children}</span>
    </div>
  );
}
