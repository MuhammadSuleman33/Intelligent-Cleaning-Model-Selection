import { useEffect, useRef, useState } from 'react'
import { fetchJobStatus, getErrorMessage } from '../services/api'

// Start with faster polling, gradually increase interval
const INITIAL_INTERVAL_MS = 2000 // 2 seconds
const MAX_INTERVAL_MS = 5000 // 5 seconds cap
const INTERVAL_INCREMENT_MS = 500 // Increase by 500ms every 10 polls

/**
 * Polls GET /jobs/status/:jobId until terminal state or unmount.
 * Optimized to reduce server load with adaptive polling intervals.
 * @param {string | null} jobId
 * @param {{ intervalMs?: number, enabled?: boolean }} [options]
 */
export function useJobPolling(jobId, options = {}) {
  const { intervalMs = INITIAL_INTERVAL_MS, enabled = true } = options
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const pollCountRef = useRef(0)
  const currentIntervalRef = useRef(intervalMs)

  const active = Boolean(jobId && enabled)
  const loading = active && status === null && error === null

  useEffect(() => {
    if (!active) {
      return undefined
    }

    let cancelled = false

    async function poll() {
      try {
        setError(null)
        const data = await fetchJobStatus(jobId)
        if (cancelled) return
        
        setStatus(data)

        const step = data?.step ?? data?.current_step
        const st = data?.status ?? data?.state
        const terminal =
          st === 'failed' ||
          st === 'error' ||
          step === 'completed' ||
          st === 'completed' ||
          data?.completed === true

        if (!terminal) {
          // Increment poll count and adapt interval
          pollCountRef.current += 1
          if (pollCountRef.current % 10 === 0) {
            // Every 10 polls, increase interval up to max
            currentIntervalRef.current = Math.min(
              MAX_INTERVAL_MS,
              currentIntervalRef.current + INTERVAL_INCREMENT_MS
            )
          }
          timerRef.current = window.setTimeout(poll, currentIntervalRef.current)
        }
      } catch (e) {
        if (cancelled) return
        setError(getErrorMessage(e, 'Failed to fetch job status.'))
        // On error, keep retry at doubled interval
        timerRef.current = window.setTimeout(poll, Math.min(MAX_INTERVAL_MS * 2, currentIntervalRef.current * 2))
      }
    }

    poll()

    return () => {
      cancelled = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [jobId, active])

  return { status, loading, error, setStatus }
}
