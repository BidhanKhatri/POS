import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

const IDLE_TIMEOUT_MS  = 15 * 60 * 1000; // 15 minutes of inactivity → lock
const SESSION_TTL_MS   = 24 * 60 * 60 * 1000; // 24 hours → force logout
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

export default function SessionMonitor() {
  const navigate = useNavigate();
  const { isLocked, lock, logout, isSessionExpired } = useAuthStore();

  const idleTimer  = useRef(null);
  const sessionRef = useRef(null);

  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      lock(); // AuthGate renders POSLockScreen when isLocked=true
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    // ── 1. Check 24-hour ceiling on mount ──────────────────────────────────
    if (isSessionExpired()) {
      logout();
      navigate('/login', { replace: true });
      return;
    }

    // ── 2. Hourly background check ─────────────────────────────────────────
    sessionRef.current = setInterval(() => {
      if (isSessionExpired()) {
        logout();
        navigate('/login', { replace: true });
      }
    }, 60 * 60 * 1000);

    // ── 3. Idle activity tracking ──────────────────────────────────────────
    resetIdleTimer();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));

    // ── 4. Lock immediately when the app is closed/backgrounded ────────────
    // A PWA that's backgrounded (app-switched away from, tab hidden, screen
    // locked) is usually just suspended in memory, not reloaded — so it
    // would never hit AuthGate's boot-time lock check when the user
    // returns. Locking the instant it goes hidden means it's already
    // locked by the time they come back, whether that return resumes the
    // same process or triggers a fresh reload (process was actually
    // killed) — either way, "closed and reopened" always shows the PIN.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') lock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(idleTimer.current);
      clearInterval(sessionRef.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause idle timer while locked — no point counting inactivity on lock screen
  useEffect(() => {
    if (isLocked) {
      clearTimeout(idleTimer.current);
    } else {
      resetIdleTimer();
    }
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // POSLockScreen is rendered by AuthGate (via isLocked state in Zustand).
  // SessionMonitor only manages timers — it renders nothing itself.
  return null;
}
