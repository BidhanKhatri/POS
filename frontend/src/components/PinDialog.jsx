import React, { useEffect, useState } from 'react';
import { Dialog, useMediaQuery } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';

const C = {
  primary: '#3E2723', accent: '#D4A373', error: '#B71C1C',
  bg: '#F5F3F1', surface: '#FFFFFF', border: '#DDD2CC',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
};

/**
 * Generic 4-digit manager PIN entry dialog. Numeric keypad, auto-submits
 * once 4 digits are entered, shake-on-error. `contextContent` is an
 * arbitrary ReactNode slot for whatever detail panel the caller needs
 * (e.g. shift/employee info for Force Checkout) — this component itself
 * has no knowledge of what it's authorizing.
 */
export default function PinDialog({
  open, title, subtitle, contextContent,
  error, submitting, onClose, onConfirm,
  confirmLabel = 'Authorize', danger = false, maxWidth = 640,
}) {
  const [pin, setPin]     = useState('');
  const [shake, setShake] = useState(false);
  const isMobile = useMediaQuery('(max-width:480px)');

  useEffect(() => { if (open) setPin(''); }, [open]);

  useEffect(() => {
    if (pin.length === 4) {
      const t = setTimeout(() => onConfirm(pin), 120);
      return () => clearTimeout(t);
    }
  }, [pin]);

  const push = (d) => { if (!submitting) setPin((p) => (p.length >= 4 ? p : p + d)); };
  const del   = () => { if (!submitting) setPin((p) => p.slice(0, -1)); };
  const clear = () => { if (!submitting) setPin(''); };
  const handleClose = () => { setPin(''); onClose(); };

  const ROWS = [['1','2','3'],['4','5','6'],['7','8','9']];

  const keyBtn = (label, onClick, variant = 'digit') => {
    const isDigit = variant === 'digit';
    const sz = isMobile ? 68 : 72;
    return (
      <button
        key={typeof label === 'string' ? label : 'del'}
        onClick={onClick}
        disabled={submitting}
        style={{
          width: sz, height: sz, borderRadius: 14,
          border: `1px solid ${isDigit ? C.border : 'transparent'}`,
          background: isDigit ? C.surface : variant === 'action' ? C.bg : 'transparent',
          fontSize: isDigit ? (isMobile ? 20 : 22) : 12,
          fontWeight: isDigit ? 700 : 600,
          color: isDigit ? C.textPri : C.textSec,
          cursor: submitting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDigit ? `0 3px 0 ${C.border}` : 'none',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          flexShrink: 0, opacity: submitting ? 0.5 : 1,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{ style: { borderRadius: 20, width: isMobile ? '96vw' : maxWidth, maxWidth, margin: 'auto', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" } }}
      slotProps={{ backdrop: { style: { backdropFilter: 'blur(3px)', background: 'rgba(42,23,21,0.35)' } } }}
    >
      <div style={{
        background: danger ? `linear-gradient(135deg, ${C.error} 0%, #7B1010 100%)` : `linear-gradient(135deg, ${C.primary} 0%, #5D4037 100%)`,
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: danger ? 'rgba(255,255,255,0.15)' : 'rgba(212,163,115,0.18)', border: `1px solid ${danger ? 'rgba(255,255,255,0.25)' : 'rgba(212,163,115,0.30)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LockOutlinedIcon sx={{ fontSize: 18, color: danger ? '#fff' : C.accent }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{title}</p>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{subtitle}</p>}
          </div>
        </div>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', opacity: 0.6 }}>
          <CloseOutlinedIcon sx={{ fontSize: 18, color: '#fff' }} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, padding: isMobile ? '18px 18px 0' : '22px 24px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, borderRight: isMobile ? 'none' : `1px solid ${C.border}`, borderBottom: isMobile ? `1px solid ${C.border}` : 'none' }}>
          {contextContent && <div>{contextContent}</div>}

          <div>
            <p style={{ margin: `0 0 ${isMobile ? 6 : 10}px`, fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Enter 4-Digit PIN
            </p>
            <div className={shake ? 'pin-shake' : ''} style={{ display: 'flex', gap: isMobile ? 8 : 12, padding: isMobile ? '8px 14px' : '14px 18px', borderRadius: isMobile ? 9 : 12, background: C.bg, border: `1.5px solid ${error ? C.error : pin.length === 4 ? (danger ? C.error : C.primary) : C.border}`, transition: 'border-color 0.15s' }}>
              {[0,1,2,3].map((i) => (
                <div key={i} style={{ flex: 1, height: isMobile ? 8 : 14, borderRadius: 3, background: i < pin.length ? (danger ? C.error : C.primary) : C.border, transition: 'background 0.12s' }} />
              ))}
            </div>
            {error && <p style={{ margin: '5px 0 0', fontSize: 11, fontWeight: 700, color: C.error }}>{error}</p>}
          </div>

          <div style={{ display: 'flex', gap: 8, paddingBottom: isMobile ? 18 : 0 }}>
            <button onClick={handleClose} disabled={submitting} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.textSec, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Cancel
            </button>
            <button
              onClick={() => { if (pin.length < 4) { setShake(true); setTimeout(() => setShake(false), 450); return; } onConfirm(pin); }}
              disabled={submitting || pin.length < 4}
              style={{ flex: 2, height: 44, borderRadius: 10, border: pin.length === 4 ? `2px solid ${danger ? C.error : C.accent}` : `1px solid ${C.border}`, background: pin.length === 4 ? (danger ? C.error : C.primary) : C.bg, fontSize: 13, fontWeight: 700, color: pin.length === 4 ? '#fff' : C.textDim, cursor: submitting || pin.length < 4 ? 'not-allowed' : 'pointer', opacity: submitting ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: pin.length === 4 ? `0 3px 0 ${danger ? '#7B0000' : '#2A1715'}` : 'none', transition: 'all 0.15s' }}
            >
              <KeyOutlinedIcon sx={{ fontSize: 15 }} />
              {submitting ? 'Verifying…' : confirmLabel}
            </button>
          </div>
        </div>

        <div style={{ padding: isMobile ? '18px' : '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.bg }}>
          {ROWS.map((row) => (
            <div key={row[0]} style={{ display: 'flex', gap: 8 }}>
              {row.map((d) => keyBtn(d, () => push(d), 'digit'))}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            {keyBtn('CLR', clear, 'action')}
            {keyBtn('0', () => push('0'), 'digit')}
            {keyBtn(<BackspaceOutlinedIcon sx={{ fontSize: 18 }} />, del, 'action')}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
