import React, { useEffect, useRef, useState } from 'react';
import posLogo from '../assets/POS-logo.png';
import { useLoading } from '../context/LoadingContext';
import useAuthStore from '../store/useAuthStore';
import { API_URL as API } from '../config/api';

const MIN_MS       = 800;
const FADE_MS      = 400;
const TIMEOUT_MS   = 5000;
const CACHE_KEY    = 'pos-store-logo-url';
const NAME_CACHE_KEY = 'pos-store-name';

export default function SplashScreen() {
  const { loading, stopLoading } = useLoading();
  const [fading,  setFading]  = useState(false);
  const [visible, setVisible] = useState(true);
  const mountedAt = useRef(Date.now());

  // Seed from cache immediately (no flash on repeat loads), then refresh from API
  const [logoSrc, setLogoSrc] = useState(() => localStorage.getItem(CACHE_KEY) || posLogo);
  const [storeName, setStoreName] = useState(() => localStorage.getItem(NAME_CACHE_KEY) || '');

  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;
    let cancelled = false;
    fetch(`${API}/api/settings/logo`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        const url = data?.data?.url ?? null;
        if (url) {
          localStorage.setItem(CACHE_KEY, url);
          setLogoSrc(url);
        } else {
          localStorage.removeItem(CACHE_KEY);
          setLogoSrc(posLogo);
        }
      })
      .catch(() => {});
    fetch(`${API}/api/settings/store-name`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        const name = data?.storeName?.trim() || '';
        setStoreName(name);
        if (name) localStorage.setItem(NAME_CACHE_KEY, name);
        else localStorage.removeItem(NAME_CACHE_KEY);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Hard timeout — dismiss after 5 s regardless of loading state. Re-armed
  // whenever a new loading cycle starts (not just on initial mount), so a
  // stuck startLoading() after login still self-clears.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(stopLoading, TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loading, stopLoading]);

  useEffect(() => {
    if (loading) {
      // `loading` is a reusable global flag — e.g. LoginScreen calls
      // startLoading() again right before navigating to the terminal, even
      // after this splash already dismissed once on the login screen. Bring
      // it back (and reset the min-visible-time clock) instead of staying
      // permanently hidden, so there's always a cover during route
      // transitions / lazy-chunk loads instead of a blank white flash.
      mountedAt.current = Date.now();
      setFading(false);
      setVisible(true);
      return;
    }
    const elapsed = Date.now() - mountedAt.current;
    const delay   = Math.max(0, MIN_MS - elapsed);
    const t1 = setTimeout(() => setFading(true),  delay);
    const t2 = setTimeout(() => setVisible(false), delay + FADE_MS);
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
        @keyframes pos-dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40%           { transform: scale(1);   opacity: 1;    }
        }
        @keyframes pos-text-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
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
          src={logoSrc}
          alt="POS"
          onError={() => setLogoSrc(posLogo)}
          style={{
            width: 'min(108px, 28vw)',
            height: 'auto',
            borderRadius: 16,
            objectFit: 'contain',
            animation: 'pos-fade-in 0.45s ease both, pos-pulse 2s ease-in-out 0.45s infinite',
          }}
        />

        {/* Store identity + loading indicator */}
        <div style={{
          marginTop: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          animation: 'pos-text-fade-in 0.5s ease 0.15s both',
        }}>
          {storeName ? (
            <>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.2px', lineHeight: 1.2 }}>{storeName}</p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#8C7E7A', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Powered by POS</p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#2B1D1A', letterSpacing: '-0.2px', lineHeight: 1.2 }}>POS</p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#8C7E7A', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Smart Point of Sale</p>
            </>
          )}

          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#D4A373',
                  animation: `pos-dot-bounce 1.2s ease-in-out ${i * 0.16}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
