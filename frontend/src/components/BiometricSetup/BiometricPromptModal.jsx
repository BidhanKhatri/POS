import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import useAuthStore from '../../store/useAuthStore';

const FONT = "'Plus Jakarta Sans', sans-serif";
const MAX_PROMPTS = 3;
const flagKey = (userId) => `biometric_prompt_count_${userId}`;

function getPromptCount(userId) {
  return parseInt(localStorage.getItem(flagKey(userId)) || '0', 10);
}
function incrementPromptCount(userId) {
  const next = Math.min(getPromptCount(userId) + 1, MAX_PROMPTS);
  localStorage.setItem(flagKey(userId), String(next));
  return next;
}

export default function BiometricPromptModal() {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width:1024px)');
  const { user, hasBiometric } = useAuthStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    if (!window.isSecureContext || !browserSupportsWebAuthn()) return;
    if (hasBiometric) return;
    if (getPromptCount(user._id) >= MAX_PROMPTS) return;

    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [user?._id, hasBiometric]);

  const dismiss = () => {
    incrementPromptCount(user._id);
    setVisible(false);
  };

  const handleSetUp = () => {
    incrementPromptCount(user._id);
    setVisible(false);
    navigate('/signup/biometric');
  };

  if (!visible || hasBiometric) return null;

  const remaining = MAX_PROMPTS - getPromptCount(user._id);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(30,18,14,0.4)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />

      {/* Bottom sheet (mobile) / centered popup (desktop) */}
      <div style={isDesktop ? {
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 901,
        width: '100%', maxWidth: 420,
        background: '#fff',
        borderRadius: 16,
        padding: '24px 24px 28px',
        fontFamily: FONT,
        boxShadow: '0 24px 64px rgba(42,23,21,0.22)',
        animation: 'bmFadeScaleIn 0.22s cubic-bezier(0.32,0.72,0,1)',
      } : {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 901,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 32px',
        fontFamily: FONT,
        boxShadow: '0 -8px 32px rgba(42,23,21,0.16)',
        animation: 'bmSlideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <style>{`
          @keyframes bmSlideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
          @keyframes bmFadeScaleIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
            to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}</style>

        {/* Drag handle — mobile only */}
        {!isDesktop && (
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: '#DDD2CC',
            margin: '0 auto 20px',
          }} />
        )}

        {/* Dismiss × */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid #DDD2CC', background: '#F5F0EC',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <CloseOutlinedIcon sx={{ fontSize: 16, color: '#6B5B57' }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 13, flexShrink: 0,
            background: 'rgba(62,39,35,0.09)',
            border: '1.5px solid rgba(62,39,35,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FingerprintIcon sx={{ fontSize: 27, color: '#3E2723' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#2B1D1A', lineHeight: '21px' }}>
              Enable Faster Login
            </p>
            <p style={{ margin: '5px 0 0', fontSize: 13, color: '#6B5B57', lineHeight: '19px' }}>
              Sign in instantly with Face ID, Touch ID, or fingerprint — no PIN needed next time.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleSetUp}
            style={{
              width: '100%', minHeight: 50,
              background: '#3E2723', color: '#fff',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <FingerprintIcon sx={{ fontSize: 18 }} />
            Set Up Biometric Login
          </button>

          <button
            onClick={dismiss}
            style={{
              width: '100%', minHeight: 44,
              background: 'transparent',
              border: '1px solid #DDD2CC', borderRadius: 10,
              fontSize: 14, fontWeight: 600, color: '#6B5B57',
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            {remaining > 1 ? 'Maybe Later' : "Don't Show Again"}
          </button>
        </div>
      </div>
    </>
  );
}
