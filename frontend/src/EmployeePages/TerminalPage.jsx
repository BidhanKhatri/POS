import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CornerCard from '../components/CornerCard/CornerCard';
import useAuthStore from '../store/useAuthStore';
import { useLoading } from '../context/LoadingContext';

import { API_URL as API } from '../config/api';

const NUM_KEY =
  'flex items-center justify-center select-none cursor-pointer rounded-xl ' +
  'border border-divider-tone bg-white ' +
  'shadow-[0_4px_0_#c4b8b2,0_6px_12px_rgba(0,0,0,0.06)] ' +
  'active:translate-y-[4px] active:shadow-[0_0px_0_#c4b8b2,0_2px_4px_rgba(0,0,0,0.04)] ' +
  'transition-all duration-75';

function toDisplay(raw) {
  return parseInt(raw || '0', 10).toString();
}

export default function TerminalPage() {
  const navigate          = useNavigate();
  const location          = useLocation();
  const { pathname }      = location;
  const tenderPath        = pathname.startsWith('/manager') ? '/manager/tender'         : '/employee/tender';
  const discountPath      = pathname.startsWith('/manager') ? '/manager/discount'       : '/employee/discount';
  const refundPath        = pathname.startsWith('/manager') ? '/manager/refund'         : '/employee/refund';
  const priceVariancePath = pathname.startsWith('/manager') ? '/manager/price-variance' : '/employee/price-variance';
  const token             = useAuthStore((s) => s.token);
  const user              = useAuthStore((s) => s.user);
  const isDesktop         = useMediaQuery('(min-width:1024px)');
  const { stopLoading }   = useLoading();

  // ── Shift gate (employees only) ──
  const [gateShift,    setGateShift]    = useState(null);
  const [gateLoading,  setGateLoading]  = useState(true);
  const [todayShifts,  setTodayShifts]  = useState(null); // null = loading, [] = no shifts
  const [schedLoading, setSchedLoading] = useState(true);

  // ── Cart state ──
  const [cartItems, setCartItems]       = useState([]); // [{id, product, sellingPrice, qty}]
  const [currentProduct, setCurrentProduct] = useState(null); // product being selected for current line
  const [amountRaw, setAmountRaw]       = useState('');  // selling price being typed
  const [transactionType, setTransactionType] = useState(null); // 'RF' | 'SL' | null

  const [toast, setToast]               = useState(null);
  const [products, setProducts]         = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const toastTimer  = useRef(null);
  const audioCtx    = useRef(null);
  const itemIdRef   = useRef(0);

  /* ── Pre-select product from barcode scanner ── */
  useEffect(() => {
    const bp = location.state?.barcodeProduct;
    if (bp) {
      setCurrentProduct(bp);
      setAmountRaw(String(Math.round(bp.price * 100)));
      // clear the state so a back-navigation doesn't re-trigger
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load quick-slot products (P1-P9) ── */
  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    fetch(`${API}/api/products`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        const quickSlots = list
          .filter((p) => p.quickSlot >= 1 && p.quickSlot <= 9)
          .sort((a, b) => a.quickSlot - b.quickSlot)
          .map((p) => ({
            code: `P${p.quickSlot}`,
            name: p.name,
            productId: p._id,
            sku: p.sku,
            price: p.price,
            stockQty: p.stockQty,
          }));
        setProducts(quickSlots);
      })
      .finally(() => { if (!cancelled) { setProductsLoading(false); stopLoading(); } });
    return () => { cancelled = true; };
  }, [token]);

  /* ── Active shift check — employees must be clocked in ── */
  useEffect(() => {
    if (user?.role !== 'Employee') { setGateLoading(false); return; }
    setGateLoading(true);
    fetch(`${API}/api/shifts/active`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setGateShift(d.data ?? null))
      .catch(() => setGateShift(null))
      .finally(() => setGateLoading(false));
  }, [token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Today's schedule check — lock terminal if no shift scheduled ── */
  useEffect(() => {
    if (user?.role !== 'Employee') { setSchedLoading(false); return; }
    const today = new Date().toISOString().slice(0, 10);
    setSchedLoading(true);
    fetch(`${API}/api/staffing/my-schedule?startDate=${today}&endDate=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTodayShifts(d.success ? (d.data ?? []) : []))
      .catch(() => setTodayShifts([]))
      .finally(() => setSchedLoading(false));
  }, [token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derive today's schedule state for gate ── */
  const todayScheduleState = (() => {
    if (!todayShifts || todayShifts.length === 0) return 'NO_SHIFT';
    const s = todayShifts[0];
    const now = new Date();
    const nm  = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    const end   = eh * 60 + em;
    if (nm < start) return 'UPCOMING';
    if (nm <= end)  return 'IN_WINDOW';
    return 'PAST';
  })();

  const noScheduleToday = todayScheduleState === 'NO_SHIFT';
  // Shift ended and not clocked in — terminal is also inaccessible
  const shiftEnded = todayScheduleState === 'PAST' && !gateShift;

  // Stale shift = clocked in on a previous calendar day (missed clock-out)
  // Sales must never be attributed to a prior day's shift — block access
  const isStaleShift = (() => {
    if (!gateShift?.clockInTime) return false;
    const d = new Date(gateShift.clockInTime);
    const t = new Date();
    return d.getFullYear() !== t.getFullYear() ||
           d.getMonth()    !== t.getMonth()    ||
           d.getDate()     !== t.getDate();
  })();

  /* ── Lock background scroll when gate overlay is active ── */
  const gateActive = user?.role === 'Employee' &&
    (gateLoading || schedLoading || noScheduleToday || shiftEnded || isStaleShift || !gateShift);
  useEffect(() => {
    const main = document.querySelector('main');
    if (gateActive) {
      document.body.style.overflow = 'hidden';
      if (main) main.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (main) main.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (main) main.style.overflow = '';
    };
  }, [gateActive]);

  /* ── Web Audio beep ── */
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

  const showToast = (message) => {
    clearTimeout(toastTimer.current);
    setToast({ message, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ── Computed values ── */
  const currentSellingPrice = amountRaw ? parseInt(amountRaw, 10) : 0;
  const canAddToCart  = currentProduct !== null && amountRaw.length > 0 && currentSellingPrice > 0;
  const cartSubtotal  = cartItems.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0);
  const canCheckout   = cartItems.length > 0 && transactionType !== null;
  const isRefundMode  = transactionType === 'RF';

  /* ── Variance for current line (live feedback while typing) ── */
  const showVarianceStrip   = !!(currentProduct && currentProduct.price > 0 && amountRaw.length > 0);
  const currentVariancePct  = showVarianceStrip
    ? Math.abs((currentSellingPrice - currentProduct.price) / currentProduct.price) * 100
    : 0;
  const currentVarAbove  = showVarianceStrip && currentSellingPrice > currentProduct.price;
  const currentVarColor  = currentVariancePct === 0 ? '#2E7D4F' : currentVarAbove ? '#B26A00' : '#B71C1C';

  /* ── Numpad ── */
  const pushDigit = (d) => {
    beep(880, 55, 'square', 0.10);
    setAmountRaw((p) => (p + d).replace(/^0+/, '').slice(0, 7) || '0');
  };

  const handleBackspace = () => {
    beep(660, 50, 'square', 0.09);
    setAmountRaw((p) => p.slice(0, -1));
  };

  /* ── CLR: clear current line only (amount first, then product) ── */
  const handleClear = () => {
    beep(300, 130, 'sawtooth', 0.11);
    if (amountRaw) {
      setAmountRaw('');
    } else {
      setCurrentProduct(null);
    }
  };

  const handleTransactionType = (type) => {
    beep(1046, 60, 'sine', 0.10);
    setTransactionType((prev) => (prev === type ? null : type));
  };

  /* ── ENT: add current line to cart ── */
  const handleENT = () => {
    if (!currentProduct) {
      beep(280, 160, 'sawtooth', 0.10);
      showToast('Select a product first.');
      return;
    }
    if (!amountRaw || currentSellingPrice <= 0) {
      beep(280, 160, 'sawtooth', 0.10);
      showToast('Enter a selling price first.');
      return;
    }
    beep(1318, 90, 'sine', 0.13);
    setTimeout(() => beep(1567, 70, 'sine', 0.09), 80);
    const id = ++itemIdRef.current;
    setCartItems((prev) => [...prev, {
      id,
      product: currentProduct,
      sellingPrice: currentSellingPrice,
      qty: 1,
    }]);
    setCurrentProduct(null);
    setAmountRaw('');
  };

  /* ── Product: toggle select / deselect ── */
  const handleProduct = (product) => {
    if (currentProduct?.code === product.code) {
      beep(300, 100, 'sawtooth', 0.10);
      setCurrentProduct(null);
      setAmountRaw('');
    } else {
      beep(987, 65, 'sine', 0.10);
      setCurrentProduct(product);
      setAmountRaw('');
    }
  };

  /* ── Remove a cart item ── */
  const removeCartItem = (id) => {
    beep(300, 80, 'sawtooth', 0.10);
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  /* ── Checkout ── */
  const handleCheckout = async () => {
    if (!canCheckout) return;
    beep(784, 80, 'sine', 0.12);
    setTimeout(() => beep(1046, 110, 'sine', 0.10), 75);

    if (isRefundMode) {
      // Refund flow is per-item — pass the first cart item
      const first = cartItems[0];
      navigate(refundPath, {
        state: { amount: first.sellingPrice, product: first.product, transactionType },
      });
      return;
    }

    // Fetch discount limit and price variance limit concurrently
    let skipDiscount = false;
    let maxPriceVariancePercent = 10;
    try {
      const [discRes, pvRes] = await Promise.all([
        fetch(`${API}/api/settings/discount-limit`,       { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/settings/price-variance-limit`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (discRes.ok) {
        const d = await discRes.json();
        skipDiscount = (d.maxDiscountPercent ?? 10) === 0;
      }
      if (pvRes.ok) {
        const d = await pvRes.json();
        maxPriceVariancePercent = d.maxPriceVariancePercent ?? 10;
      }
    } catch { /* proceed with defaults */ }

    // Per-item variance check
    const varianceItems = cartItems
      .filter((item) => item.product.price > 0)
      .map((item) => ({
        ...item,
        variancePercent: Math.abs((item.sellingPrice - item.product.price) / item.product.price) * 100,
      }))
      .filter((item) => item.variancePercent > maxPriceVariancePercent);

    if (varianceItems.length > 0) {
      navigate(priceVariancePath, {
        state: { items: cartItems, varianceItems, transactionType },
      });
      return;
    }

    navigate(skipDiscount ? tenderPath : discountPath, {
      state: {
        amount: cartSubtotal,
        items: cartItems,
        transactionType,
        ...(skipDiscount && { discount: null }),
      },
    });
  };

  /* ── Amount field display ── */
  const numpadDisabled = !currentProduct;
  const displayValue = amountRaw ? toDisplay(amountRaw) : '';
  const fieldBorder  = canAddToCart ? '#2E7D4F' : '#DDD2CC';
  const labelColor   = canAddToCart ? '#2E7D4F' : '#6B5B57';

  // ── Shared sub-components (used by both layouts) ────────────────────────────

  const renderPriceDisplay = () => (
    <div style={{
      background: 'linear-gradient(145deg, #ffffff 0%, #f5f0ec 100%)',
      border: '1px solid #DDD2CC',
      borderRadius: 12,
      padding: '14px 14px 12px',
      boxShadow: '0 4px 0 #c8bdb8, 0 6px 16px rgba(62,39,35,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
    }}>
      <div style={{
        position: 'relative', background: '#ffffff',
        border: `1.5px solid ${fieldBorder}`, borderRadius: 8,
        boxShadow: 'inset 0 2px 4px rgba(62,39,35,0.06)',
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
        transition: 'border-color 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: -9, left: 10,
          background: '#ffffff', padding: '0 4px',
          fontSize: 12, fontWeight: 600, color: labelColor,
          letterSpacing: '0.01em', lineHeight: 1, pointerEvents: 'none',
          transition: 'color 0.2s',
        }}>
          Selling Price
        </span>
        <AttachMoneyIcon sx={{ fontSize: 22, color: displayValue ? '#3E2723' : '#A09490', flexShrink: 0 }} />
        <span style={{
          flex: 1, textAlign: 'right',
          fontSize: 30, fontWeight: 800,
          color: displayValue ? '#2B1D1A' : '#C4B5B0',
          letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>
          {displayValue || '0'}
        </span>
      </div>
      <div style={{
        marginTop: 8,
        background: showVarianceStrip
          ? (currentVariancePct === 0 ? 'rgba(46,125,79,0.06)' : 'rgba(178,106,0,0.07)')
          : 'rgba(160,148,144,0.05)',
        border: `1px solid ${showVarianceStrip
          ? (currentVariancePct === 0 ? 'rgba(46,125,79,0.20)' : 'rgba(178,106,0,0.28)')
          : 'rgba(160,148,144,0.18)'}`,
        borderRadius: 8, padding: '6px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Catalog</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: showVarianceStrip ? '#6B5B57' : '#C4B5B0', fontVariantNumeric: 'tabular-nums' }}>
            {showVarianceStrip ? `$${currentProduct.price}` : '—'}
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: showVarianceStrip ? currentVarColor : '#C4B5B0', letterSpacing: '0.04em' }}>
          {showVarianceStrip
            ? (currentVariancePct === 0 ? 'AT PRICE' : `${currentVarAbove ? '+' : '−'}${currentVariancePct.toFixed(1)}%`)
            : '—'}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selling</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: showVarianceStrip ? '#2B1D1A' : '#C4B5B0', fontVariantNumeric: 'tabular-nums' }}>
            {showVarianceStrip ? `$${currentSellingPrice}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );

  const renderProductGrid = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {productsLoading
        ? Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl"
              style={{ height: 62, background: '#EFE7E2', border: '1px solid #DDD2CC' }}
            />
          ))
        : products.length === 0
          ? (
            <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '16px 0', fontSize: 12, fontWeight: 600, color: '#A09490' }}>
              No quick-slot products configured.
            </div>
          )
          : products.map((product) => {
              const { code, name, price } = product;
              const isSelected = currentProduct?.code === code;
              return (
                <button
                  key={code}
                  onClick={() => handleProduct(product)}
                  className="flex flex-col items-center justify-center select-none rounded-xl border transition-all duration-75"
                  style={{
                    height: 62, cursor: 'pointer',
                    background: isSelected ? '#6d4c41' : '#ffffff',
                    border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC',
                    boxShadow: isSelected
                      ? '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28), 0 0 0 1px #D4A373'
                      : '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)',
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span style={{ fontSize: 15, fontWeight: 800, color: isSelected ? '#fff' : '#2B1D1A', lineHeight: 1 }}>{code}</span>
                  <span style={{ fontSize: 9, fontWeight: 500, color: isSelected ? '#fff' : '#8A7B77', marginTop: 3, letterSpacing: '0.02em', textAlign: 'center', padding: '0 2px' }}>{name}</span>
                  {price > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? '#fff' : '#2E7D4F', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>${price}</span>
                  )}
                </button>
              );
            })
      }
    </div>
  );

  const renderNumpad = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {/* Row 1 — 7 8 9 | ENT (spans rows 1-2) */}
      {['7', '8', '9'].map((d) => (
        <button key={d} onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit(d)} className={NUM_KEY}
          style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A' }}>
          {d}
        </button>
      ))}
      <button
        onClick={handleENT}
        className="flex items-center justify-center select-none rounded-xl active:translate-y-[4px] transition-all duration-75"
        style={{
          gridRow: 'span 2', fontSize: 15, fontWeight: 800, letterSpacing: '0.08em',
          cursor: canAddToCart ? 'pointer' : 'default',
          background: 'linear-gradient(180deg, #3E2723 0%, #2A1715 100%)',
          color: canAddToCart ? '#fff' : 'rgba(255,255,255,0.45)',
          border: canAddToCart ? '2px solid #D4A373' : '1px solid #1f100e',
          boxShadow: canAddToCart
            ? '0 4px 0 #150b09, 0 6px 12px rgba(21,11,9,0.35), 0 0 0 1px #D4A373'
            : '0 4px 0 #150b09, 0 6px 12px rgba(21,11,9,0.35)',
          transition: 'color 0.15s, border 0.15s, box-shadow 0.15s',
        }}
      >
        ENT
      </button>
      {/* Row 2 — 4 5 6 */}
      {['4', '5', '6'].map((d) => (
        <button key={d} onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit(d)} className={NUM_KEY}
          style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A' }}>
          {d}
        </button>
      ))}
      {/* Row 3 — 1 2 3 | RF */}
      {['1', '2', '3'].map((d) => (
        <button key={d} onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit(d)} className={NUM_KEY}
          style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A' }}>
          {d}
        </button>
      ))}
      <button
        onClick={() => handleTransactionType('RF')}
        className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
        style={{
          height: 62, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em',
          background: transactionType === 'RF'
            ? 'linear-gradient(180deg, #5a3a33 0%, #4a2820 100%)'
            : 'linear-gradient(180deg, #4E342E 0%, #3E2723 100%)',
          color: '#fff',
          border: transactionType === 'RF' ? '2px solid #D4A373' : '1px solid #2A1715',
          boxShadow: transactionType === 'RF'
            ? '0 4px 0 #1f100e, 0 6px 12px rgba(42,23,21,0.30), 0 0 0 1px #D4A373'
            : '0 4px 0 #1f100e, 0 6px 12px rgba(42,23,21,0.30)',
        }}>
        RF
      </button>
      {/* Row 4 — ⌫ 0 CLR | SL */}
      <button onClick={() => numpadDisabled ? showToast('Select a product first.') : handleBackspace()}
        className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
        style={{ height: 62, background: '#F5F0EC', color: '#3E2723', border: '1px solid #DDD2CC', boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)' }}>
        <BackspaceOutlinedIcon sx={{ fontSize: 22 }} />
      </button>
      <button onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit('0')} className={NUM_KEY}
        style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A' }}>
        0
      </button>
      <button onClick={handleClear}
        className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
        style={{ height: 62, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', background: '#B71C1C', color: '#fff', border: '1px solid #991717', boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }}>
        CLR
      </button>
      <button
        onClick={() => handleTransactionType('SL')}
        className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
        style={{
          height: 62, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em',
          background: transactionType === 'SL' ? '#6d4c41' : '#5D4037',
          color: '#fff',
          border: transactionType === 'SL' ? '2px solid #D4A373' : '1px solid #4a3329',
          boxShadow: transactionType === 'SL'
            ? '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28), 0 0 0 1px #D4A373'
            : '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28)',
        }}>
        SL
      </button>
    </div>
  );

  const renderCartItems = () => (
    <>
      {cartItems.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#C4B5B0', fontStyle: 'italic' }}>
          No items yet — select a product and press ENT
        </div>
      ) : (
        <>
          {cartItems.map((item) => {
            const vp = item.product.price > 0
              ? Math.abs((item.sellingPrice - item.product.price) / item.product.price) * 100
              : 0;
            const above = item.sellingPrice > item.product.price;
            const vpColor = vp === 0 ? '#2E7D4F' : above ? '#B26A00' : '#B71C1C';
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 0', borderBottom: '1px solid #F0E8E3',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                  <span style={{
                    padding: '2px 7px', borderRadius: 5, flexShrink: 0,
                    background: '#3E2723', color: '#fff',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
                  }}>
                    {item.product.code}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#A09490', fontWeight: 500, marginTop: 1 }}>
                      {item.qty} × ${item.sellingPrice}
                      {item.product.price > 0 && (
                        <span style={{ marginLeft: 6, color: vpColor, fontWeight: 700 }}>
                          {vp === 0 ? 'AT PRICE' : `${above ? '+' : '−'}${vp.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#2B1D1A', fontVariantNumeric: 'tabular-nums' }}>
                    ${item.sellingPrice * item.qty}
                  </span>
                  <button
                    onClick={() => removeCartItem(item.id)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: '1px solid #DDD2CC', background: '#F5F0EC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 13, color: '#A09490' }} />
                  </button>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: '1.5px dashed #E6DAD5', margin: '8px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Subtotal · {cartItems.length} item{cartItems.length > 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#2B1D1A', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.4px' }}>
              ${cartSubtotal}
            </span>
          </div>
        </>
      )}
    </>
  );

  const renderSectionLabel = (children) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
    </div>
  );

  const renderCheckoutBtn = () => (
    <button
      onClick={handleCheckout}
      className="w-full flex items-center justify-center gap-2 rounded-xl transition-all duration-75 active:translate-y-[4px]"
      style={{
        height: 54, background: '#5D4037', color: '#fff',
        fontSize: 15, fontWeight: 800, letterSpacing: '0.08em',
        border: canCheckout ? '2px solid #D4A373' : '1px solid #4a3329',
        boxShadow: canCheckout
          ? '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28), 0 0 0 1px #D4A373'
          : '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28)',
        opacity: canCheckout ? 1 : 0.4,
        cursor: canCheckout ? 'pointer' : 'not-allowed',
      }}
    >
      <ShoppingCartCheckoutIcon sx={{ fontSize: 20 }} />
      {isRefundMode ? 'Refund Product' : `Check Out${cartItems.length > 0 ? ` · $${cartSubtotal}` : ''}`}
    </button>
  );

  // ── Toast (shared, positioned absolutely so it works in both layouts) ────────
  const renderToast = () => toast ? (
    <div key={toast.key} style={{
      position: 'fixed', top: 74, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1200, display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 18px', borderRadius: 12, background: '#2B1D1A', color: '#fff',
      fontSize: 13, fontWeight: 600, letterSpacing: '0.01em',
      boxShadow: '0 8px 24px rgba(42,23,21,0.28), 0 2px 6px rgba(42,23,21,0.16)',
      whiteSpace: 'nowrap', animation: 'toast-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <SwapHorizRoundedIcon sx={{ fontSize: 18, color: '#D4A373', flexShrink: 0 }} />
      {toast.message}
    </div>
  ) : null;

  // ── Shift gate overlay (Employee only) — renders as a blur layer over the terminal ──
  const renderGateOverlay = () => {
    if (!gateActive) return null;

    const FONT = "'Plus Jakarta Sans', sans-serif";
    const C = { primary: '#3E2723', textPri: '#2B1D1A', textSec: '#6B5B57', border: '#DDD2CC', surface: '#ffffff', elevated: '#EFE7E2', warning: '#B26A00' };

    return (
      <div style={{
        position: 'fixed',
        top: 0, bottom: 0, right: 0,
        left: isDesktop ? 232 : 0,
        zIndex: 500,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        background: 'rgba(245, 243, 241, 0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingTop: isDesktop ? 0 : 57,
        paddingBottom: isDesktop ? 0 : 70,
        paddingLeft: 20, paddingRight: 20,
        fontFamily: FONT,
      }}>
        <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          {(gateLoading || schedLoading) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: C.elevated, animation: 'gate-pulse 1.4s ease infinite' }} />
              <div style={{ height: 14, width: 180, borderRadius: 6, background: C.elevated, animation: 'gate-pulse 1.4s ease infinite' }} />
              <div style={{ height: 11, width: 120, borderRadius: 6, background: C.elevated, animation: 'gate-pulse 1.4s ease infinite' }} />
            </div>
          ) : noScheduleToday ? (
            <div>
              {/* Calendar icon for no-schedule state */}
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'rgba(160,148,144,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="17" rx="2" stroke="#A09490" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 9h18" stroke="#A09490" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" stroke="#A09490" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
                No Shift Today
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 14, fontWeight: 500, color: C.textSec, lineHeight: 1.55 }}>
                You are not scheduled to work today. The sales terminal is unavailable.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', width: '100%' }}>
                <button
                  onClick={() => navigate('/employee/shift')}
                  style={{
                    width: '100%', minHeight: 50,
                    padding: '13px 24px', borderRadius: 12,
                    border: 'none', background: C.primary,
                    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    letterSpacing: '0.02em', fontFamily: FONT,
                    boxShadow: '0 4px 0 #1f100e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="#fff" strokeWidth="2"/>
                    <path d="M16 2v4M8 2v4M3 9h18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  View Schedule
                </button>

                <button
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    setSchedLoading(true);
                    fetch(`${API}/api/staffing/my-schedule?startDate=${today}&endDate=${today}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then(r => r.json())
                      .then(d => setTodayShifts(d.success ? (d.data ?? []) : []))
                      .catch(() => setTodayShifts([]))
                      .finally(() => setSchedLoading(false));
                  }}
                  style={{
                    width: '100%', minHeight: 46,
                    padding: '11px 24px', borderRadius: 12,
                    border: `1.5px solid ${C.border}`, background: 'rgba(255,255,255,0.6)',
                    color: C.textSec, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: FONT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M4 12a8 8 0 018-8 8 8 0 017.32 4.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20 12a8 8 0 01-8 8 8 8 0 01-7.32-4.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Check Again
                </button>
              </div>
            </div>
          ) : isStaleShift ? (
            /* ── Missed clock-out gate ── */
            <div>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'rgba(178,106,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke={C.warning} strokeWidth="2"/>
                  <path d="M12 7v5" stroke={C.warning} strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1.2" fill={C.warning}/>
                </svg>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
                Missed Clock-Out
              </h2>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 500, color: C.textSec, lineHeight: 1.55 }}>
                You have an open shift from a previous day that needs to be recovered before you can process sales.
              </p>
              <p style={{ margin: '0 0 28px', fontSize: 12, fontWeight: 600, color: C.warning, lineHeight: 1.5 }}>
                Today's sales cannot be recorded against a previous day's shift.
              </p>

              <button
                onClick={() => navigate('/employee/shift')}
                style={{
                  width: '100%', minHeight: 48,
                  padding: '12px 24px', borderRadius: 8,
                  border: `1px solid ${C.warning}`,
                  background: C.warning,
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '0.01em', fontFamily: FONT,
                  boxShadow: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 5v5l4 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Recover Clock-Out on Schedule
              </button>
            </div>
          ) : shiftEnded ? (
            <div>
              {/* Check icon for shift-ended state */}
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'rgba(160,148,144,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#A09490" strokeWidth="2"/>
                  <path d="M8 12l3 3 5-5" stroke="#A09490" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
                Shift Ended
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 14, fontWeight: 500, color: C.textSec, lineHeight: 1.55 }}>
                Your shift window has ended. The sales terminal is now closed.
              </p>

              <button
                onClick={() => navigate('/employee/shift')}
                style={{
                  width: '100%', minHeight: 50,
                  padding: '13px 24px', borderRadius: 12,
                  border: 'none', background: C.primary,
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '0.02em', fontFamily: FONT,
                  boxShadow: '0 4px 0 #1f100e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                View Schedule
              </button>
            </div>
          ) : (
            <div>
              {/* Lock icon for not-clocked-in state */}
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'rgba(178,106,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1C8.676 1 6 3.676 6 7v1H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V10a2 2 0 00-2-2h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 110 4 2 2 0 010-4z" fill={C.warning}/>
                </svg>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
                Terminal Locked
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 14, fontWeight: 500, color: C.textSec, lineHeight: 1.55 }}>
                You must be clocked in to access the sales terminal.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', width: '100%' }}>
                <button
                  onClick={() => navigate('/employee/shift')}
                  style={{
                    width: '100%', minHeight: 50,
                    padding: '13px 24px', borderRadius: 12,
                    border: 'none', background: C.primary,
                    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    letterSpacing: '0.02em', fontFamily: FONT,
                    boxShadow: '0 4px 0 #1f100e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2"/>
                    <path d="M12 7v5l3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Go to Schedule &amp; Clock In
                </button>

                <button
                  onClick={() => {
                    setGateLoading(true);
                    fetch(`${API}/api/shifts/active`, { headers: { Authorization: `Bearer ${token}` } })
                      .then(r => r.json()).then(d => setGateShift(d.data ?? null))
                      .catch(() => setGateShift(null)).finally(() => setGateLoading(false));
                  }}
                  style={{
                    width: '100%', minHeight: 46,
                    padding: '11px 24px', borderRadius: 12,
                    border: `1.5px solid ${C.border}`, background: 'rgba(255,255,255,0.6)',
                    color: C.textSec, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: FONT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M4 12a8 8 0 018-8 8 8 0 017.32 4.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20 12a8 8 0 01-8 8 8 8 0 01-7.32-4.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Check Again
                </button>
              </div>
            </div>
          )}
          <style>{`@keyframes gate-pulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
        </div>
      </div>
    );
  };

  // ── Desktop two-column layout ─────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div style={{
        position: 'relative',
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: '#F5F3F1',
      }}>
        {renderGateOverlay()}
        {renderToast()}

        {/* ── Left panel: price display + products + numpad ── */}
        <div style={{
          width: 400,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          borderRight: '1px solid #E4DAD5',
          background: '#FDFBF9',
          overflowY: 'auto',
          padding: '20px 20px 24px',
        }}>

          {/* Price display */}
          {renderPriceDisplay()}

          {/* Section: Product Entry */}
          <div style={{ marginTop: 20 }}>
            {renderSectionLabel('Product Entry')}
            {renderProductGrid()}
          </div>

          {/* Section: Amount Entry */}
          <div style={{ marginTop: 20 }}>
            {renderSectionLabel('Amount Entry')}
            {renderNumpad()}
          </div>
        </div>

        {/* ── Right panel: order summary + checkout ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '20px 24px 24px',
          minWidth: 0,
        }}>

          {/* Receipt panel header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 18, color: '#A09490' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#2B1D1A' }}>Order Summary</span>
              {cartItems.length > 0 && (
                <span style={{
                  background: '#3E2723', color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  {cartItems.length} item{cartItems.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Transaction mode badges */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { type: 'SL', label: 'Sale',   activeColor: '#5D4037', activeBorder: '#D4A373', activeShadow: '0 2px 0 #3E2723' },
                { type: 'RF', label: 'Refund', activeColor: '#3E2723', activeBorder: '#D4A373', activeShadow: '0 2px 0 #1f100e' },
              ].map(({ type, label, activeColor, activeBorder, activeShadow }) => {
                const active = transactionType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleTransactionType(type)}
                    style={{
                      padding: '6px 14px', borderRadius: 8,
                      fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                      cursor: 'pointer',
                      background: active ? activeColor : '#F0EAE6',
                      color: active ? '#fff' : '#8C7E7A',
                      border: active ? `1.5px solid ${activeBorder}` : '1px solid #DDD2CC',
                      boxShadow: active ? activeShadow : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {type} · {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart — scrollable */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #DDD2CC',
            boxShadow: '0 2px 8px rgba(62,39,35,0.06)',
            marginBottom: 16,
          }}>
            {/* Receipt header */}
            <div style={{
              background: '#FAF7F5',
              borderBottom: '1px solid #DDD2CC',
              padding: '12px 18px',
              display: 'flex', alignItems: 'center', gap: 6,
              borderRadius: '12px 12px 0 0',
            }}>
              <ReceiptLongOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Billing Details
              </span>
              {transactionType && (
                <span style={{
                  marginLeft: 'auto',
                  padding: '2px 9px', borderRadius: 20,
                  background: transactionType === 'RF' ? '#3E2723' : '#5D4037',
                  color: '#D4A373',
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
                }}>
                  {transactionType === 'RF' ? 'REFUND MODE' : 'SALE MODE'}
                </span>
              )}
            </div>
            <div style={{ padding: '4px 18px 16px' }}>
              {renderCartItems()}
            </div>
          </div>

          {/* Checkout */}
          <div style={{ flexShrink: 0 }}>
            {renderCheckoutBtn()}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '14px 12px 20px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {renderGateOverlay()}

      {/* ── Toast ── */}
      {toast && (
        <div key={toast.key} style={{
          position: 'fixed', top: 74, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1200, display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 18px', borderRadius: 12, background: '#2B1D1A', color: '#fff',
          fontSize: 13, fontWeight: 600, letterSpacing: '0.01em',
          boxShadow: '0 8px 24px rgba(42,23,21,0.28), 0 2px 6px rgba(42,23,21,0.16)',
          whiteSpace: 'nowrap', animation: 'toast-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <SwapHorizRoundedIcon sx={{ fontSize: 18, color: '#D4A373', flexShrink: 0 }} />
          {toast.message}
        </div>
      )}

      {/* ══════════════════════════════════════════
          POS SCREEN — cart list + current line entry
          ══════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f5f0ec 100%)',
        border: '1px solid #DDD2CC',
        borderRadius: 12,
        padding: '14px 14px 12px',
        marginBottom: 14,
        boxShadow: '0 4px 0 #c8bdb8, 0 6px 16px rgba(62,39,35,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}>

        {/* ── Selling price input field ── */}
        <div style={{
          position: 'relative', background: '#ffffff',
          border: `1.5px solid ${fieldBorder}`, borderRadius: 8,
          boxShadow: 'inset 0 2px 4px rgba(62,39,35,0.06)',
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
          transition: 'border-color 0.2s',
        }}>
          <span style={{
            position: 'absolute', top: -9, left: 10,
            background: '#ffffff', padding: '0 4px',
            fontSize: 12, fontWeight: 600, color: labelColor,
            letterSpacing: '0.01em', lineHeight: 1, pointerEvents: 'none',
            transition: 'color 0.2s',
          }}>
            Selling Price
          </span>
          <AttachMoneyIcon sx={{ fontSize: 22, color: displayValue ? '#3E2723' : '#A09490', flexShrink: 0 }} />
          <span style={{
            flex: 1, textAlign: 'right',
            fontSize: 30, fontWeight: 800,
            color: displayValue ? '#2B1D1A' : '#C4B5B0',
            letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {displayValue || '0'}
          </span>
        </div>

        {/* ── Live variance strip for current line ── */}
        <div style={{
          marginTop: 8,
          background: showVarianceStrip
            ? (currentVariancePct === 0 ? 'rgba(46,125,79,0.06)' : 'rgba(178,106,0,0.07)')
            : 'rgba(160,148,144,0.05)',
          border: `1px solid ${showVarianceStrip
            ? (currentVariancePct === 0 ? 'rgba(46,125,79,0.20)' : 'rgba(178,106,0,0.28)')
            : 'rgba(160,148,144,0.18)'}`,
          borderRadius: 8, padding: '6px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          transition: 'background 0.15s, border-color 0.15s',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Catalog</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: showVarianceStrip ? '#6B5B57' : '#C4B5B0', fontVariantNumeric: 'tabular-nums' }}>
              {showVarianceStrip ? `$${currentProduct.price}` : '—'}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: showVarianceStrip ? currentVarColor : '#C4B5B0', letterSpacing: '0.04em' }}>
            {showVarianceStrip
              ? (currentVariancePct === 0 ? 'AT PRICE' : `${currentVarAbove ? '+' : '−'}${currentVariancePct.toFixed(1)}%`)
              : '—'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#A09490', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selling</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: showVarianceStrip ? '#2B1D1A' : '#C4B5B0', fontVariantNumeric: 'tabular-nums' }}>
              {showVarianceStrip ? `$${currentSellingPrice}` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 1 — PRODUCT ENTRY (always active)
          ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Product Entry
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
        {productsLoading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl"
                style={{ height: 62, background: '#EFE7E2', border: '1px solid #DDD2CC' }}
              />
            ))
          : products.length === 0
            ? (
              <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '16px 0', fontSize: 12, fontWeight: 600, color: '#A09490' }}>
                No quick-slot products configured.
              </div>
            )
            : products.map((product) => {
                const { code, name, price } = product;
                const isSelected = currentProduct?.code === code;
                return (
                  <button
                    key={code}
                    onClick={() => handleProduct(product)}
                    className="flex flex-col items-center justify-center select-none rounded-xl border transition-all duration-75"
                    style={{
                      height: 62, cursor: 'pointer',
                      background: isSelected ? '#6d4c41' : '#ffffff',
                      border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC',
                      boxShadow: isSelected
                        ? '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28), 0 0 0 1px #D4A373'
                        : '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)',
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 800, color: isSelected ? '#fff' : '#2B1D1A', lineHeight: 1 }}>{code}</span>
                    <span style={{ fontSize: 9, fontWeight: 500, color: isSelected ? '#fff' : '#8A7B77', marginTop: 3, letterSpacing: '0.02em', textAlign: 'center', padding: '0 2px' }}>{name}</span>
                    {price > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? '#fff' : '#2E7D4F', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>${price}</span>
                    )}
                  </button>
                );
              })
        }
      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 — AMOUNT ENTRY
          ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Amount Entry
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>

        {/* Row 1 — 7 8 9 | ENT (spans rows 1-2) */}
        {['7', '8', '9'].map((d) => (
          <button key={d} onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit(d)} className={NUM_KEY}
            style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A' }}>
            {d}
          </button>
        ))}
        <button
          onClick={handleENT}
          className="flex items-center justify-center select-none rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{
            gridRow: 'span 2', fontSize: 15, fontWeight: 800, letterSpacing: '0.08em',
            cursor: canAddToCart ? 'pointer' : 'default',
            background: 'linear-gradient(180deg, #3E2723 0%, #2A1715 100%)',
            color: canAddToCart ? '#fff' : 'rgba(255,255,255,0.45)',
            border: canAddToCart ? '2px solid #D4A373' : '1px solid #1f100e',
            boxShadow: canAddToCart
              ? '0 4px 0 #150b09, 0 6px 12px rgba(21,11,9,0.35), 0 0 0 1px #D4A373'
              : '0 4px 0 #150b09, 0 6px 12px rgba(21,11,9,0.35)',
            transition: 'color 0.15s, border 0.15s, box-shadow 0.15s',
          }}
        >
          ENT
        </button>

        {/* Row 2 — 4 5 6 */}
        {['4', '5', '6'].map((d) => (
          <button key={d} onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit(d)} className={NUM_KEY}
            style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A' }}>
            {d}
          </button>
        ))}

        {/* Row 3 — 1 2 3 | RF */}
        {['1', '2', '3'].map((d) => (
          <button key={d} onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit(d)} className={NUM_KEY}
            style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A' }}>
            {d}
          </button>
        ))}
        <button
          onClick={() => handleTransactionType('RF')}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{
            height: 62, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em',
            background: transactionType === 'RF'
              ? 'linear-gradient(180deg, #5a3a33 0%, #4a2820 100%)'
              : 'linear-gradient(180deg, #4E342E 0%, #3E2723 100%)',
            color: '#fff',
            border: transactionType === 'RF' ? '2px solid #D4A373' : '1px solid #2A1715',
            boxShadow: transactionType === 'RF'
              ? '0 4px 0 #1f100e, 0 6px 12px rgba(42,23,21,0.30), 0 0 0 1px #D4A373'
              : '0 4px 0 #1f100e, 0 6px 12px rgba(42,23,21,0.30)',
          }}>
          RF
        </button>

        {/* Row 4 — ⌫ 0 CLR | SL */}
        <button onClick={() => numpadDisabled ? showToast('Select a product first.') : handleBackspace()}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{ height: 62, background: '#F5F0EC', color: '#3E2723', border: '1px solid #DDD2CC', boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)' }}>
          <BackspaceOutlinedIcon sx={{ fontSize: 22 }} />
        </button>
        <button onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit('0')} className={NUM_KEY}
          style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A' }}>
          0
        </button>
        <button onClick={handleClear}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{ height: 62, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', background: '#B71C1C', color: '#fff', border: '1px solid #991717', boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }}>
          CLR
        </button>
        <button
          onClick={() => handleTransactionType('SL')}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{
            height: 62, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em',
            background: transactionType === 'SL' ? '#6d4c41' : '#5D4037',
            color: '#fff',
            border: transactionType === 'SL' ? '2px solid #D4A373' : '1px solid #4a3329',
            boxShadow: transactionType === 'SL'
              ? '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28), 0 0 0 1px #D4A373'
              : '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28)',
          }}>
          SL
        </button>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 3 — BILLING DETAILS (receipt style)
          ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Billing Details
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      <CornerCard borderColor="#DDD2CC" style={{ marginBottom: 18 }}>
        {/* Receipt header strip */}
        <div style={{
          background: '#FAF7F5', borderBottom: '1px solid #DDD2CC',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ReceiptLongOutlinedIcon style={{ fontSize: 14, color: '#A09490' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Billing Details
          </span>
        </div>

        <div style={{ padding: '4px 16px 12px' }}>
          {cartItems.length === 0 ? (
            <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#C4B5B0', fontStyle: 'italic' }}>
              No items yet — select a product and press ENT
            </div>
          ) : (
            <>
              {/* Line items */}
              {cartItems.map((item) => {
                const vp = item.product.price > 0
                  ? Math.abs((item.sellingPrice - item.product.price) / item.product.price) * 100
                  : 0;
                const above = item.sellingPrice > item.product.price;
                const vpColor = vp === 0 ? '#2E7D4F' : above ? '#B26A00' : '#B71C1C';
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 0', borderBottom: '1px solid #F0E8E3',
                  }}>
                    {/* Left: code badge + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 5, flexShrink: 0,
                        background: '#3E2723', color: '#fff',
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
                      }}>
                        {item.product.code}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#A09490', fontWeight: 500, marginTop: 1 }}>
                          {item.qty} × ${item.sellingPrice}
                          {item.product.price > 0 && (
                            <span style={{ marginLeft: 6, color: vpColor, fontWeight: 700 }}>
                              {vp === 0 ? 'AT PRICE' : `${above ? '+' : '−'}${vp.toFixed(1)}%`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: total + remove */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#2B1D1A', fontVariantNumeric: 'tabular-nums' }}>
                        ${item.sellingPrice * item.qty}
                      </span>
                      <button
                        onClick={() => removeCartItem(item.id)}
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          border: '1px solid #DDD2CC', background: '#F5F0EC',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', padding: 0,
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 13, color: '#A09490' }} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Dashed divider */}
              <div style={{ borderTop: '1.5px dashed #E6DAD5', margin: '8px 0' }} />

              {/* Subtotal row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Subtotal · {cartItems.length} item{cartItems.length > 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#2B1D1A', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.4px' }}>
                  ${cartSubtotal}
                </span>
              </div>
            </>
          )}
        </div>
      </CornerCard>

      {/* ── Checkout button ── */}
      <button
        onClick={handleCheckout}
        className="w-full flex items-center justify-center gap-2 rounded-xl transition-all duration-75 active:translate-y-[4px]"
        style={{
          height: 54, background: '#5D4037', color: '#fff',
          fontSize: 15, fontWeight: 800, letterSpacing: '0.08em',
          border: canCheckout ? '2px solid #D4A373' : '1px solid #4a3329',
          boxShadow: canCheckout
            ? '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28), 0 0 0 1px #D4A373'
            : '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28)',
          opacity: canCheckout ? 1 : 0.4,
          cursor: canCheckout ? 'pointer' : 'not-allowed',
        }}
      >
        <ShoppingCartCheckoutIcon sx={{ fontSize: 20 }} />
        {isRefundMode ? 'Refund Product' : `Check Out${cartItems.length > 0 ? ` · $${cartSubtotal}` : ''}`}
      </button>

    </div>
  );
}
