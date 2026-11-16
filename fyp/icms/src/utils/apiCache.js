/**
 * API Request Caching and Debouncing Utilities
 * 
 * Caches API responses with TTL to avoid redundant requests
 * Debounces rapid API calls to reduce server load
 */

// Cache store: { key: { data, timestamp } }
const requestCache = new Map()

// Debounce timers: { key: timeoutId }
const debounceTimers = new Map()

const DEFAULT_TTL_MS = 60 * 1000 // 1 minute
const DEFAULT_DEBOUNCE_MS = 500 // 500ms

/**
 * Check if cache entry is still valid
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {boolean}
 */
export function isCacheValid(key, ttlMs = DEFAULT_TTL_MS) {
  if (!requestCache.has(key)) return false
  const { timestamp } = requestCache.get(key)
  return Date.now() - timestamp < ttlMs
}

/**
 * Get cached value if valid
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {any|null}
 */
export function getFromCache(key, ttlMs = DEFAULT_TTL_MS) {
  if (isCacheValid(key, ttlMs)) {
    return requestCache.get(key).data
  }
  requestCache.delete(key)
  return null
}

/**
 * Store value in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export function setCache(key, data) {
  requestCache.set(key, { data, timestamp: Date.now() })
}

/**
 * Clear specific cache key or entire cache
 * @param {string|null} key - Cache key to clear, or null to clear all
 */
export function clearCache(key = null) {
  if (key) {
    requestCache.delete(key)
  } else {
    requestCache.clear()
  }
}

/**
 * Debounce async function calls
 * Ensures function is called only after debounce period elapses
 * @param {string} key - Unique debounce key
 * @param {Function} fn - Async function to debounce
 * @param {number} delayMs - Debounce delay in milliseconds
 * @returns {Promise}
 */
export function debounceAsync(key, fn, delayMs = DEFAULT_DEBOUNCE_MS) {
  return new Promise((resolve, reject) => {
    // Clear existing timer
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key))
    }

    // Set new timer
    const timerId = setTimeout(async () => {
      debounceTimers.delete(key)
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }, delayMs)

    debounceTimers.set(key, timerId)
  })
}

/**
 * Invalidate cache entries matching a pattern
 * @param {string|RegExp} pattern - Pattern to match cache keys
 */
export function invalidateCachePattern(pattern) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
  for (const key of requestCache.keys()) {
    if (regex.test(key)) {
      requestCache.delete(key)
    }
  }
}
