import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';

/* ── Static product list (will come from backend later) ── */
const PRODUCTS = Array.from({ length: 9 }, (_, i) => ({
  code: `P${i + 1}`,
  name: `Product ${i + 1}`,
}));

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
  const navigate              = useNavigate();
  const { pathname }          = useLocation();
  const tenderPath            = pathname.startsWith('/manager') ? '/manager/tender' : '/employee/tender';

  const [amountRaw, setAmountRaw]             = useState('');
  const [transactionType, setTransactionType] = useState(null); // 'RF' | 'SL' | null
  const [confirmedAmount, setConfirmedAmount] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast]                     = useState(null); // { message, key }
  const toastTimer                            = useRef(null);
  const audioCtx                              = useRef(null);

  /* ── Web Audio beep generator ── */
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

  const hasAmount   = amountRaw.length > 0;
  const isConfirmed = confirmedAmount !== null;
  const canConfirm  = hasAmount && transactionType !== null && !isConfirmed;
  const canCheckout = isConfirmed && selectedProduct !== null;

  /* ── Numpad (only active before ENT is pressed) ── */
  const pushDigit = (d) => {
    if (isConfirmed) return;
    beep(880, 55, 'square', 0.10);            // crisp register click
    setAmountRaw((p) => (p + d).replace(/^0+/, '').slice(0, 7) || '0');
  };

  const handleBackspace = () => {
    if (isConfirmed) return;
    beep(660, 50, 'square', 0.09);            // slightly lower — delete feel
    setAmountRaw((p) => p.slice(0, -1));
  };

  const handleClear = () => {
    beep(300, 130, 'sawtooth', 0.11);         // low buzz — cancel/reset
    setAmountRaw('');
    setTransactionType(null);
    setConfirmedAmount(null);
    setSelectedProduct(null);
  };

  const handleTransactionType = (type) => {
    if (isConfirmed) return;
    beep(1046, 60, 'sine', 0.10);             // bright ping — mode selection
    setTransactionType((prev) => (prev === type ? null : type));
  };

  /* ── ENT: lock the amount ── */
  const handleENT = () => {
    if (isConfirmed || !hasAmount) return;
    if (!transactionType) {
      beep(280, 160, 'sawtooth', 0.10);       // low warning buzz
      showToast('Select a sale type — RF or SL — before confirming.');
      return;
    }
    beep(1318, 90, 'sine', 0.13);             // high confirm chime
    setTimeout(() => beep(1567, 70, 'sine', 0.09), 80); // two-tone ding
    setConfirmedAmount(parseInt(amountRaw, 10));
  };

  /* ── Product: only selectable after amount is confirmed ── */
  const handleProduct = (product) => {
    if (!isConfirmed) return;
    beep(987, 65, 'sine', 0.10);              // mid ping — item selected
    setSelectedProduct(product);
  };

  /* ── Navigate to tender / payment page ── */
  const handleCheckout = () => {
    if (!canCheckout) return;
    beep(784, 80, 'sine', 0.12);
    setTimeout(() => beep(1046, 110, 'sine', 0.10), 75);
    navigate(tenderPath, {
      state: {
        amount: confirmedAmount,
        product: selectedProduct,
        transactionType,
      },
    });
  };

  /* ── Display value in the amount field ── */
  const displayValue = isConfirmed && selectedProduct
    ? `${confirmedAmount}  —  ${selectedProduct.code}`
    : isConfirmed
    ? `${confirmedAmount}`
    : hasAmount
    ? toDisplay(amountRaw)
    : '';

  /* ── Border / label color for the input display ── */
  const fieldBorder  = isConfirmed ? '#2E7D4F' : '#DDD2CC';
  const labelColor   = isConfirmed ? '#2E7D4F' : '#6B5B57';

  return (
    <div style={{ padding: '14px 12px 20px', maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Toast notification ── */}
      {toast && (
        <div
          key={toast.key}
          style={{
            position: 'fixed',
            top: 74,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 18px',
            borderRadius: 12,
            background: '#2B1D1A',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.01em',
            boxShadow: '0 8px 24px rgba(42,23,21,0.28), 0 2px 6px rgba(42,23,21,0.16)',
            whiteSpace: 'nowrap',
            animation: 'toast-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <SwapHorizRoundedIcon sx={{ fontSize: 18, color: '#D4A373', flexShrink: 0 }} />
          {toast.message}
        </div>
      )}

      {/* ── Amount display card ── */}
      <div style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f5f0ec 100%)',
        border: '1px solid #DDD2CC',
        borderRadius: 12,
        padding: '20px 20px 16px',
        marginBottom: 20,
        boxShadow: '0 4px 0 #c8bdb8, 0 6px 16px rgba(62,39,35,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}>
        <div style={{
          position: 'relative',
          background: '#ffffff',
          border: `1.5px solid ${fieldBorder}`,
          borderRadius: 8,
          boxShadow: 'inset 0 2px 4px rgba(62,39,35,0.06)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'border-color 0.2s',
        }}>
          <span style={{
            position: 'absolute', top: -9, left: 10,
            background: '#ffffff', padding: '0 4px',
            fontSize: 12, fontWeight: 600, color: labelColor,
            letterSpacing: '0.01em', lineHeight: 1, pointerEvents: 'none',
            transition: 'color 0.2s',
          }}>
            Amount Entry
          </span>

          {isConfirmed
            ? <CheckCircleOutlinedIcon sx={{ fontSize: 22, color: '#2E7D4F', flexShrink: 0 }} />
            : <AttachMoneyIcon sx={{ fontSize: 22, color: hasAmount ? '#3E2723' : '#A09490', flexShrink: 0 }} />
          }

          <span style={{
            flex: 1, textAlign: 'right',
            fontSize: (isConfirmed && selectedProduct) ? 22 : 30,
            fontWeight: 800,
            color: displayValue ? '#2B1D1A' : '#C4B5B0',
            letterSpacing: '-0.5px', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            transition: 'font-size 0.1s',
          }}>
            {displayValue || '0'}
          </span>
        </div>
      </div>

      {/* ── Amount Entry divider ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Amount Entry
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      {/* ── Numpad ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>

        {/* Row 1 — 7 8 9 RF */}
        {['7', '8', '9'].map((d) => (
          <button key={d} onClick={() => pushDigit(d)}
            className={NUM_KEY}
            style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A', pointerEvents: isConfirmed ? 'none' : 'auto' }}>
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
            pointerEvents: isConfirmed ? 'none' : 'auto',
          }}>
          RF
        </button>

        {/* Row 2 — 4 5 6 SL */}
        {['4', '5', '6'].map((d) => (
          <button key={d} onClick={() => pushDigit(d)}
            className={NUM_KEY}
            style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A', pointerEvents: isConfirmed ? 'none' : 'auto' }}>
            {d}
          </button>
        ))}
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
            pointerEvents: isConfirmed ? 'none' : 'auto',
          }}>
          SL
        </button>

        {/* Row 3 — 1 2 3 ENT (spans rows 3-4) */}
        {['1', '2', '3'].map((d) => (
          <button key={d} onClick={() => pushDigit(d)}
            className={NUM_KEY}
            style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A', pointerEvents: isConfirmed ? 'none' : 'auto' }}>
            {d}
          </button>
        ))}
        <button
          onClick={handleENT}
          className="flex items-center justify-center select-none rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{
            gridRow: 'span 2',
            fontSize: 15, fontWeight: 800, letterSpacing: '0.08em',
            cursor: canConfirm ? 'pointer' : 'default',
            background: canConfirm
              ? 'linear-gradient(180deg, #3E2723 0%, #2A1715 100%)'
              : 'linear-gradient(180deg, #3E2723 0%, #2A1715 100%)',
            color: '#fff',
            border: '1px solid #1f100e',
            boxShadow: '0 4px 0 #150b09, 0 6px 12px rgba(21,11,9,0.35)',
            opacity: 1,
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        >
          {isConfirmed ? <span style={{ fontSize: 22 }}>✓</span> : 'ENT'}
        </button>

        {/* Row 4 — ⌫ 0 CLR (ENT col 4) */}
        <button onClick={handleBackspace}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{ height: 62, background: '#F5F0EC', color: '#3E2723', border: '1px solid #DDD2CC', boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)', pointerEvents: isConfirmed ? 'none' : 'auto' }}>
          <BackspaceOutlinedIcon sx={{ fontSize: 22 }} />
        </button>
        <button onClick={() => pushDigit('0')}
          className={NUM_KEY}
          style={{ height: 62, fontSize: 26, fontWeight: 700, color: '#2B1D1A', pointerEvents: isConfirmed ? 'none' : 'auto' }}>
          0
        </button>
        <button onClick={handleClear}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{ height: 62, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', background: '#B71C1C', color: '#fff', border: '1px solid #991717', boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }}>
          CLR
        </button>
      </div>

      {/* ── Product Entry divider ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Product Entry
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      {/* ── Product grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {PRODUCTS.map(({ code, name }) => {
          const isSelected = selectedProduct?.code === code;
          return (
            <button key={code} onClick={() => handleProduct({ code, name })}
              className="flex flex-col items-center justify-center select-none rounded-xl border transition-all duration-75"
              style={{
                height: 66,
                cursor: isConfirmed ? 'pointer' : 'default',
                pointerEvents: isConfirmed ? 'auto' : 'none',
                background: isSelected ? '#3E2723' : '#ffffff',
                borderColor: isSelected ? '#2A1715' : '#DDD2CC',
                boxShadow: isSelected
                  ? '0 4px 0 #150b09, 0 6px 12px rgba(42,23,21,0.30)'
                  : '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)',
                opacity: 1,
                transform: 'translateY(0)',
              }}
              onMouseDown={(e) => { if (isConfirmed) e.currentTarget.style.transform = 'translateY(4px)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, color: isSelected ? '#fff' : '#2B1D1A', lineHeight: 1 }}>{code}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: isSelected ? 'rgba(255,255,255,0.65)' : '#8A7B77', marginTop: 4, letterSpacing: '0.02em' }}>{name}</span>
            </button>
          );
        })}
      </div>

      {/* ── Checkout button ── */}
      <button
        onClick={handleCheckout}
        className="w-full flex items-center justify-center gap-2 rounded-xl transition-all duration-75 active:translate-y-[4px]"
        style={{
          height: 54, background: canCheckout ? '#5D4037' : '#5D4037',
          color: '#fff',
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
        Check Out
      </button>

    </div>
  );
}
