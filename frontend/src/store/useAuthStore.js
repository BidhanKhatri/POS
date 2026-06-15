import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      lastEmail: '',
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLastEmail: (email) => set({ lastEmail: email }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({
        lastEmail: state.lastEmail,
        token: state.token,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
