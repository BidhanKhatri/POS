import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import QrCodeScannerIcon      from '@mui/icons-material/QrCodeScanner';
import SearchIcon              from '@mui/icons-material/Search';
import CloseIcon               from '@mui/icons-material/Close';
import CameraAltOutlinedIcon  from '@mui/icons-material/CameraAltOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import AddIcon                 from '@mui/icons-material/Add';
import RemoveIcon              from '@mui/icons-material/Remove';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import FlashlightOnOutlinedIcon  from '@mui/icons-material/FlashlightOnOutlined';
import FlashlightOffOutlinedIcon from '@mui/icons-material/FlashlightOffOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import useAuthStore from '../store/useAuthStore';

import { API_URL as API } from '../config/api';

const C = {
  brown: '#3E2723', brownMid: '#5D4037', brownLight: '#6D4C41',
  accent: '#D4A373',
  bg: '#F5F3F1', white: '#ffffff', border: '#DDD2CC',
  muted: '#A09490', text: '#2B1D1A', textSec: '#6B5B57',
  green: '#2E7D32', greenBg: '#E8F5E9',
  red: '#C62828',   redBg: '#FFEBEE',
  amber: '#E65100', amberBg: '#FFF3E0',
};

const ZXING_HINTS = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_39,
    BarcodeFormat.CODABAR, BarcodeFormat.ITF,
  ]],
  [DecodeHintType.TRY_HARDER, true],
]);

const HAS_NATIVE_DETECTOR = typeof window !== 'undefined' && 'BarcodeDetector' in window;
const COOLDOWN_MS = 2000;

let _itemId = 0;
const nextId = () => ++_itemId;

