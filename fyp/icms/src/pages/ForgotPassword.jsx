import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword, getErrorMessage } from '../services/api'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword({ email })
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Request failed.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell maxWidthClass="max-w-md" showNav={false}>
      <div className="mx-auto flex flex-col gap-8">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90">ICMS</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Reset password</h1>
          <p className="mt-2 text-sm text-slate-400">We&apos;ll email you a recovery link if the account exists.</p>
        </header>

        <GlassCard as="section" className="!p-8">
          {done ? (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm text-slate-300">
                If an account exists for <span className="font-medium text-white">{email}</span>, check your inbox for
                next steps.
              </p>
              <Link
                to="/login"
                className="text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
              <Input
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error ? (
                <p className="text-sm text-rose-400" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
              <p className="text-center text-sm text-slate-400">
                <Link className="text-indigo-300 hover:text-indigo-200 hover:underline" to="/login">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </GlassCard>
      </div>
    </PageShell>
  )
}
