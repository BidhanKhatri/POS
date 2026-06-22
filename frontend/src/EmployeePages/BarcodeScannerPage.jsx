import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import useAuthStore from '../store/useAuthStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const COLORS = {
  brown: '#3E2723',
  brownLight: '#6D4C41',
  bg: '#F5F3F1',
  white: '#ffffff',
  border: '#DDD2CC',
  muted: '#A09490',
  text: '#2B1D1A',
  green: '#2E7D32',
  greenBg: '#E8F5E9',
  red: '#C62828',
  redBg: '#FFEBEE',
  amber: '#E65100',
  amberBg: '#FFF3E0',
};

export default function BarcodeScannerPage() {
  const { token } = useAuthStore();
  const [scanning, setScanning] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanStatus, setScanStatus] = useState('');
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch (_) {}
      controlsRef.current = null;
    }
    setScanning(false);
    setScanStatus('');
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);

  const lookupBarcode = useCallback(async (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setProduct(null);
    stopScanner();

    try {
      const res = await fetch(
        `${API_BASE}/api/barcodes/scan/${encodeURIComponent(trimmed)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Barcode not found');
      setProduct(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, stopScanner]);

  const startScanner = async () => {
    setError('');
    setProduct(null);
    setScanStatus('Requesting camera...');

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!devices.length) throw new Error('No camera found on this device');

      // Prefer rear camera on mobile
      const rear = devices.find((d) =>
        /back|rear|environment/i.test(d.label)
      ) || devices[devices.length - 1];

      setScanning(true);
      setScanStatus('Point camera at a barcode...');

      const controls = await reader.decodeFromVideoDevice(
        rear.deviceId,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText();
            lookupBarcode(text);
          }
          if (err && err.name !== 'NotFoundException') {
            console.warn('Scan error:', err);
          }
        }
      );
      controlsRef.current = controls;
    } catch (err) {
      setScanning(false);
      setScanStatus('');
      setError(err.message || 'Camera unavailable. Use manual entry below.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualValue.trim()) lookupBarcode(manualValue);
  };

  const clearResult = () => {
    setProduct(null);
    setError('');
    setManualValue('');
  };

  const stockColor = (qty) => {
    if (qty === 0) return COLORS.red;
    if (qty <= 5) return COLORS.amber;
    return COLORS.green;
  };

  const stockBg = (qty) => {
    if (qty === 0) return COLORS.redBg;
    if (qty <= 5) return COLORS.amberBg;
    return COLORS.greenBg;
  };

  return (
    <div style={{ padding: '0 0 24px', fontFamily: "'Plus Jakarta Sans', sans-serif", background: COLORS.bg, minHeight: '100%' }}>

      {/* Page header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: COLORS.brown,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QrCodeScannerIcon sx={{ fontSize: 18, color: '#D4A373' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: COLORS.text }}>Barcode Scanner</p>
            <p style={{ margin: 0, fontSize: 11, color: COLORS.muted, fontWeight: 500 }}>Scan or enter barcode to find a product</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Camera scanner section */}
        <div style={{
          background: COLORS.white,
          borderRadius: 14,
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
          marginBottom: 14,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.text }}>
              Camera Scan
            </p>
          </div>

          {/* Video preview */}
          <div style={{
            position: 'relative',
            background: '#1A1A1A',
            minHeight: scanning ? 240 : 0,
            maxHeight: scanning ? 320 : 0,
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: scanning ? 'block' : 'none',
              }}
            />
            {scanning && (
              <>
                {/* Scan frame overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    width: 200, height: 100,
                    border: '2px solid rgba(212,163,115,0.9)',
                    borderRadius: 8,
                    boxShadow: '0 0 0 2000px rgba(0,0,0,0.38)',
                  }} />
                </div>
                {/* Status */}
                <div style={{
                  position: 'absolute', bottom: 12, left: 0, right: 0,
                  display: 'flex', justifyContent: 'center',
                }}>
                  <span style={{
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    fontSize: 11, fontWeight: 600,
                    padding: '4px 12px', borderRadius: 20,
                  }}>
                    {scanStatus}
                  </span>
                </div>
              </>
            )}
          </div>

          <div style={{ padding: '14px 16px' }}>
            {!scanning ? (
              <button
                onClick={startScanner}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 0',
                  background: COLORS.brown,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <CameraAltOutlinedIcon sx={{ fontSize: 18 }} />
                Start Camera Scan
              </button>
            ) : (
              <button
                onClick={stopScanner}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 0',
                  background: '#fff',
                  color: COLORS.red,
                  border: `1.5px solid ${COLORS.red}`,
                  borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <StopCircleOutlinedIcon sx={{ fontSize: 18 }} />
                Stop Scanning
              </button>
            )}
          </div>
        </div>

        {/* Manual entry section */}
        <div style={{
          background: COLORS.white,
          borderRadius: 14,
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
          marginBottom: 14,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.text }}>
              Manual Entry
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: COLORS.muted }}>Enter barcode value or SKU</p>
          </div>
          <form onSubmit={handleManualSubmit} style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="e.g. POS1T3K2MX or SKU-001"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 9,
                border: `1.5px solid ${COLORS.border}`,
                fontSize: 13,
                fontWeight: 500,
                color: COLORS.text,
                outline: 'none',
                fontFamily: 'inherit',
                background: COLORS.bg,
              }}
            />
            <button
              type="submit"
              disabled={!manualValue.trim() || loading}
              style={{
                padding: '10px 16px',
                background: manualValue.trim() ? COLORS.brown : '#C0B5B0',
                color: '#fff',
                border: 'none',
                borderRadius: 9,
                fontSize: 13, fontWeight: 700,
                cursor: manualValue.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0,
              }}
            >
              <SearchIcon sx={{ fontSize: 16 }} />
              Search
            </button>
          </form>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{
            background: COLORS.white, borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            padding: '24px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 14,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `2px solid ${COLORS.border}`,
              borderTopColor: COLORS.brown,
              animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.muted }}>Looking up barcode...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            background: COLORS.redBg, borderRadius: 14,
            border: `1px solid #FFCDD2`,
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.red }}>{error}</span>
            <button onClick={clearResult} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <CloseIcon sx={{ fontSize: 16, color: COLORS.red }} />
            </button>
          </div>
        )}

        {/* Product result card */}
        {product && !loading && (
          <div style={{
            background: COLORS.white, borderRadius: 14,
            border: `1px solid ${COLORS.border}`,
            overflow: 'hidden',
            marginBottom: 14,
          }}>
            {/* Card header */}
            <div style={{
              padding: '12px 16px',
              background: '#F2EBE5',
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Inventory2OutlinedIcon sx={{ fontSize: 16, color: COLORS.brown }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.brown }}>Product Found</span>
              </div>
              <button onClick={clearResult} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <CloseIcon sx={{ fontSize: 16, color: COLORS.muted }} />
              </button>
            </div>

            {/* Product details */}
            <div style={{ padding: '16px' }}>
              <p style={{ margin: '0 0 2px', fontSize: 17, fontWeight: 800, color: COLORS.text, lineHeight: '22px' }}>
                {product.productId?.name || product.productName}
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: COLORS.muted, fontWeight: 500 }}>
                SKU: {product.sku}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <InfoTile label="Default Price" value={`$${Number(product.productId?.price ?? 0).toFixed(2)}`} />
                <InfoTile
                  label="Stock"
                  value={`${product.productId?.stockQty ?? 0} units`}
                  valueColor={stockColor(product.productId?.stockQty ?? 0)}
                  bg={stockBg(product.productId?.stockQty ?? 0)}
                />
              </div>

              <div style={{
                background: COLORS.bg, borderRadius: 9,
                padding: '10px 12px',
                border: `1px solid ${COLORS.border}`,
              }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Barcode
                </p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.text, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                  {product.barcodeValue}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: COLORS.muted }}>
                  Generated {new Date(product.createdAt).toLocaleDateString()}
                </p>
              </div>

              {product.productId?.isActive === false && (
                <div style={{
                  marginTop: 10, padding: '8px 12px',
                  background: COLORS.redBg,
                  borderRadius: 8,
                  fontSize: 12, fontWeight: 600, color: COLORS.red,
                }}>
                  This product is currently inactive
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function InfoTile({ label, value, valueColor, bg }) {
  return (
    <div style={{
      background: bg || '#F9F6F3',
      borderRadius: 9,
      padding: '10px 12px',
      border: `1px solid ${COLORS.border}`,
    }}>
      <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: valueColor || COLORS.text }}>
        {value}
      </p>
    </div>
  );
}