export default function BarcodeScannerPage() {
  const { token } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Derive paths based on whether we're in manager or employee context
  const isManager       = location.pathname.startsWith('/manager');
  const discountPath    = isManager ? '/manager/discount'        : '/employee/discount';
  const tenderPath      = isManager ? '/manager/tender'          : '/employee/tender';
  const priceVarPath    = isManager ? '/manager/price-variance'  : '/employee/price-variance';

  // ── Camera state ──────────────────────────────────────────────────────────
  const [scanning,       setScanning]       = useState(false);
  const [scanStatus,     setScanStatus]     = useState('');
  const [torchOn,        setTorchOn]        = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [camError,       setCamError]       = useState('');

  // ── Lookup state ──────────────────────────────────────────────────────────
  const [manualValue,   setManualValue]    = useState('');
  const [lookupLoading, setLookupLoading]  = useState(false);
  const [lookupError,   setLookupError]    = useState('');
  const [lastScanned,   setLastScanned]    = useState('');

  // ── Cart & checkout ───────────────────────────────────────────────────────
  const [cartItems,      setCartItems]      = useState([]);  // [{id, product, sellingPrice, qty}]
  const [transactionType, setTransactionType] = useState('SL');
  const [checkingOut,    setCheckingOut]    = useState(false);

  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const zxingCtrlRef  = useRef(null);
  const rafRef        = useRef(null);
  const scanActiveRef = useRef(false);
  const lookingUpRef  = useRef(false);
  const lastScanRef   = useRef({ value: '', at: 0 });
  const audioCtxRef   = useRef(null);

  // ── Barcode scanner beep (classic 1800 Hz scanner tone) ──────────────────
  const beepScan = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      // Resume in case it was suspended (iOS requires user-gesture unlock)
      if (ctx.state === 'suspended') ctx.resume();

      // Two-tone scanner beep: short high chirp then slightly lower confirmation
      const tones = [
        { freq: 1850, start: 0,    dur: 0.06 },
        { freq: 1650, start: 0.07, dur: 0.08 },
      ];

      tones.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.connect(vol);
        vol.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        vol.gain.setValueAtTime(0, ctx.currentTime + start);
        vol.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.005);
        vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.01);
      });
    } catch { /* audio not supported */ }
  }, []);

  // ── Camera stop ───────────────────────────────────────────────────────────
  const stopScanner = useCallback(() => {
    scanActiveRef.current = false;
    if (zxingCtrlRef.current)  { try { zxingCtrlRef.current.stop(); } catch (_) {}; zxingCtrlRef.current = null; }
    if (rafRef.current)        { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current)     { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current)      { videoRef.current.srcObject = null; }
    setScanning(false); setTorchOn(false); setTorchSupported(false); setScanStatus('');
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);

  // ── Add product to cart ───────────────────────────────────────────────────
  const addProductToCart = useCallback((barcodeDoc) => {
    const p = barcodeDoc.productId;
    if (!p || p.isActive === false) return;
    const price = Number(p.price ?? 0);

    beepScan();

    setCartItems(prev => {
      // If same product already in cart, just increment qty
      const existing = prev.findIndex(i => i.product.productId === p._id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 };
        return updated;
      }
      return [...prev, {
        id: nextId(),
        product: {
          productId: p._id,   // matches terminal's format — TenderPage reads i.product.productId
          name:      p.name,
          sku:       barcodeDoc.sku,
          price:     price,
          code:      barcodeDoc.sku,
        },
        sellingPrice: price,
        qty: 1,
      }];
    });
  }, [beepScan]);

  // ── Barcode API lookup ────────────────────────────────────────────────────
  const lookupBarcode = useCallback(async (value) => {
    const code = value.trim();
    if (!code || lookingUpRef.current) return;

    const now = Date.now();
    if (code === lastScanRef.current.value && now - lastScanRef.current.at < COOLDOWN_MS) return;
    lastScanRef.current = { value: code, at: now };

    lookingUpRef.current = true;
    stopScanner();
    setLastScanned(code);
    setLookupLoading(true);
    setLookupError('');

    try {
      const res  = await fetch(`${API}/api/barcodes/scan/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Product not found');
      addProductToCart(data);
    } catch (err) {
      setLookupError(err.message || 'Failed to look up barcode');
    } finally {
      setLookupLoading(false);
      lookingUpRef.current = false;
    }
  }, [token, stopScanner, addProductToCart]);

  // ── Native BarcodeDetector loop ───────────────────────────────────────────
  const runNativeDetector = useCallback(async (detector) => {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d', { willReadFrequently: true });
    const loop = async () => {
      if (!scanActiveRef.current) return;
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) { rafRef.current = requestAnimationFrame(loop); return; }
      const vw = v.videoWidth, vh = v.videoHeight;
      canvas.width = Math.floor(vw * 0.9); canvas.height = Math.floor(vh * 0.4);
      ctx.drawImage(v, Math.floor(vw*0.05), Math.floor(vh*0.30), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      try {
        const hits = await detector.detect(canvas);
        if (hits.length > 0 && scanActiveRef.current) { lookupBarcode(hits[0].rawValue); return; }
      } catch (_) {}
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [lookupBarcode]);

  // ── ZXing decodeFromStream (iOS/Safari) ───────────────────────────────────
  const runZxingStream = useCallback(async () => {
    const reader = new BrowserMultiFormatReader(ZXING_HINTS, 80);
    try {
      const controls = await reader.decodeFromStream(streamRef.current, videoRef.current, (result) => {
        if (result && scanActiveRef.current) lookupBarcode(result.getText());
      });
      zxingCtrlRef.current = controls;
    } catch (err) {
      if (scanActiveRef.current) { setCamError(err?.message || 'Scanner failed.'); stopScanner(); }
    }
  }, [lookupBarcode, stopScanner]);

  // ── Camera start ──────────────────────────────────────────────────────────
  const startScanner = async () => {
    setCamError(''); setLookupError('');
    setScanStatus('Requesting camera…');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Camera not available. Use manual entry.'); setScanStatus(''); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream; video.setAttribute('playsinline', ''); video.muted = true;
      await video.play();
      const track = stream.getVideoTracks()[0];
      setTorchSupported(!!(track.getCapabilities?.()?.torch));
      scanActiveRef.current = true;
      setScanning(true); setScanStatus('Align barcode inside the box…');
      if (HAS_NATIVE_DETECTOR) {
        let formats = ['code_128','ean_13','ean_8','upc_a','upc_e','code_39','itf','codabar'];
        try { const sup = await window.BarcodeDetector.getSupportedFormats(); formats = formats.filter(f => sup.includes(f)); } catch (_) {}
        await runNativeDetector(new window.BarcodeDetector({ formats }));
      } else {
        await runZxingStream();
      }
    } catch (err) {
      stopScanner();
      setCamError(err?.name === 'NotAllowedError' ? 'Camera permission denied.' : err?.message || 'Camera unavailable.');
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try { await track.applyConstraints({ advanced: [{ torch: !torchOn }] }); setTorchOn(t => !t); } catch (_) {}
  };

  // ── Cart actions ──────────────────────────────────────────────────────────
  const changeQty = (id, delta) => {
    setCartItems(prev => prev
      .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    );
  };

  const removeItem = (id) => setCartItems(prev => prev.filter(i => i.id !== id));

  const cartSubtotal  = cartItems.reduce((s, i) => s + i.sellingPrice * i.qty, 0);
  const canCheckout   = cartItems.length > 0 && !checkingOut;

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!canCheckout) return;
    setCheckingOut(true);
    try {
      const [discRes, pvRes] = await Promise.all([
        fetch(`${API}/api/settings/discount-limit`,       { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/settings/price-variance-limit`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      let skipDiscount = false, maxVariance = 10;
      if (discRes.ok) { const d = await discRes.json(); skipDiscount = (d.maxDiscountPercent ?? 10) === 0; }
      if (pvRes.ok)   { const d = await pvRes.json();   maxVariance  = d.maxPriceVariancePercent ?? 10; }

      // Variance check (all items are at catalog price, so typically 0% — but guard anyway)
      const varianceItems = cartItems
        .filter(i => i.product.price > 0)
        .map(i => ({ ...i, variancePercent: Math.abs((i.sellingPrice - i.product.price) / i.product.price) * 100 }))
        .filter(i => i.variancePercent > maxVariance);

      if (varianceItems.length > 0) {
        navigate(priceVarPath, { state: { items: cartItems, varianceItems, transactionType } });
        return;
      }

      navigate(skipDiscount ? tenderPath : discountPath, {
        state: { amount: cartSubtotal, items: cartItems, transactionType, ...(skipDiscount && { discount: null }) },
      });
    } catch {
      // Proceed to discount page with defaults on settings fetch failure
      navigate(discountPath, { state: { amount: cartSubtotal, items: cartItems, transactionType } });
    } finally {
      setCheckingOut(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualValue.trim()) { lookupBarcode(manualValue); setManualValue(''); }
  };

  const stockColor = (q) => q === 0 ? C.red : q <= 5 ? C.amber : C.green;
  const stockBg    = (q) => q === 0 ? C.redBg : q <= 5 ? C.amberBg : C.greenBg;

  return (
    <div style={{ padding: '0 0 32px', fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg, minHeight: '100%' }}>

      {/* ── Page header ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.brown, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCodeScannerIcon sx={{ fontSize: 18, color: C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Barcode Scanner</p>
            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Scan items to build a bill, then checkout</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>

        {/* ════════════════════════════════════════
            SCAN SECTION
            ════════════════════════════════════════ */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 12 }}>

          {/* Camera toolbar */}
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Camera Scan</p>
            {scanning && torchSupported && (
              <button onClick={toggleTorch}
                style={{ background: torchOn ? C.brown : 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: torchOn ? '#fff' : C.muted, fontSize: 11, fontWeight: 600 }}>
                {torchOn ? <FlashlightOnOutlinedIcon sx={{ fontSize: 14 }} /> : <FlashlightOffOutlinedIcon sx={{ fontSize: 14 }} />}
                {torchOn ? 'Flash On' : 'Flash'}
              </button>
            )}
          </div>

          {/* Video */}
          <div style={{ position: 'relative', background: '#111', height: scanning ? 270 : 0, overflow: 'hidden', transition: 'height 0.25s ease' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {scanning && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: 0,    left: 0, right: 0, height: '30%', background: 'rgba(0,0,0,0.52)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'rgba(0,0,0,0.52)' }} />
                <div style={{ position: 'absolute', top: '30%', left: 0,  width: '5%', height: '40%', background: 'rgba(0,0,0,0.52)' }} />
                <div style={{ position: 'absolute', top: '30%', right: 0, width: '5%', height: '40%', background: 'rgba(0,0,0,0.52)' }} />
                <div style={{ position: 'absolute', top: '30%', left: '5%', right: '5%', height: '40%' }}>
                  <span style={{ position: 'absolute', top: 0,    left: 0,  width: 24, height: 24, borderTop: `3px solid ${C.accent}`, borderLeft:   `3px solid ${C.accent}`, borderRadius: '5px 0 0 0' }} />
                  <span style={{ position: 'absolute', top: 0,    right: 0, width: 24, height: 24, borderTop: `3px solid ${C.accent}`, borderRight:  `3px solid ${C.accent}`, borderRadius: '0 5px 0 0' }} />
                  <span style={{ position: 'absolute', bottom: 0, left: 0,  width: 24, height: 24, borderBottom: `3px solid ${C.accent}`, borderLeft:  `3px solid ${C.accent}`, borderRadius: '0 0 0 5px' }} />
                  <span style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderBottom: `3px solid ${C.accent}`, borderRight: `3px solid ${C.accent}`, borderRadius: '0 0 5px 0' }} />
                  <div style={{ position: 'absolute', left: 4, right: 4, height: 2, background: `linear-gradient(90deg,transparent,${C.accent},transparent)`, animation: 'scanline 2s ease-in-out infinite' }} />
                </div>
                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                  <span style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 14px', borderRadius: 20 }}>{scanStatus}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 14px' }}>
            {!scanning ? (
              <button onClick={startScanner}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: C.brown, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <CameraAltOutlinedIcon sx={{ fontSize: 17 }} /> Start Camera Scan
              </button>
            ) : (
              <button onClick={stopScanner}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: C.white, color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <StopCircleOutlinedIcon sx={{ fontSize: 17 }} /> Stop Scanning
              </button>
            )}
            {camError && <p style={{ margin: '8px 0 0', fontSize: 11, color: C.red, textAlign: 'center' }}>{camError}</p>}
            <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted, textAlign: 'center' }}>
              Hold barcode flat inside the box · or use manual entry below
            </p>
          </div>
        </div>

        {/* Manual entry */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 12 }}>
          <form onSubmit={handleManualSubmit} style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
            <input
              type="text" value={manualValue} onChange={e => setManualValue(e.target.value)}
              placeholder="Enter barcode or SKU…"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit', background: C.bg }}
            />
            <button type="submit" disabled={!manualValue.trim() || lookupLoading}
              style={{ padding: '9px 14px', background: manualValue.trim() ? C.brown : '#C0B5B0', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: manualValue.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <SearchIcon sx={{ fontSize: 15 }} /> Search
            </button>
          </form>
        </div>

        {/* Lookup feedback */}
        {lookupLoading && (
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.brown, animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.muted }}>Looking up <span style={{ fontFamily: 'monospace' }}>{lastScanned}</span>…</p>
          </div>
        )}
        {lookupError && !lookupLoading && (
          <div style={{ background: C.redBg, borderRadius: 12, border: '1px solid #FFCDD2', padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.red }}>{lookupError}</span>
            <button onClick={() => setLookupError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
              <CloseIcon sx={{ fontSize: 15, color: C.red }} />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════
            BILLING SECTION
            ════════════════════════════════════════ */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 12 }}>

          {/* Billing header */}
          <div style={{ background: '#FAF7F5', borderBottom: `1px solid ${C.border}`, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 15, color: C.muted }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Billing Details</span>
              {cartItems.length > 0 && (
                <span style={{ background: C.brown, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                  {cartItems.length} item{cartItems.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {cartItems.length > 0 && (
              <button onClick={() => setCartItems([])}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: C.red, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                <DeleteOutlineIcon sx={{ fontSize: 14 }} /> Clear all
              </button>
            )}
          </div>

          {/* Cart items */}
          <div style={{ padding: '0 14px' }}>
            {cartItems.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <QrCodeScannerIcon sx={{ fontSize: 32, color: '#DDD2CC', display: 'block', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 13, color: C.muted, fontStyle: 'italic' }}>No items yet — scan a barcode to start</p>
              </div>
            ) : (
              <>
                {cartItems.map((item) => (
                  <div key={item.id} style={{ padding: '11px 0', borderBottom: `1px solid #F0E8E3`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Product info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ padding: '2px 6px', borderRadius: 5, background: C.brown, color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', flexShrink: 0 }}>
                          {item.product.sku}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product.name}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
                        ${item.sellingPrice.toFixed(2)} × {item.qty} =&nbsp;
                        <strong style={{ color: C.text }}>${(item.sellingPrice * item.qty).toFixed(2)}</strong>
                      </p>
                    </div>

                    {/* Qty stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: C.bg, borderRadius: 9, border: `1px solid ${C.border}`, flexShrink: 0, overflow: 'hidden' }}>
                      <button onClick={() => changeQty(item.id, -1)}
                        style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSec }}>
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </button>
                      <span style={{ width: 28, textAlign: 'center', fontSize: 14, fontWeight: 800, color: C.text }}>
                        {item.qty}
                      </span>
                      <button onClick={() => changeQty(item.id, 1)}
                        style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.brown }}>
                        <AddIcon sx={{ fontSize: 14 }} />
                      </button>
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeItem(item.id)}
                      style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CloseIcon sx={{ fontSize: 13, color: C.muted }} />
                    </button>
                  </div>
                ))}

                {/* Subtotal */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 10px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Subtotal · {cartItems.reduce((s, i) => s + i.qty, 0)} unit{cartItems.reduce((s, i) => s + i.qty, 0) > 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                    ${cartSubtotal.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Transaction type ── */}
        {cartItems.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { type: 'SL', label: 'Sale',   bg: C.brownMid },
              { type: 'RF', label: 'Refund', bg: C.brown },
            ].map(({ type, label, bg }) => {
              const active = transactionType === type;
              return (
                <button key={type} onClick={() => setTransactionType(type)}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: active ? `2px solid ${C.accent}` : `1px solid ${C.border}`, background: active ? bg : C.white, color: active ? '#fff' : C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: active ? `0 3px 0 ${C.brown}` : 'none', transition: 'all 0.12s' }}>
                  {type} · {label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Checkout button ── */}
        {cartItems.length > 0 && (
          <button onClick={handleCheckout} disabled={!canCheckout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px', borderRadius: 12, border: canCheckout ? `2px solid ${C.accent}` : `1px solid #4a3329`,
              background: C.brownMid, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: canCheckout ? 'pointer' : 'not-allowed',
              opacity: canCheckout ? 1 : 0.5,
              boxShadow: canCheckout ? `0 4px 0 ${C.brown}, 0 6px 16px rgba(62,39,35,0.28), 0 0 0 1px ${C.accent}` : 'none',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
            {checkingOut
              ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> Processing…</>
              : <><ShoppingCartCheckoutIcon sx={{ fontSize: 20 }} /> Check Out · ${cartSubtotal.toFixed(2)}</>
            }
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes scanline {
          0%   { top: 2%;  opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 96%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
