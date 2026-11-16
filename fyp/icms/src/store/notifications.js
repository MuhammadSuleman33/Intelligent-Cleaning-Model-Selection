/**
 * Notifications Store (Zustand)
 * 
 * Manages notification/toast messages:
 * - Success messages
 * - Error messages
 * - Info/warning messages
 * - Auto-dismiss handling
 * 
 * Not persisted (runtime only)
 */

import { create } from 'zustand'

/**
 * @typedef {Object} Notification
 * @property {string} id - Unique notification ID
 * @property {string} type - Type: 'success', 'error', 'info', 'warning'
 * @property {string} message - Notification message
 * @property {number} [duration] - Duration in ms before auto-dismiss (0 = no auto-dismiss)
 * @property {() => void} [action] - Optional action callback
 * @property {string} [actionLabel] - Label for action button
 */

let notificationId = 0

/**
 * Notifications state store
 * 
 * @property {Notification[]} notifications - Active notifications queue
 * @property {(notification: Omit<Notification, 'id'>) => string} addNotification - Add notification
 * @property {(id: string) => void} removeNotification - Remove by ID
 * @property {(type: string, message: string, duration?: number) => string} notify - Helper for common types
 * @property {(message: string, duration?: number) => string} success - Success notification
 * @property {(message: string, duration?: number) => string} error - Error notification
 * @property {(message: string, duration?: number) => string} info - Info notification
 * @property {() => void} clearAll - Clear all notifications
 */
export const useNotificationStore = create((set, get) => ({
  notifications: [],

  /**
   * Add a notification to the queue
   * @param {Omit<Notification, 'id'>} notification
   * @returns {string} Notification ID
   */
  addNotification: (notification) => {
    const id = String(notificationId++)
    const { duration = 5000 } = notification

    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }))

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, duration)
    }

    return id
  },

  /**
   * Remove notification by ID
   * @param {string} id
   */
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  /**
   * Generic notification helper
   * @param {string} type
   * @param {string} message
   * @param {number} duration
   * @returns {string} Notification ID
   */
  notify: (type, message, duration = 5000) => {
    return get().addNotification({ type, message, duration })
  },

  /**
   * Success notification
   * @param {string} message
   * @param {number} [duration=5000]
   * @returns {string} Notification ID
   */
  success: (message, duration = 5000) => {
    return get().notify('success', message, duration)
  },

  /**
   * Error notification
   * @param {string} message
   * @param {number} [duration=7000]
   * @returns {string} Notification ID
   */
  error: (message, duration = 7000) => {
    return get().notify('error', message, duration)
  },

  /**
   * Info notification
   * @param {string} message
   * @param {number} [duration=5000]
   * @returns {string} Notification ID
   */
  info: (message, duration = 5000) => {
    return get().notify('info', message, duration)
  },

  /**
   * Warning notification
   * @param {string} message
   * @param {number} [duration=6000]
   * @returns {string} Notification ID
   */
  warning: (message, duration = 6000) => {
    return get().notify('warning', message, duration)
  },

  /**
   * Clear all notifications
   */
  clearAll: () => set({ notifications: [] }),
}))
