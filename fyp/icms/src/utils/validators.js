const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email) {
  const s = String(email || '').trim()
  if (!s) return 'Email is required.'
  if (!EMAIL_RE.test(s)) return 'Enter a valid email address.'
  return ''
}

export function validatePassword(password, { min = 8, max = 4096 } = {}) {
  const s = String(password || '')
  if (!s) return 'Password is required.'
  if (s.length < min) return `Password must be at least ${min} characters.`
  if (s.length > max) return `Password must be at most ${max} characters.`
  return ''
}

export function validateName(name) {
  const s = String(name || '').trim()
  if (!s) return 'Name is required.'
  if (s.length < 2) return 'Name must be at least 2 characters.'
  return ''
}
