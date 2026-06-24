import React, { useEffect, useRef, useState } from 'react';
import posLogo from '../assets/POS-logo.png';
import { useLoading } from '../context/LoadingContext';

const MIN_MS     = 800;   // minimum visible time so the logo doesn't flash
const FADE_MS    = 400;   // fade-out duration
const TIMEOUT_MS = 5000;  // force-dismiss if data never loads (e.g. no internet)

export default function SplashScreen() {
  const { loading, stopLoading } = useLoading();
  const [fading,  setFading]  = useState(false);
  const [visible, setVisible] = useState(true);
  const mountedAt = useRef(Date.now());

  // Hard timeout — dismiss after 5 s regardless of loading state
  useEffect(() => {
    const t = setTimeout(stopLoading, TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [stopLoading]);

  useEffect(() => {
    if (loading) return;

    const elapsed = Date.now() - mountedAt.current;
    const delay   = Math.max(0, MIN_MS - elapsed);

    const t1 = setTimeout(() => setFading(true),   delay);
    const t2 = setTimeout(() => setVisible(false),  delay + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes pos-pulse {
          0%   { transform: scale(1);    opacity: 1; }
          50%  { transform: scale(1.07); opacity: 0.82; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes pos-fade-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(251,249,247,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        transition: `opacity ${FADE_MS}ms ease`,
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'all',
      }}>
        <img
          src={posLogo}
          alt="POS"
          style={{
            width: 'min(180px, 42vw)',
            height: 'auto',
            borderRadius: 20,
            animation: 'pos-fade-in 0.45s ease both, pos-pulse 2s ease-in-out 0.45s infinite',
          }}
        />
      </div>
    </>
  );
}
