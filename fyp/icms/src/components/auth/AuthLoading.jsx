/**
 * Shown while persisted auth is rehydrating from storage (avoids redirect flash).
 */
export function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0a0b12] px-4 text-slate-400">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400"
        aria-hidden
      />
      <p className="text-sm">Restoring session…</p>
    </div>
  )
}
