import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes of inactivity → lock
const SESSION_TTL_MS  = 24 * 60 * 60 * 1000; // 24 hours → force logout
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

    return () => {
      clearTimeout(idleTimer.current);
      clearInterval(sessionRef.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer));
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
