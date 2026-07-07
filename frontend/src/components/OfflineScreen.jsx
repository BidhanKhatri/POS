import React, { useEffect, useRef, useState } from 'react';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';

const PROBE_URL = '/manifest.webmanifest';
const PROBE_INTERVAL_MS = 8000;
const PROBE_TIMEOUT_MS  = 4000;

/**
 * App-wide "no internet" overlay. Purely presentational — does not touch
 * routing, auth, or data fetching. TanStack Query already refetches on
 * reconnect (default `refetchOnReconnect: true`), so once we detect the
 * connection is back this just disappears and the app continues normally.
 *
 * `navigator.onLine` / the `online`/`offline` window events only reflect
 * whether a network interface is up — not whether the internet is actually
 * reachable, and iOS standalone (home-screen) PWAs are known to fire these
 * events unreliably. So on top of listening for them, we actively probe a
 * tiny same-origin static file on an interval to confirm real connectivity.
 */
export default function OfflineScreen() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const probingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      if (probingRef.current) return;
      probingRef.current = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      try {
        await fetch(`${PROBE_URL}?_=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        clearTimeout(timeout);
        probingRef.current = false;
      }
    };

    const goOnline  = () => probe();
    const goOffline = () => setOnline(false);
    const onVisible = () => { if (document.visibilityState === 'visible') probe(); };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', probe);

    // Only actively poll while we believe we're offline — cheap recovery
    // detection without constant background chatter while everything's fine.
    let interval = null;
    if (!online) {
      probe();
      interval = setInterval(probe, PROBE_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', probe);
    };
  }, [online]);

  if (online) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        background: 'rgba(245,243,241,0.97)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 60, height: 60, borderRadius: 16, background: '#3E2723',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <WifiOffRoundedIcon sx={{ fontSize: 28, color: '#D4A373' }} />
      </div>
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#2B1D1A' }}>You're offline</p>
        <p style={{ margin: 0, fontSize: 13, color: '#6B5B57', maxWidth: 280, lineHeight: 1.5 }}>
          No internet connection. POS will reconnect automatically as soon as you're back online.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B71C1C', animation: 'pos-offline-pulse 1.4s ease-in-out infinite' }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#A09490', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Waiting for connection</span>
      </div>
      <style>{`
        @keyframes pos-offline-pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
