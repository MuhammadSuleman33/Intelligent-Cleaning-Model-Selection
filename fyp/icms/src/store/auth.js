/**
 * Authentication Store (Zustand)
 * 
 * Manages:
 * - JWT token and user object
 * - Login/logout state
 * - Authentication persistence to localStorage
 * 
 * Persisted to localStorage as: ICMS_AUTH_SESSION
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ICMS_AUTH_STORAGE_KEY } from '../constants/storageKeys'

/**
 * @typedef {Object} User
 * @property {string} id - User UUID
 * @property {string} email - User email
 * @property {string} [name] - User display name
 * @property {string} [full_name] - User full name
 * @property {string} role - User role (e.g., 'student', 'admin')
 * @property {boolean} is_active - Account active status
 */

/**
 * Authentication state store
 * 
 * @property {string|null} token - JWT access token
 * @property {User|null} user - Authenticated user object
 * @property {(token: string, user: User) => void} setAuth - Set auth state
 * @property {() => void} logout - Clear auth state
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      /**
       * Set authentication state from login/register
       * @param {string} token - JWT token from backend
       * @param {User} user - User object from backend
       */
      setAuth: (token, user) => {
        set({ token, user })
      },

      /**
       * Clear authentication state (logout)
       */
      logout: () => {
        set({ token: null, user: null })
      },

      /**
       * Check if user is authenticated
       * @returns {boolean}
       */
      isAuthenticated: () => {
        const state = useAuthStore.getState()
        return Boolean(state.token && state.user)
      },
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
