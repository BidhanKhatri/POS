import React, { createContext, useContext, useState } from 'react';
import { useSocketEvent } from './SocketContext';
import { EVENTS } from '../socket/events';
import useAuthStore from '../store/useAuthStore';

/**
 * Single shared subscription point for shift-ended / force-checkout socket
 * events, so both TerminalPage and TenderPage (a separate route, not a
 * sub-state of Terminal) react to the same lock signal instead of each
 * needing its own duplicate listener. Employee-only — Managers/Admins are
 * never shift-bound (mirrors the server-side requireActiveShift/
 * requireShiftNotEnded bypass).
 */
const ShiftGateContext = createContext({ forceLocked: false, lockReason: '' });

const DEFAULT_LOCK_REASON = 'Shift has ended. Please contact your manager.';

export function ShiftGateProvider({ children }) {
  const role = useAuthStore((s) => s.user?.role);
  const [forceLocked, setForceLocked] = useState(false);
  const [lockReason, setLockReason]   = useState(DEFAULT_LOCK_REASON);

  const isEmployee = role === 'Employee';

  useSocketEvent(isEmployee ? EVENTS.SHIFT_ENDED : null, () => {
    setForceLocked(true);
    setLockReason(DEFAULT_LOCK_REASON);
  });

  useSocketEvent(isEmployee ? EVENTS.FORCE_CHECKOUT : null, (payload) => {
    setForceLocked(true);
    setLockReason(payload?.reason
      ? `Your manager ended your shift: ${payload.reason}`
      : DEFAULT_LOCK_REASON);
  });

  // EMS attendance sync — EMS is the source of truth, so a clock-in there
  // must clear any prior lock (shift-ended/forced) instantly, and a clock-out
  // there must lock the terminal exactly like a manager-forced checkout does.
  useSocketEvent(isEmployee ? EVENTS.EMS_CLOCK_IN : null, () => {
    setForceLocked(false);
  });

  useSocketEvent(isEmployee ? EVENTS.EMS_CLOCK_OUT : null, () => {
    setForceLocked(true);
    setLockReason('Clocked out via EMS attendance.');
  });

  return (
    <ShiftGateContext.Provider value={{ forceLocked, lockReason }}>
      {children}
    </ShiftGateContext.Provider>
  );
}

export function useShiftGate() {
  return useContext(ShiftGateContext);
}
