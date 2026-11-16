import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { ICMS_AUTH_STORAGE_KEY, ICMS_LAST_EMAIL_KEY } from '../constants/storageKeys'

export default function Settings() {
  const { user, logout } = useAuth()
  const api = import.meta.env.VITE_API_BASE_URL || '(not set — relative requests)'

  return (
    <PageShell maxWidthClass="max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold text-white">Settings</h1>
      <p className="mb-8 text-sm text-slate-400">Account and environment (client-side only).</p>

      <div className="flex flex-col gap-6">
        <GlassCard>
          <h2 className="text-lg font-semibold text-white">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="text-slate-200">{user?.name || user?.full_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-200">{user?.email || '—'}</dd>
            </div>
          </dl>
          <Button type="button" variant="danger" className="mt-6" onClick={() => logout()}>
            Log out
          </Button>
        </GlassCard>

        {/* <GlassCard>
          <h2 className="text-lg font-semibold text-white">Environment</h2>
          <p className="mt-2 break-all text-sm text-slate-400">
            <span className="text-slate-500">VITE_API_BASE_URL:</span> {api}
          </p>
          <p className="mt-3 text-xs text-slate-600">
            Local storage: <code className="text-slate-400">{ICMS_AUTH_STORAGE_KEY}</code> (session),{' '}
            <code className="text-slate-400">{ICMS_LAST_EMAIL_KEY}</code> (remembered email).
          </p>
        </GlassCard> */}
      </div>
    </PageShell>
  )
}
