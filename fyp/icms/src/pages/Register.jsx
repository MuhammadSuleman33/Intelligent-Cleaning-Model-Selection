import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { register, getErrorMessage, extractAuthFromResponse } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useAuthHydration } from '../hooks/useAuthHydration'
import { AuthLoading } from '../components/auth/AuthLoading'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { validateEmail, validateName, validatePassword } from '../utils/validators'
import { saveLastEmail } from '../utils/rememberEmail'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = useAuthStore((s) => s.token)
  const hydrated = useAuthHydration()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  if (!hydrated) {
    return <AuthLoading />
  }

  if (token) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    const ne = validateName(name)
    const ee = validateEmail(email)
    const pe = validatePassword(password)
    setFieldErrors({ name: ne, email: ee, password: pe })
    if (ne || ee || pe) return

    setLoading(true)
    try {
      const data = await register({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      const { token: accessToken, user } = extractAuthFromResponse(data)
      if (accessToken) {
        const resolvedUser =
          user && typeof user === 'object'
            ? { ...user, name: user.name || name.trim(), email: user.email || email.trim() }
            : { name: name.trim(), email: email.trim() }
        setAuth(accessToken, resolvedUser)
        saveLastEmail(email.trim())
        navigate('/', { replace: true })
        return
      }
      saveLastEmail(email.trim())
      setRegistered(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell maxWidthClass="max-w-md" showNav={false}>
      <div className="mx-auto flex flex-col gap-8">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">ICMS</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Create account</h1>
          <p className="mt-2 text-sm text-slate-400">Start building automated ML pipelines</p>
          <p className="mt-3 text-xs text-slate-500">
            After sign-up, your session is stored in local storage when the API returns a token. Passwords are never saved
            on the device.
          </p>
        </header>

        <GlassCard as="section" className="!p-8">
          {registered ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-lg font-semibold text-emerald-300">Account created</p>
              <p className="text-sm text-slate-300">
                Your account is ready. Sign in with the same email and password to continue.
              </p>
              <Button to="/login" state={{ email: email.trim() }}>
                Go to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
              <Input
                id="name"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                error={fieldErrors.name || undefined}
              />
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                error={fieldErrors.email || undefined}
              />
              <Input
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                error={fieldErrors.password || undefined}
              />
              {error ? (
                <p className="text-sm text-rose-400" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Register'}
              </Button>
            </form>
          )}
          {!registered ? (
            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline" to="/login">
                Sign in
              </Link>
            </p>
          ) : null}
        </GlassCard>
      </div>
    </PageShell>
  )
}
