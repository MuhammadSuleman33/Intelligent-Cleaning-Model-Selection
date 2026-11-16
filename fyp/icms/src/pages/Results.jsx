import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchResults, getErrorMessage } from '../services/api'
import { PageShell } from '../components/layout/PageShell'
import { EDASection } from '../components/results/EDASection'
import { ModelLeaderboard } from '../components/results/ModelLeaderboard'
import { ModelDetailModal } from '../components/results/ModelDetailModal'
import { RecommendationPanel } from '../components/results/RecommendationPanel'
import { DownloadsBar } from '../components/results/DownloadsBar'
import { ErrorBoundary } from '../components/ErrorBoundary'

export default function Results() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)

  const refreshResults = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetchResults(id)
      setData(res)
    } catch {
      /* keep existing payload; download already succeeded */
    }
  }, [id])

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetchResults(id)
        if (cancelled) return
        setData(res)
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, 'Could not load results.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const taskType = useMemo(() => {
    const t = data?.task_type ?? data?.taskType ?? 'classification'
    return t === 'regression' ? 'regression' : 'classification'
  }, [data])

  const leaderboardRows = useMemo(() => {
    const rows = data?.leaderboard ?? data?.models ?? data?.model_leaderboard
    return Array.isArray(rows) ? rows : []
  }, [data])

  const recommendation = useMemo(() => {
    return data?.recommendation ?? data?.best ?? null
  }, [data])

  const downloads = useMemo(() => {
    return data?.downloads ?? data?.artifacts ?? {}
  }, [data])

  const detailModel = useMemo(() => {
    if (!selected) return null
    const key = selected.model ?? selected.name
    const byName = data?.model_details?.[key] ?? data?.details?.[key]
    return { ...selected, ...(byName && typeof byName === 'object' ? byName : {}) }
  }, [selected, data])

  const glassPanel =
    'rounded-[1.75rem] border border-white/15 bg-gradient-to-br from-white/[0.12] via-white/[0.05] to-slate-950/50 p-6 shadow-[0_32px_196px_-8px_rgba(0,0,0,0.72),0_16px_48px_-4px_rgba(0,0,0,0.55),0_4px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.2)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/10 sm:p-8 md:p-10'

  return (
    <PageShell maxWidthClass="max-w-6xl">
      <div className={glassPanel}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className="text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-white">Results</h1>
            <p className="mt-1 font-mono text-xs text-slate-400/90">Run · {id}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center shadow-[0_20px_56px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
            <p className="text-slate-300">Loading results…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.08] px-6 py-8 shadow-[0_20px_56px_rgba(0,0,0,0.4),0_0_40px_-8px_rgba(244,63,94,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
            <p className="text-rose-200" role="alert">
              {error}
            </p>
            <p className="mt-2 text-sm text-slate-400">GET /results/{id}</p>
          </div>
        ) : (
          <ErrorBoundary title="Could not render results">
            <div className="flex flex-col gap-10">
              <RecommendationPanel recommendation={recommendation} />

              <EDASection eda={data?.eda} />

              <ModelLeaderboard
                rows={leaderboardRows}
                taskType={taskType}
                onSelect={(row) => {
                  setSelected(row)
                  setOpen(true)
                }}
              />

              <DownloadsBar downloads={downloads} onAfterDownload={refreshResults} />
            </div>
          </ErrorBoundary>
        )}
      </div>

      <ModelDetailModal
        open={open}
        onClose={() => setOpen(false)}
        model={detailModel}
        taskType={taskType}
      />
    </PageShell>
  )
}
