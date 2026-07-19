import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import useAuthStore from '../store/useAuthStore';
import { useLoading } from '../context/LoadingContext';
import { useSocketEvent } from '../context/SocketContext';
import { useShiftGate } from '../context/ShiftGateContext';
import { EVENTS } from '../socket/events';

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

/**
 * Fluid sizing for the mobile Terminal screen: instead of one fixed px value
 * that only fits one device (tuned against iPhone 14's 844px logical
 * viewport height), every scaling element is a clamp() anchored to that
 * baseline plus a fraction of whatever extra/short viewport height the
 * actual device has. Shorter phones shrink toward `min` (no scroll); taller
 * phones (Pro Max / Pixel Pro sizes) grow toward `max` (no empty space at
 * the bottom) — continuously, for any device height, not a per-model table.
 */
const TERMINAL_BASE_VH = 844;
function fluid(basePx, slope, minPx, maxPx) {
  return `clamp(${minPx}px, calc(${basePx}px + (100dvh - ${TERMINAL_BASE_VH}px) * ${slope}), ${maxPx}px)`;
}

// ── Product Entry / Amount Entry fill-to-viewport measurement ──────────────
// clamp()-based fluid sizing gets the direction right but under-fills tall
// devices (iPhone Pro Max, Pixel Pro) because it can only approximate the
// real gap with a hand-tuned slope. Instead, measure the real distance
// between this page and the fixed bottom nav at runtime and hand the exact
// leftover pixels to these two grids (split by row count, so cell sizes
// stay visually consistent between them) — the screen fills exactly on any
// device, with a safe floor so short devices never scroll.
const PRODUCT_ROWS = 2;
const NUMPAD_ROWS = 4;
const PRODUCT_GRID_GAP = 6;
const NUMPAD_GRID_GAP = 8;
const PRODUCT_CELL_MIN = 44;
const NUMPAD_CELL_MIN = 46;
const PRODUCT_CELL_MAX = 76;
const NUMPAD_CELL_MAX = 80;
const PRODUCT_BASE_HEIGHT = PRODUCT_ROWS * PRODUCT_CELL_MIN + (PRODUCT_ROWS - 1) * PRODUCT_GRID_GAP;
const NUMPAD_BASE_HEIGHT  = NUMPAD_ROWS  * NUMPAD_CELL_MIN  + (NUMPAD_ROWS - 1) * NUMPAD_GRID_GAP;
const PRODUCT_MAX_HEIGHT  = PRODUCT_ROWS * PRODUCT_CELL_MAX + (PRODUCT_ROWS - 1) * PRODUCT_GRID_GAP;
const NUMPAD_MAX_HEIGHT   = NUMPAD_ROWS  * NUMPAD_CELL_MAX  + (NUMPAD_ROWS - 1) * NUMPAD_GRID_GAP;

