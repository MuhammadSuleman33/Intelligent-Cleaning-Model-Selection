import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { login, getErrorMessage, extractAuthFromResponse } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useAuthHydration } from '../hooks/useAuthHydration'
import { AuthLoading } from '../components/auth/AuthLoading'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { validateEmail, validatePassword } from '../utils/validators'
import { getSavedEmail, saveLastEmail, clearLastEmail } from '../utils/rememberEmail'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = useAuthStore((s) => s.token)
  const hydrated = useAuthHydration()

  const [email, setEmail] = useState(() => location.state?.email || getSavedEmail() || '')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(getSavedEmail() || location.state?.email))
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  if (!hydrated) {
    return <AuthLoading />
  }

  if (token) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const ee = validateEmail(email)
    const pe = validatePassword(password)
    setFieldErrors({ email: ee, password: pe })
    if (ee || pe) return

    setLoading(true)
    try {
      const data = await login({ email: email.trim(), password })
      const { token: accessToken, user } = extractAuthFromResponse(data)
      const resolvedUser =
        user && typeof user === 'object'
          ? { ...user, email: user.email || email.trim() }
          : { email: email.trim() }
      if (!accessToken) throw new Error('No token returned from server.')
      setAuth(accessToken, resolvedUser)
      if (rememberEmail) {
        saveLastEmail(email.trim())
      } else {
        clearLastEmail()
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell maxWidthClass="max-w-md" showNav={false}>
      <div className="mx-auto flex flex-col gap-8">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">ICMS</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">Intelligent Cleaning and Model Selection System</p>
        </header>

        <GlassCard as="section" className="!p-8">
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <Input
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email || undefined}
            />
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password || undefined}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="size-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/40"
              />
              Remember email on this device
            </label>
            {error ? (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-6 flex flex-col gap-2 text-center text-sm text-slate-400">
            <Link className="text-indigo-300 hover:text-indigo-200 hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
            <p>
              No account?{' '}
              <Link className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline" to="/register">
                Register
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </PageShell>
  )
}
