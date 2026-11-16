import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { PipelineSteps } from '../components/progress/PipelineSteps'
import { LogViewer } from '../components/progress/LogViewer'
import { Spinner, ProgressBar } from '../components/ui/LoadingIndicators'
import { useJobPolling } from '../hooks/useJobPolling'

function pickStep(status) {
  return (
    status?.step ??
    status?.current_step ??
    status?.phase ??
    status?.pipeline_step ??
    'queued'
  )
}

function pickLogs(status) {
  const logs = status?.logs ?? status?.log_lines ?? status?.messages
  if (Array.isArray(logs)) return logs.map(String)
  if (typeof logs === 'string') return logs.split('\n').filter(Boolean)
  return []
}

function pickProgress(status) {
  const p = status?.progress ?? status?.percent
  if (typeof p === 'number') return Math.min(100, Math.max(0, p))
  return null
}

function isFailed(status) {
  const s = String(status?.status ?? status?.state ?? '').toLowerCase()
  return s === 'failed' || s === 'error' || Boolean(status?.error)
}

function isComplete(status) {
  const s = String(status?.status ?? status?.state ?? '').toLowerCase()
  const step = String(pickStep(status)).toLowerCase()
  return s === 'completed' || step === 'completed' || status?.completed === true
}

function ProgressContent({ jobId }) {
  const { status, loading, error } = useJobPolling(jobId || null)

  const step = pickStep(status)
  const logs = useMemo(() => pickLogs(status), [status])
  const pct = pickProgress(status)
  const failed = isFailed(status)
  const complete = isComplete(status)

  return (
    <PageShell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white">Pipeline</h1>
          <p className="mt-1 font-mono text-xs text-slate-500">Job · {jobId}</p>
        </div>
        {complete ? <Button to={`/results/${encodeURIComponent(jobId)}`}>View results</Button> : null}
      </div>

      <div className="flex flex-col gap-6">
        <GlassCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Status</h2>
              <p className="mt-1 text-sm text-slate-400">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="xs" />
                    Connecting…
                  </span>
                ) : (
                  String(status?.status ?? status?.state ?? '—')
                )}
              </p>
            </div>
            {pct != null ? (
              <div className="w-full max-w-xs">
                <ProgressBar value={pct} max={100} showLabel={true} />
              </div>
            ) : null}
          </div>
          <div className="mt-6">
            <PipelineSteps currentStep={step} failed={failed} />
          </div>
        </GlassCard>

        {failed ? (
          <GlassCard className="border-rose-500/30">
            <h2 className="text-lg font-semibold text-rose-200">Job failed</h2>
            <p className="mt-2 text-sm text-rose-100/90">{String(status?.error ?? status?.message ?? 'Unknown error')}</p>
          </GlassCard>
        ) : null}

        {error ? (
          <GlassCard>
            <p className="text-rose-400" role="alert">
              {error}
            </p>
            <p className="mt-2 text-sm text-slate-500">Polling GET /jobs/status/{jobId}</p>
          </GlassCard>
        ) : null}

        <GlassCard>
          <h2 className="text-lg font-semibold text-white">Live logs</h2>
          <p className="mt-1 text-sm text-slate-400">Streamed via polling · adapts to `logs` array or string</p>
          <div className="mt-4">
            <LogViewer lines={logs} />
          </div>
        </GlassCard>
      </div>
    </PageShell>
  )
}

export default function Progress() {
  const { jobId } = useParams()
  return <ProgressContent key={jobId} jobId={jobId} />
}
