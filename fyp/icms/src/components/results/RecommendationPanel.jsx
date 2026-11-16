import { GlassCard } from '../ui/GlassCard'

/**
 * @param {{ recommendation?: Record<string, unknown> | null }} props
 */
export function RecommendationPanel({ recommendation }) {
  const name = recommendation?.best_model ?? recommendation?.model ?? recommendation?.name
  const reason = recommendation?.reason ?? recommendation?.explanation ?? recommendation?.why

  if (!name && !reason) {
    return (
      <GlassCard>
        <h3 className="text-base font-semibold text-white">Recommendation</h3>
        <p className="mt-2 text-sm text-slate-400">No recommendation object returned. Expect `best_model` and `reason`.</p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="border-indigo-500/25 bg-indigo-500/[0.07]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300/90">Recommended model</p>
          <h3 className="mt-1 text-xl font-bold text-white">{String(name)}</h3>
        </div>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/40">
          ICMS pick
        </span>
      </div>
      {reason ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{String(reason)}</p>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Add a `reason` field for an automatic narrative.</p>
      )}
    </GlassCard>
  )
}
