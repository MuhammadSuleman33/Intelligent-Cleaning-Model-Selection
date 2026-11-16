import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ICMS_AUTH_STORAGE_KEY } from '../constants/storageKeys'

/**
 * Session is persisted to localStorage under `ICMS_AUTH_STORAGE_KEY`:
 * `{ state: { token, user }, version }` — Zustand persist format.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: ICMS_AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      version: 1,
    },
  ),
)
