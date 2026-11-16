import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'

/**
 * Zustand `persist` may finish rehydrating before this component's `useEffect` runs.
 * If we only subscribe to `onFinishHydration` and skip `setHydrated(true)` when
 * `hasHydrated()` is already true in the effect, Login/Register stay stuck on loading.
 */
export function useAuthHydration() {
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated())

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      queueMicrotask(() => setHydrated(true))
      return undefined
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
