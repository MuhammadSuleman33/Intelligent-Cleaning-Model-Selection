import { ICMS_LAST_EMAIL_KEY } from '../constants/storageKeys'

export function getSavedEmail() {
  try {
    return localStorage.getItem(ICMS_LAST_EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

/** @param {string} email */
export function saveLastEmail(email) {
  try {
    const s = String(email || '').trim()
    if (s) localStorage.setItem(ICMS_LAST_EMAIL_KEY, s)
    else localStorage.removeItem(ICMS_LAST_EMAIL_KEY)
  } catch {
    /* quota / private mode */
  }
}

export function clearLastEmail() {
  try {
    localStorage.removeItem(ICMS_LAST_EMAIL_KEY)
  } catch {
    /* ignore */
  }
}
