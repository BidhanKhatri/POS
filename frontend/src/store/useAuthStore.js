import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:             null,
      token:            null,
      lastEmail:        '',
      hasBiometric:     false,
      isLocked:         false,
      sessionCreatedAt: null, // ms timestamp — set on login, cleared on logout

      setUser:        (user)  => set({ user }),
      // setToken resets session clock — only called on fresh login
      setToken:       (token) => set({ token, sessionCreatedAt: Date.now(), isLocked: false }),
      setLastEmail:   (email) => set({ lastEmail: email }),
      setHasBiometric:(val)   => set({ hasBiometric: val }),

      lock:   () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false }),

      /** True when the 24-hour session window has expired. */
      isSessionExpired: () => {
        const { sessionCreatedAt } = get();
        if (!sessionCreatedAt) return false;
        return Date.now() - sessionCreatedAt > SESSION_TTL_MS;
      },

      logout: () => set({
        user: null, token: null,
        isLocked: false, sessionCreatedAt: null,
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
        sessionCreatedAt: state.sessionCreatedAt,
      }),
    }
  )
);

export default useAuthStore;
