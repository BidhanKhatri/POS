import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import BlockIcon from '@mui/icons-material/Block';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import useAuthStore from '../store/useAuthStore';
import CornerCard from '../components/CornerCard/CornerCard';

const API  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const FONT = "'Plus Jakarta Sans', sans-serif";

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
  width: '100%', padding: '9px 10px', borderRadius: 7,
  border: '1px solid #DDD2CC', fontSize: 13, color: '#2B1D1A',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT,
};

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F', warning: '#B26A00', error: '#B71C1C',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1',
};

function Row({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: last ? 'none' : '1px solid #F0E8E3' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{children}</span>
    </div>
  );
}

export default function PriceVariancePage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  // Multi-item mode: { items, varianceItems, transactionType }
  // Legacy single-item mode: { amount, product, transactionType }
  const { amount, product, items, varianceItems, transactionType } = location.state || {};
  const token     = useAuthStore((s) => s.token);

  const tenderPath   = location.pathname.startsWith('/manager') ? '/manager/tender'   : '/employee/tender';
  const terminalPath = location.pathname.startsWith('/manager') ? '/manager/terminal' : '/employee/terminal';

  // Multi-item mode when `items` array is present
  const isMultiItem = !!(items && items.length > 0);

  // Single-item derived values (backward compat)
  const defaultPrice  = product?.price ?? 0;
  const sellingPrice  = amount ?? 0;
  const variancePct   = defaultPrice > 0
    ? Math.abs((sellingPrice - defaultPrice) / defaultPrice) * 100
    : 0;
  const varianceAbove = sellingPrice > defaultPrice;

  // For multi-item: primary display is the variance items list; cart subtotal = all items
  const cartSubtotal = isMultiItem
    ? items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0)
    : sellingPrice;

  // Override form state
  const [reason, setReason]             = useState('');
  const [overridePayMethod, setOverridePayMethod] = useState(null);
  const [overrideBuyerName, setOverrideBuyerName] = useState('');
  const [overrideBuyerPhone, setOverrideBuyerPhone] = useState('');
  const [overrideBuyerEmail, setOverrideBuyerEmail] = useState('');
  const [overrideCardBrand, setOverrideCardBrand] = useState('VISA');
  const [overrideCardLast4, setOverrideCardLast4] = useState('');
  const [overrideError, setOverrideError] = useState('');

  // Override request state
  const [phase, setPhase]           = useState('entry');
  const [overrideId, setOverrideId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deniedBy, setDeniedBy]     = useState('');

  const pollRef = useRef(null);

  // Redirect if arrived without valid terminal state
  useEffect(() => {
    const hasValidState = isMultiItem || (amount && product);
    if (!hasValidState || transactionType !== 'SL') {
      navigate(terminalPath, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overrideIsCard = overridePayMethod === 'CREDIT' || overridePayMethod === 'DEBIT';
  const canSubmitOverride = !!reason.trim()
    && !!overridePayMethod
    && overrideBuyerName.trim().length > 0
    && (!overrideIsCard || /^\d{4}$/.test(overrideCardLast4.trim()));

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
          setTimeout(() => {
            if (isMultiItem) {
              navigate(tenderPath, {
                state: {
                  amount: cartSubtotal,
                  items,
                  transactionType,
                  priceOverride: {
                    saleId:       draftSaleId,
                    overrideId:   id,
                    items,
                    varianceItems,
                    prefill:      saleContext,
                  },
                },
              });
            } else {
              navigate(tenderPath, {
                state: {
                  amount: sellingPrice,
                  product,
                  transactionType,
                  priceOverride: {
                    saleId:          draftSaleId,
                    overrideId:      id,
                    defaultPrice,
                    sellingPrice,
                    variancePercent: variancePct,
                    prefill:         saleContext,
                  },
                },
              });
            }
          }, 1200);
        } else if (data.status === 'DENIED') {
          stopPolling();
          setDeniedBy(data.approvedBy?.name || 'Manager');
          setPhase('denied');
        }
      } catch { /* keep polling */ }
    }, 3000);
  }, [token, tenderPath, amount, product, items, varianceItems, cartSubtotal, isMultiItem, transactionType, defaultPrice, sellingPrice, variancePct, stopPolling]);

  const handleRequestOverride = async () => {
    setOverrideError('');
    if (!reason.trim())           { setOverrideError('Reason is required.'); return; }
    if (!overridePayMethod)       { setOverrideError('Select a payment method.'); return; }
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

    setSubmitting(true);
    try {
      const body = isMultiItem
        ? {
            // Primary item = highest-variance item (backend picks it too, but send for display)
            productId:       varianceItems[0]?.product?.productId,
            productName:     varianceItems[0]?.product?.name,
            sku:             varianceItems[0]?.product?.sku,
            defaultPrice:    varianceItems[0]?.product?.price,
            sellingPrice:    varianceItems[0]?.sellingPrice,
            variancePercent: varianceItems[0]?.variancePercent,
            reason:          reason.trim(),
            saleContext,
            items,           // all cart items for sale pre-creation
            varianceItems,   // offending items for manager display
          }
        : {
            productId:       product.productId,
            productName:     product.name,
            sku:             product.sku,
            defaultPrice,
            sellingPrice,
            variancePercent: variancePct,
            reason:          reason.trim(),
            saleContext,
          };

      const res = await fetch(`${API}/api/overrides/price-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
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

  // ─────────────────────────────────────────────────────────
  // PHASE: approved
  // ─────────────────────────────────────────────────────────
  if (phase === 'approved') {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 480, margin: '0 auto', fontFamily: FONT, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(46,125,79,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircleOutlinedIcon sx={{ fontSize: 32, color: C.success }} />
        </div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Price Override Approved</p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textSec }}>Proceeding to payment…</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // PHASE: pending
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
            A manager must authorize this price override in the Overrides queue.
          </p>
        </div>

        <CornerCard borderColor={C.border} cornerSize={20} cornerHeight={20} style={{ background: C.surface, marginBottom: 20 }}>
          <div style={{ background: '#FAF7F5', borderBottom: `1px solid ${C.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <SellOutlinedIcon style={{ fontSize: 14, color: C.textDim }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Price Override</span>
          </div>
          <div style={{ padding: '4px 16px 10px' }}>
            {isMultiItem ? (
              <>
                <Row label="Items">{items?.length} item{items?.length > 1 ? 's' : ''} in cart</Row>
                <Row label="Variance Items">{(varianceItems || []).length} exceed{(varianceItems || []).length === 1 ? 's' : ''} limit</Row>
                <Row label="Cart Total"><span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: C.textPri }}>${cartSubtotal}</span></Row>
              </>
            ) : (
              <>
                <Row label="Product">{product?.name} <span style={{ color: C.textDim, fontSize: 11 }}>({product?.code})</span></Row>
                <Row label="Catalog Price"><span style={{ fontVariantNumeric: 'tabular-nums', textDecoration: 'line-through', color: C.textSec }}>${defaultPrice}</span></Row>
                <Row label="Selling Price">
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: C.textPri }}>${sellingPrice}</span>
                </Row>
                <Row label="Variance">
                  <span style={{ color: C.warning, fontWeight: 800 }}>
                    {varianceAbove ? '+' : '−'}{variancePct.toFixed(1)}%
                  </span>
                </Row>
              </>
            )}
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
          <button
            onClick={() => { stopPolling(); navigate(terminalPath, { replace: true }); }}
            style={{
              height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: 12, border: '2px solid #D4A373',
              background: 'linear-gradient(180deg, #5D4037 0%, #3E2723 100%)',
              color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '0.06em',
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
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Price Override Denied</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textSec, textAlign: 'center' }}>
            {deniedBy} denied this price override.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => navigate(terminalPath, { replace: true })}
            style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: C.primary, fontSize: 14, fontWeight: 700, color: '#fff',
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            Back to Terminal
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // PHASE: entry
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 16px 32px', maxWidth: 480, margin: '0 auto', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(terminalPath)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', boxShadow: '0 2px 0 #c4b8b2', flexShrink: 0 }}
        >
          <ArrowBackIcon sx={{ fontSize: 20, color: C.primary }} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri, lineHeight: 1.25 }}>Price Override Required</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.textDim, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            Selling price exceeds the allowed variance
          </p>
        </div>
      </div>

      {/* Price comparison card */}
      <CornerCard borderColor={C.border} style={{ background: C.surface, marginBottom: 14 }}>
        <div style={{ background: '#FAF7F5', borderBottom: `1px solid ${C.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            <ShoppingBagOutlinedIcon style={{ fontSize: 14, color: C.textDim }} />
            {isMultiItem ? `${(varianceItems || []).length} item(s) exceed variance limit` : 'Transaction'}
          </span>
          {!isMultiItem && (
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec }}>
              {product?.code} · {product?.name}
            </span>
          )}
        </div>

        {/* Multi-item: show each variance-exceeding item */}
        {isMultiItem ? (
          <div style={{ padding: '10px 16px' }}>
            {(varianceItems || []).map((item, idx) => {
              const above = item.sellingPrice > item.product.price;
              return (
                <div key={item.id || idx} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                  marginBottom: idx < varianceItems.length - 1 ? 10 : 0,
                  padding: idx < varianceItems.length - 1 ? '0 0 10px' : 0,
                  borderBottom: idx < varianceItems.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.product.code}</p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.textSec }}>{item.product.name}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 700, color: C.textDim, fontVariantNumeric: 'tabular-nums' }}>Catalog: ${item.product.price}</p>
                  </div>
                  <div style={{ background: 'rgba(178,106,0,0.08)', border: '1px solid rgba(178,106,0,0.25)', borderRadius: 8, padding: '7px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, color: C.warning, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Variance</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.warning }}>
                      {above ? '+' : '−'}{Number(item.variancePercent).toFixed(1)}%
                    </p>
                  </div>
                  <div style={{ background: 'rgba(46,125,79,0.06)', border: '1px solid rgba(46,125,79,0.20)', borderRadius: 8, padding: '7px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, color: C.success, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selling</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>${item.sellingPrice}</p>
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 6, borderTop: `1.5px dashed ${C.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cart Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>${cartSubtotal}</span>
            </div>
          </div>
        ) : (
          /* Single-item: existing 3-column layout */
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Catalog</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>${defaultPrice}</p>
            </div>
            <div style={{ background: 'rgba(178,106,0,0.08)', border: '1px solid rgba(178,106,0,0.25)', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: C.warning, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Variance</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.warning }}>
                {varianceAbove ? '+' : '−'}{variancePct.toFixed(1)}%
              </p>
            </div>
            <div style={{ background: 'rgba(46,125,79,0.06)', border: '1px solid rgba(46,125,79,0.20)', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 700, color: C.success, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selling</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>${sellingPrice}</p>
            </div>
          </div>
        )}
      </CornerCard>

      {/* Override request form */}
      <div style={{ background: 'rgba(178,106,0,0.07)', border: '1px solid rgba(178,106,0,0.30)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: C.warning, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.warning }}>
            Manager approval required. Complete payment intent below, then request authorization.
          </p>
        </div>

        {/* Reason */}
        <label style={{ fontSize: 11, fontWeight: 700, color: C.textDim, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          Reason for price override *
        </label>
        <textarea
          value={reason}
          onChange={(e) => { setReason(e.target.value); setOverrideError(''); }}
          placeholder="e.g. Loyalty price match, damaged packaging, promotional adjustment…"
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${overrideError ? C.error : C.border}`,
            fontSize: 13, color: C.textPri, background: C.surface,
            outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: FONT,
            marginBottom: 12,
          }}
        />

        {/* Payment intent divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(178,106,0,0.25)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.warning, letterSpacing: '0.10em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Payment Intent
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(178,106,0,0.25)' }} />
        </div>

        {/* Payment method grid */}
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

        {/* Buyer details */}
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
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

        <button
          onClick={() => navigate(terminalPath)}
          style={{
            padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.surface, fontSize: 14, fontWeight: 600, color: C.textSec,
            cursor: 'pointer', fontFamily: FONT,
          }}
        >
          Cancel — Back to Terminal
        </button>
      </div>
    </div>
  );
}