export default function TerminalPage() {
  const navigate          = useNavigate();
  const location          = useLocation();
  const { pathname }      = location;
  const tenderPath        = pathname.startsWith('/manager') ? '/manager/tender'         : '/employee/tender';
  const token             = useAuthStore((s) => s.token);
  const user              = useAuthStore((s) => s.user);
  const isDesktop         = useMediaQuery('(min-width:1024px)');
  const { stopLoading }   = useLoading();
  const { forceLocked, lockReason } = useShiftGate();

  // ── Shift gate (employees only) ──
  const [gateShift,    setGateShift]    = useState(null);
  const [gateLoading,  setGateLoading]  = useState(true);
  const [todayShifts,  setTodayShifts]  = useState(null); // null = loading, array = today+yesterday shifts
  const [schedLoading, setSchedLoading] = useState(true);

  // Pushed by the backend's shift-ending-soon cron (socket, not polled) once
  // the employee's OPEN shift is within 15 minutes of its scheduled end.
  const [shiftEndingWarning, setShiftEndingWarning] = useState(null); // { minutesLeft } | null
  useSocketEvent(EVENTS.SHIFT_ENDING_SOON, (payload) => setShiftEndingWarning(payload));

  // ── Cart state ──
  const [cartItems, setCartItems]       = useState([]); // [{id, product, sellingPrice, qty}]
  const [currentProduct, setCurrentProduct] = useState(null); // product being selected for current line
  const [amountRaw, setAmountRaw]       = useState('');  // selling price being typed
  const [transactionType, setTransactionType] = useState(null); // 'RF' | 'SL' | null

  const [toast, setToast]               = useState(null);
  const [products, setProducts]         = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productPage, setProductPage]   = useState(0); // mobile Product Entry carousel — 2x2 page

  const toastTimer  = useRef(null);
  const audioCtx    = useRef(null);
  const itemIdRef   = useRef(0);

  // ── Mobile Product Entry / Amount Entry fill-to-viewport ──
  const mPageRef       = useRef(null);
  const mProductWrapRef = useRef(null);
  const mNumpadWrapRef  = useRef(null);
  const [fillHeights, setFillHeights] = useState({ product: PRODUCT_BASE_HEIGHT, numpad: NUMPAD_BASE_HEIGHT, extraGap: 0 });

  /* ── Pre-select product from barcode scanner ── */
  useEffect(() => {
    const bp = location.state?.barcodeProduct;
    if (bp) {
      setCurrentProduct(bp);
      // Amount is always entered manually by the employee; do not pre-fill
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
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    setSchedLoading(true);
    // Fetch yesterday + today to detect overnight shifts spanning midnight
    fetch(`${API}/api/staffing/my-schedule?startDate=${yesterday}&endDate=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const all = d.success ? (d.data ?? []) : [];
        // Store today + yesterday shifts together; gate logic splits them below
        setTodayShifts(all);
      })
      .catch(() => setTodayShifts([]))
      .finally(() => setSchedLoading(false));
  }, [token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derive today's schedule state for gate ── */
  const todayScheduleState = (() => {
    if (!todayShifts) return 'NO_SHIFT';
    const now         = new Date();
    const todayStr    = now.toISOString().slice(0, 10);
    const yestStr     = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const todayList   = todayShifts.filter(s => s.date === todayStr);
    const yestList    = todayShifts.filter(s => s.date === yestStr);

    // Check yesterday's overnight shifts extending into today
    for (const s of yestList) {
      const [sy, sm, sd] = s.date.split('-').map(Number);
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const startDT = new Date(sy, sm - 1, sd, startH, startM, 0, 0);
      let endDT = new Date(sy, sm - 1, sd, endH, endM, 0, 0);
      if (endDT <= startDT) {
        endDT.setDate(endDT.getDate() + 1);
        if (now <= endDT) return 'IN_WINDOW';
      }
    }

    if (!todayList.length) return 'NO_SHIFT';
    const s = todayList[0];
    const [sy, sm, sd] = s.date.split('-').map(Number);
    const [startH, startM] = s.startTime.split(':').map(Number);
    const [endH, endM] = s.endTime.split(':').map(Number);
    const startDT = new Date(sy, sm - 1, sd, startH, startM, 0, 0);
    let endDT = new Date(sy, sm - 1, sd, endH, endM, 0, 0);
    if (endDT <= startDT) endDT.setDate(endDT.getDate() + 1); // overnight
    if (now < startDT) return 'UPCOMING';
    if (now <= endDT)  return 'IN_WINDOW';
    return 'PAST';
  })();

  const noScheduleToday = todayScheduleState === 'NO_SHIFT';
  // Shift ended and not clocked in — terminal is also inaccessible
  const shiftEnded = todayScheduleState === 'PAST' && !gateShift;

  // Stale shift = clocked in on a previous calendar day AND past scheduled end.
  // Active overnight shifts (e.g. 10 PM – 2 AM) are NOT stale — we check
  // scheduledEnd on the Shift doc before flagging.
  const isStaleShift = (() => {
    if (!gateShift?.clockInTime) return false;
    const clockInDate = new Date(gateShift.clockInTime);
    const now = new Date();
    const clockedInToday = (
      clockInDate.getFullYear() === now.getFullYear() &&
      clockInDate.getMonth()    === now.getMonth()    &&
      clockInDate.getDate()     === now.getDate()
    );
    if (clockedInToday) return false;
    // Still within overnight window?
    if (gateShift.scheduledEnd) {
      const [h, m] = gateShift.scheduledEnd.split(':').map(Number);
      const endDT = new Date(clockInDate.getFullYear(), clockInDate.getMonth(), clockInDate.getDate(), h, m, 0, 0);
      const clockInHHmm = clockInDate.getHours() * 60 + clockInDate.getMinutes();
      if (h * 60 + m <= clockInHHmm) endDT.setDate(endDT.getDate() + 1); // overnight
      if (now <= endDT) return false;
    }
    return true;
  })();

  /* ── Lock background scroll when gate overlay is active ── */
  const gateActive = user?.role === 'Employee' &&
    (gateLoading || schedLoading || noScheduleToday || shiftEnded || isStaleShift || !gateShift || forceLocked);

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
      // Refund flow is per-item and now lives inline on the Tender page —
      // it locates the original invoice and gets manager PIN authorization
      // right there instead of hopping to a separate refund page.
      const first = cartItems[0];
      navigate(tenderPath, {
        state: { amount: first.sellingPrice, product: first.product, transactionType },
      });
      return;
    }

    // Discount entry now lives inline on the Tender page itself.
    navigate(tenderPath, {
      state: {
        amount: cartSubtotal,
        items: cartItems,
        transactionType,
      },
    });
  };

  /* ── Amount field display ── */
  const numpadDisabled = !currentProduct;
  const displayValue = amountRaw ? toDisplay(amountRaw) : '';

  /* ── Mobile Product Entry carousel — 2x2 page at a time ── */
  const PRODUCTS_PER_PAGE = 8; // 4 per row × 2 rows
  const totalProductPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
  const safeProductPage = Math.min(productPage, totalProductPages - 1);
  const pagedProducts = products.slice(safeProductPage * PRODUCTS_PER_PAGE, safeProductPage * PRODUCTS_PER_PAGE + PRODUCTS_PER_PAGE);
  const goPrevProductPage = () => setProductPage((p) => Math.max(0, Math.min(p, totalProductPages - 1) - 1));
  const goNextProductPage = () => setProductPage((p) => Math.min(totalProductPages - 1, Math.min(p, totalProductPages - 1) + 1));

  const SWIPE_THRESHOLD = 40; // px
  const swipeStartX = useRef(null);
  const handleCarouselTouchStart = (e) => { swipeStartX.current = e.touches[0].clientX; };
  const handleCarouselTouchEnd = (e) => {
    if (swipeStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (deltaX <= -SWIPE_THRESHOLD) goNextProductPage();
    else if (deltaX >= SWIPE_THRESHOLD) goPrevProductPage();
  };
  const fieldBorder  = canAddToCart ? '#2E7D4F' : '#DDD2CC';
  const labelColor   = canAddToCart ? '#2E7D4F' : '#6B5B57';

  /* ── Mobile fill-to-viewport: measure the real gap to the fixed bottom nav
     and hand the leftover pixels to Product Entry / Amount Entry (see the
     PRODUCT_/NUMPAD_ constants above for why). ── */
  const recalcFillHeights = useCallback(() => {
    const page = mPageRef.current;
    const productEl = mProductWrapRef.current;
    const numpadEl = mNumpadWrapRef.current;
    if (!page || !productEl || !numpadEl) return;

    const navEl = document.querySelector('.pos-safe-bottom-nav');
    // `navEl.getBoundingClientRect().top` and `page.getBoundingClientRect().top`
    // are both viewport-relative — but the nav is `position: fixed` (stays put
    // as the page scrolls) while the page is a normal in-flow element (moves
    // up as the page scrolls). Left uncorrected, scrolling down makes the gap
    // between them look artificially larger, which was inflating the button
    // sizes on every scroll. Adding scrollY back converts both measurements
    // to the same scroll-invariant (document) coordinate space.
    const scrollY = window.scrollY ?? document.documentElement.scrollTop ?? 0;
    const bottomLimit = (navEl ? navEl.getBoundingClientRect().top : window.innerHeight) + scrollY;
    const containerTop = page.getBoundingClientRect().top + scrollY;
    // Small safety margin so subpixel/rounding differences can never let
    // content overlap the nav, even on the exact boundary case.
    const SAFETY_MARGIN = 6;
    const available = bottomLimit - containerTop - SAFETY_MARGIN;

    // Subtracting the CURRENT (possibly already-grown) flexible heights from
    // the page's total rendered height isolates the true fixed-content
    // height, so this stays correct no matter what the last computed sizes
    // were — no iteration/convergence needed.
    const currentProductH = productEl.getBoundingClientRect().height;
    const currentNumpadH  = numpadEl.getBoundingClientRect().height;
    const fixedContentHeight = page.scrollHeight - currentProductH - currentNumpadH;

    const flexBudget = Math.max(0, available - fixedContentHeight);
    const totalRows = PRODUCT_ROWS + NUMPAD_ROWS;
    const rawProduct = flexBudget * (PRODUCT_ROWS / totalRows);
    const rawNumpad  = flexBudget * (NUMPAD_ROWS / totalRows);

    const nextProduct = Math.min(PRODUCT_MAX_HEIGHT, Math.max(PRODUCT_BASE_HEIGHT, rawProduct));
    const nextNumpad  = Math.min(NUMPAD_MAX_HEIGHT,  Math.max(NUMPAD_BASE_HEIGHT,  rawNumpad));

    // A PWA in standalone mode has no browser chrome at all, so its real
    // available height can exceed what even the MAX cell-size caps can
    // absorb — the two grids alone can't use up the whole flexBudget
    // without becoming absurdly large. Whatever's left over is handed to
    // the banner as extra bottom margin instead, so total content height
    // always reaches exactly to the nav — no dead gap, ever, regardless of
    // how tall the viewport is.
    const usedByGrids = nextProduct + nextNumpad;
    const nextExtraGap = Math.max(0, flexBudget - usedByGrids);

    setFillHeights((prev) => (
      Math.abs(prev.product - nextProduct) < 1 &&
      Math.abs(prev.numpad - nextNumpad) < 1 &&
      Math.abs(prev.extraGap - nextExtraGap) < 1
        ? prev
        : { product: nextProduct, numpad: nextNumpad, extraGap: nextExtraGap }
    ));
  }, []);

  useLayoutEffect(() => {
    if (isDesktop) return;
    recalcFillHeights();

    // The very first mount — right after login, or a cold PWA launch — can
    // measure before the environment has actually settled (web fonts
    // swapping in and changing text metrics, or a fresh installed-PWA
    // WebView not yet reporting its real env(safe-area-inset-bottom) on the
    // first layout pass). A single fixed delay wasn't reliably landing
    // after that settling finished, leaving a stale/too-small measurement
    // that only ever got corrected by unmounting this page (navigating
    // away and back). Staggered retries + the fonts-ready signal cover
    // both fast (fonts) and slow (WebView/safe-area) settling without
    // guessing one magic number.
    const timers = [100, 300, 600, 1200].map((ms) => setTimeout(recalcFillHeights, ms));
    document.fonts?.ready?.then(recalcFillHeights).catch(() => {});

    let raf2 = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(recalcFillHeights);
    });

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  }, [isDesktop, totalProductPages, shiftEndingWarning, recalcFillHeights]);

  useEffect(() => {
    if (isDesktop) return;
    // Deliberately NOT listening for 'scroll' or 'resize' — window 'resize'
    // fires on mobile Safari/Chrome purely from the browser chrome
    // show/hide during scroll (that's what caused buttons to grow while
    // scrolling; see the scrollY correction above). ResizeObserver on the
    // actual bottom-nav element is the correct, scroll-immune tool instead:
    // it only fires when the nav's real box actually changes — which is
    // exactly what happens once a PWA's safe-area-inset-bottom resolves
    // after launch (that late change was leaving a blank gap between the
    // Quick Action banner and the nav, since nothing re-measured after it
    // — window resize wasn't listened to anymore, and the one-time 250ms
    // settle check could still land before the safe area was ready).
    window.addEventListener('orientationchange', recalcFillHeights);

    let ro;
    const navEl = document.querySelector('.pos-safe-bottom-nav');
    if (navEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(recalcFillHeights);
      ro.observe(navEl);
    }

    return () => {
      window.removeEventListener('orientationchange', recalcFillHeights);
      ro?.disconnect();
    };
  }, [isDesktop, recalcFillHeights]);

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
          Sale Amount
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
              const { code, name } = product;
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
                    padding: '4px 6px',
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#fff' : '#2B1D1A', textAlign: 'center', lineHeight: 1.3, letterSpacing: '0.01em' }}>{name}</span>
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
            const lineTotal = item.sellingPrice;
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 0', borderBottom: '1px solid #F0E8E3',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2B1D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#A09490', fontWeight: 500, marginTop: 1 }}>
                    1 unit
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#2B1D1A', fontVariantNumeric: 'tabular-nums' }}>
                    ${lineTotal}
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

  // ── Shift-ending-soon warning — persistent banner (not an auto-dismissing
  // toast) pushed live via socket, since the employee may not refresh the page. ──
  const renderShiftEndingBanner = () => shiftEndingWarning && !gateActive ? (
    <div style={{
      position: 'fixed', top: isDesktop ? 16 : 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1100, display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 12,
      background: 'rgba(178,106,0,0.12)', border: '1px solid rgba(178,106,0,0.35)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      boxShadow: '0 6px 18px rgba(178,106,0,0.14)',
      maxWidth: 'calc(100vw - 32px)',
    }}>
      <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: '#B26A00', flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#7A4600', whiteSpace: 'nowrap' }}>
        {shiftEndingWarning.minutesLeft <= 5
          ? 'Your shift will end in 5 minutes. Complete current transaction.'
          : `Your shift ends in ${shiftEndingWarning.minutesLeft} minutes — you won't be able to start new sales after that.`}
      </span>
      <button onClick={() => setShiftEndingWarning(null)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: 6, border: 'none', background: 'transparent',
        color: '#B26A00', cursor: 'pointer', flexShrink: 0,
      }}>
        <CloseIcon sx={{ fontSize: 15 }} />
      </button>
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
          ) : forceLocked ? (
            /* ── Shift ended in real time (cron-detected or manager-forced) ── */
            <div>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'rgba(183,28,28,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="9" rx="2" stroke="#B71C1C" strokeWidth="2"/>
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="#B71C1C" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, color: C.textPri, letterSpacing: '-0.3px' }}>
                Shift Ended
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 14, fontWeight: 500, color: C.textSec, lineHeight: 1.55 }}>
                {lockReason}
              </p>
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
        {renderShiftEndingBanner()}

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

  // ── Mobile layout: fluid sizing (see `fluid()` — scales with viewport height
  //    so the screen fills large phones and stays scroll-free on small ones) ──
  const mContainerPadTop    = fluid(10, 0.012, 8, 18);
  const mContainerPadBottom = fluid(12, 0.020, 10, 22);
  const mSaleCardPadTop     = fluid(10, 0.020, 8, 18);
  const mSaleCardPadBottom  = fluid(8,  0.020, 6, 16);
  const mSaleCardMarginBot  = fluid(10, 0.022, 8, 20);
  const mBillingBoxHeight   = fluid(30, 0.012, 26, 42);
  const mSectionHeaderMB    = fluid(8,  0.010, 6, 16);
  const mProductWrapMB      = fluid(10, 0.020, 8, 20);
  const mNumpadGridMB       = fluid(10, 0.020, 8, 20);
  const mQuickActionHeaderMB = fluid(2, 0.006, 2, 8);
  const mBannerPadV         = fluid(14, 0.020, 12, 22);

  // ── Mobile layout ────────────────────────────────────────────────────────────
  return (
    <div ref={mPageRef} style={{ padding: `${mContainerPadTop} 12px ${mContainerPadBottom}`, maxWidth: 480, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {renderGateOverlay()}
      {renderShiftEndingBanner()}

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
        padding: `${mSaleCardPadTop} 14px ${mSaleCardPadBottom}`,
        marginBottom: mSaleCardMarginBot,
        boxShadow: '0 4px 0 #c8bdb8, 0 6px 16px rgba(62,39,35,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}>

        {/* ── Sale amount input field ── */}
        <div style={{
          position: 'relative', background: '#ffffff',
          border: `1.5px solid ${fieldBorder}`, borderRadius: 8,
          boxShadow: 'inset 0 2px 4px rgba(62,39,35,0.06)',
          padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8,
          transition: 'border-color 0.2s',
        }}>
          <span style={{
            position: 'absolute', top: -9, left: 10,
            background: '#ffffff', padding: '0 4px',
            fontSize: 12, fontWeight: 600, color: labelColor,
            letterSpacing: '0.01em', lineHeight: 1, pointerEvents: 'none',
            transition: 'color 0.2s',
          }}>
            Sale Amount
          </span>
          <AttachMoneyIcon sx={{ fontSize: 21, color: displayValue ? '#3E2723' : '#A09490', flexShrink: 0 }} />
          <span style={{
            flex: 1, textAlign: 'right',
            fontSize: 27, fontWeight: 800,
            color: displayValue ? '#2B1D1A' : '#C4B5B0',
            letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {displayValue || '0'}
          </span>
        </div>

        {/* ── Billing data (cart items), merged into the Sale Amount card — no subtotal row.
             Fixed height sized for the single current line item (only one product is
             selectable at a time in this system) so adding it never changes the card's
             height or pushes Product Entry / Amount Entry down the page. ── */}
        <div style={{ marginTop: 5, paddingTop: 4, borderTop: '1px dashed #DDD2CC', height: mBillingBoxHeight, overflowY: 'auto' }}>
          {cartItems.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 11, fontWeight: 500, color: '#C4B5B0', fontStyle: 'italic' }}>
              No items yet — select a product and press ENT
            </div>
          ) : cartItems.map((item) => {
            const lineTotal = item.sellingPrice;
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '2px 0', borderBottom: '1px solid #F0E8E3',
              }}>
                {/* Left: name + qty breakdown */}
                <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2B1D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product.name}
                  </span>
                  <span style={{ fontSize: 10, color: '#A09490', fontWeight: 500, flexShrink: 0 }}>
                    {item.qty} × ${item.sellingPrice}
                  </span>
                </div>

                {/* Right: total + remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#2B1D1A', fontVariantNumeric: 'tabular-nums' }}>
                    ${lineTotal}
                  </span>
                  <button
                    onClick={() => removeCartItem(item.id)}
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '1px solid #DDD2CC', background: '#F5F0EC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 10, color: '#A09490' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 — PRODUCT ENTRY (swipe carousel)
          ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: mSectionHeaderMB }}>
        <div style={{ width: 14, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Product Entry
        </span>

        {/* Right side of the section border — carousel nav ── */}
        {totalProductPages > 1 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {Array.from({ length: totalProductPages }).map((_, i) => (
                <div key={i} style={{
                  width: i === safeProductPage ? 14 : 5, height: 5, borderRadius: 3,
                  background: i === safeProductPage ? '#5D4037' : '#DDD2CC',
                  transition: 'all 0.15s',
                }} />
              ))}
            </div>
            <button
              onClick={goPrevProductPage}
              disabled={safeProductPage === 0}
              className="flex items-center justify-center select-none rounded-full active:translate-y-[1px] transition-all duration-75"
              style={{
                width: 24, height: 24, padding: 0, flexShrink: 0,
                background: safeProductPage === 0 ? '#F0EAE6' : '#ffffff',
                border: '1px solid #DDD2CC',
                boxShadow: safeProductPage === 0 ? 'none' : '0 2px 0 #c4b8b2, 0 2px 5px rgba(0,0,0,0.06)',
                cursor: safeProductPage === 0 ? 'default' : 'pointer',
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: 16, color: safeProductPage === 0 ? '#C4B5B0' : '#5D4037' }} />
            </button>
            <button
              onClick={goNextProductPage}
              disabled={safeProductPage >= totalProductPages - 1}
              className="flex items-center justify-center select-none rounded-full active:translate-y-[1px] transition-all duration-75"
              style={{
                width: 24, height: 24, padding: 0, flexShrink: 0,
                background: safeProductPage >= totalProductPages - 1 ? '#F0EAE6' : '#ffffff',
                border: '1px solid #DDD2CC',
                boxShadow: safeProductPage >= totalProductPages - 1 ? 'none' : '0 2px 0 #c4b8b2, 0 2px 5px rgba(0,0,0,0.06)',
                cursor: safeProductPage >= totalProductPages - 1 ? 'default' : 'pointer',
              }}
            >
              <ChevronRightIcon sx={{ fontSize: 16, color: safeProductPage >= totalProductPages - 1 ? '#C4B5B0' : '#5D4037' }} />
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        )}
      </div>

      <div
        ref={mProductWrapRef}
        onTouchStart={handleCarouselTouchStart}
        onTouchEnd={handleCarouselTouchEnd}
        style={{ marginBottom: mProductWrapMB, height: fillHeights.product }}
      >
        {/* 3×2 product grid — fills exactly whatever height was measured above */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: PRODUCT_GRID_GAP, height: '100%' }}>
          {productsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl"
                  style={{ height: '100%', background: '#EFE7E2', border: '1px solid #DDD2CC' }}
                />
              ))
            : products.length === 0
              ? (
                <div style={{ gridColumn: 'span 4', gridRow: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 600, color: '#A09490' }}>
                  No quick-slot products configured.
                </div>
              )
              : pagedProducts.map((product) => {
                  const { code, name } = product;
                  const isSelected = currentProduct?.code === code;
                  return (
                    <button
                      key={code}
                      onClick={() => handleProduct(product)}
                      className="flex flex-col items-center justify-center select-none rounded-xl border transition-all duration-75"
                      style={{
                        height: '100%', cursor: 'pointer',
                        background: isSelected ? '#6d4c41' : '#ffffff',
                        border: isSelected ? '2px solid #D4A373' : '1px solid #DDD2CC',
                        boxShadow: isSelected
                          ? '0 4px 0 #3E2723, 0 6px 12px rgba(62,39,35,0.28), 0 0 0 1px #D4A373'
                          : '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)',
                        padding: '4px 6px',
                      }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#fff' : '#2B1D1A', textAlign: 'center', lineHeight: 1.3 }}>{name}</span>
                    </button>
                  );
                })
          }
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 3 — AMOUNT ENTRY
          ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: mSectionHeaderMB }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Amount Entry
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      <div
        ref={mNumpadWrapRef}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)',
          gap: NUMPAD_GRID_GAP, marginBottom: mNumpadGridMB, height: fillHeights.numpad,
        }}
      >

        {/* Row 1 — 7 8 9 | ENT (spans rows 1-2) */}
        {['7', '8', '9'].map((d) => (
          <button key={d} onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit(d)} className={NUM_KEY}
            style={{ height: '100%', fontSize: 22, fontWeight: 700, color: '#2B1D1A' }}>
            {d}
          </button>
        ))}
        <button
          onClick={handleENT}
          className="flex items-center justify-center select-none rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{
            gridRow: 'span 2', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em',
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
            style={{ height: '100%', fontSize: 22, fontWeight: 700, color: '#2B1D1A' }}>
            {d}
          </button>
        ))}

        {/* Row 3 — 1 2 3 | RF */}
        {['1', '2', '3'].map((d) => (
          <button key={d} onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit(d)} className={NUM_KEY}
            style={{ height: '100%', fontSize: 22, fontWeight: 700, color: '#2B1D1A' }}>
            {d}
          </button>
        ))}
        <button
          onClick={() => handleTransactionType('RF')}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{
            height: '100%', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
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
          style={{ height: '100%', background: '#F5F0EC', color: '#3E2723', border: '1px solid #DDD2CC', boxShadow: '0 4px 0 #c4b8b2, 0 6px 12px rgba(0,0,0,0.06)' }}>
          <BackspaceOutlinedIcon sx={{ fontSize: 18 }} />
        </button>
        <button onClick={() => numpadDisabled ? showToast('Select a product first.') : pushDigit('0')} className={NUM_KEY}
          style={{ height: '100%', fontSize: 22, fontWeight: 700, color: '#2B1D1A' }}>
          0
        </button>
        <button onClick={handleClear}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{ height: '100%', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', background: '#B71C1C', color: '#fff', border: '1px solid #991717', boxShadow: '0 4px 0 #7a1111, 0 6px 12px rgba(183,28,28,0.22)' }}>
          CLR
        </button>
        <button
          onClick={() => handleTransactionType('SL')}
          className="flex items-center justify-center select-none cursor-pointer rounded-xl active:translate-y-[4px] transition-all duration-75"
          style={{
            height: '100%', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
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
          SECTION 4 — QUICK ACTION
          ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: mQuickActionHeaderMB }}>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#A09490', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Quick Action
        </span>
        <div style={{ flex: 1, height: 1, background: '#DDD2CC' }} />
      </div>

      {/* ── Sale / Refund — full-bleed banner (edge-to-edge, square corners), taps through to Select Tender once RF/SL is locked ── */}
      <button
        onClick={handleCheckout}
        disabled={!canCheckout}
        className="w-full flex items-center select-none transition-all duration-75"
        style={{
          marginTop: 8,
          width: '100%',
          paddingTop: mBannerPadV,
          paddingLeft: 12,
          paddingRight: 12,
          // Extra bottom padding absorbs whatever the two grids' MAX-height
          // caps couldn't use up (see recalcFillHeights) — grown INTO the
          // banner (not as blank margin after it) so its tinted background
          // and border stay flush all the way to the bottom nav on very
          // tall / chrome-less PWA viewports, instead of a dead gap.
          paddingBottom: `calc(${mBannerPadV} + ${fillHeights.extraGap}px)`,
          textAlign: 'left',
          position: 'relative',
          cursor: canCheckout ? 'pointer' : 'not-allowed',
          background: transactionType === 'RF' ? '#F7EFEC' : transactionType === 'SL' ? '#F1ECE8' : '#FAF7F5',
          borderBottom: '1px solid #DDD2CC',
          borderLeft: 'none',
          borderRight: 'none',
          borderRadius: 0,
          opacity: canCheckout ? 1 : 0.65,
        }}
        onMouseDown={(e) => { if (canCheckout) e.currentTarget.style.transform = 'translateY(1px)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {/* Left accent bar — carries the mode's color instead of an outlined border */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: transactionType === 'RF' ? '#3E2723' : transactionType === 'SL' ? '#5D4037' : '#D4A373',
        }} />

        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 9, flexShrink: 0, marginLeft: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: transactionType === 'RF' ? '#3E2723' : transactionType === 'SL' ? '#5D4037' : '#EFE7E2',
        }}>
          {transactionType === 'RF'
            ? <SwapHorizRoundedIcon sx={{ fontSize: 19, color: '#D4A373' }} />
            : transactionType === 'SL'
              ? <ShoppingCartCheckoutIcon sx={{ fontSize: 19, color: '#fff' }} />
              : <ReceiptOutlinedIcon sx={{ fontSize: 19, color: '#6B5B57' }} />
          }
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2B1D1A', letterSpacing: '-0.1px' }}>
            {transactionType === 'RF' ? 'Refund — Select Tender' : transactionType === 'SL' ? 'Sale — Select Tender' : 'Select Sale or Refund'}
          </div>
          <div style={{
            fontSize: 12, fontWeight: transactionType ? 700 : 500, marginTop: 2,
            color: transactionType === 'RF' ? '#3E2723' : transactionType === 'SL' ? '#5D4037' : '#6B5B57',
          }}>
            {transactionType
              ? `Ready to choose payment method · $${transactionType === 'RF' ? (cartItems[0]?.sellingPrice ?? 0) : cartSubtotal}`
              : 'Lock SL or RF above to continue'}
          </div>
        </div>

        <ChevronRightIcon sx={{ fontSize: 20, color: transactionType ? '#5D4037' : '#C4B5B0', flexShrink: 0 }} />
      </button>

    </div>
  );
}
