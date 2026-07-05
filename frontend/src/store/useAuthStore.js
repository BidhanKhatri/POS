import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Returns a stable UUID for this browser / device.
 * Stored in localStorage (outside Zustand so it never resets on logout).
 */
export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem('pos-device-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('pos-device-id', id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
}

/** Derive the minimal profile stored for lock-screen display. */
function toTrustedUser(user) {
  if (!user) return null;
  return {
    _id:          user._id,
    name:         user.name,
    role:         user.role,
    email:        user.email,
    employeeCode: user.employeeCode,
    imageUrl:     user.imageUrl ?? null,
  };
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── Active session ───────────────────────────────────────────────────────
      user:             null,   // full user object while logged in
      token:            null,   // short-lived JWT (access token)
      sessionCreatedAt: null,   // ms — set on login, used for 24-hour ceiling

      // ── Trusted device ───────────────────────────────────────────────────────
      trustedUser:  null,  // persisted across sessions for lock-screen display
      refreshToken: null,  // long-lived (30d) — hashed on server, rotated on use

      // ── UI state ─────────────────────────────────────────────────────────────
      lastEmail:    '',
      hasBiometric: false,
      isLocked:     false,

      // toDateString() of the last time the lock screen was shown — gates
      // the boot/refresh lock so it only reappears once per day.
      lastLockDate: null,

      // ── Basic setters ────────────────────────────────────────────────────────
      setUser:         (user)  => set({ user }),
      setToken:        (token) => set({ token, sessionCreatedAt: Date.now(), isLocked: false }),
      setLastEmail:    (email) => set({ lastEmail: email }),
      setHasBiometric: (val)   => set({ hasBiometric: val }),
      lock:            ()      => set({ isLocked: true, lastLockDate: new Date().toDateString() }),
      unlock:          ()      => set({ isLocked: false }),

      isSessionExpired: () => {
        const { sessionCreatedAt } = get();
        if (!sessionCreatedAt) return false;
        return Date.now() - sessionCreatedAt > SESSION_TTL_MS;
      },

      /**
       * Called after a successful login (Email+PIN or biometric).
       * Stores the full session AND the trusted device credentials.
       */
      setTrustedSession: (user, token, refreshToken) => set({
        user,
        token,
        refreshToken:     refreshToken ?? get().refreshToken,
        trustedUser:      toTrustedUser(user),
        lastEmail:        user.email,
        sessionCreatedAt: Date.now(),
        isLocked:         false,
      }),

      /**
       * Called after a successful /api/auth/refresh.
       * Updates credentials but keeps isLocked=true so the lock screen stays
       * visible until the user provides PIN or biometric.
       */
      applyRefresh: (user, token, refreshToken) => set({
        user,
        token,
        refreshToken,
        trustedUser:      toTrustedUser(user),
        sessionCreatedAt: Date.now(),
        isLocked:         true,
      }),

      /**
       * "Switch Account" — clears the trusted user for this terminal and returns
       * to the Email+PIN login screen without affecting other sessions.
       */
      switchAccount: () => set({
        user:             null,
        token:            null,
        trustedUser:      null,
        refreshToken:     null,
        isLocked:         false,
        sessionCreatedAt: null,
      }),

      /** Full logout — clears everything. */
      logout: () => set({
        user:             null,
        token:            null,
        isLocked:         false,
        sessionCreatedAt: null,
        trustedUser:      null,
        refreshToken:     null,
        hasBiometric:     false,
      }),
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({
        lastEmail:        state.lastEmail,
        token:            state.token,
        user:             state.user,
        hasBiometric:     state.hasBiometric,
        isLocked:         state.isLocked,
        lastLockDate:     state.lastLockDate,
        sessionCreatedAt: state.sessionCreatedAt,
        trustedUser:      state.trustedUser,
        refreshToken:     state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
