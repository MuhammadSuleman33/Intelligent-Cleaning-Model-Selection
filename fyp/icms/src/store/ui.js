/**
 * UI Store (Zustand)
 * 
 * Manages UI state:
 * - Modal visibility
 * - Sidebar state
 * - Preferences (theme, layout)
 * - Navigation state
 * 
 * Not persisted or partially persisted
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * UI state store
 * 
 * @property {Object} modals - Modal visibility states
 * @property {boolean} modals.modelDetail - Model detail modal
 * @property {boolean} modals.deleteConfirm - Delete confirmation modal
 * @property {boolean} sidebarOpen - Sidebar open/closed
 * @property {string} [theme] - Theme (light/dark)
 * @property {Object} selectedModel - Currently selected model for detail view
 */
export const useUIStore = create(
  persist(
    (set) => ({
      // Modal state
      modals: {
        modelDetail: false,
        deleteConfirm: false,
      },

      // Sidebar state
      sidebarOpen: true,

      // Theme
      theme: 'dark',

      // Selection state (not persisted)
      selectedModel: null,
      selectedProject: null,

      // Modal actions
      openModal: (modalName) =>
        set((state) => ({
          modals: { ...state.modals, [modalName]: true },
        })),

      closeModal: (modalName) =>
        set((state) => ({
          modals: { ...state.modals, [modalName]: false },
        })),

      toggleModal: (modalName) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [modalName]: !state.modals[modalName],
          },
        })),

      // Sidebar actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Theme actions
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      // Selection actions
      setSelectedModel: (model) => set({ selectedModel: model }),
      setSelectedProject: (project) => set({ selectedProject: project }),
      clearSelections: () =>
        set({
          selectedModel: null,
          selectedProject: null,
        }),

      // Reset all UI state
      reset: () =>
        set({
          modals: {
            modelDetail: false,
            deleteConfirm: false,
          },
          sidebarOpen: true,
          selectedModel: null,
          selectedProject: null,
        }),
    }),
    {
      name: 'ICMS_UI_PREFERENCES',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
      version: 1,
    },
  ),
)
