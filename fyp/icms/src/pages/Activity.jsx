import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteJob, fetchRecentJobs, getErrorMessage } from '../services/api'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  return data?.jobs ?? data?.items ?? data?.runs ?? []
}

export default function Activity() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const pageVisibleRef = useRef(true)
  const refreshTimeoutRef = useRef(null)

  const fetchJobs = async () => {
    try {
      setError('')
      const data = await fetchRecentJobs()
      setRows(normalizeRows(data))
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load jobs.'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!cancelled) {
        await fetchJobs()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Listen for page visibility changes to refresh when user returns to this tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      pageVisibleRef.current = !document.hidden
      if (pageVisibleRef.current) {
        // User switched back to this tab - refresh jobs
        fetchJobs()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Periodic refresh every 10 seconds to catch updates (including deleted projects)
  useEffect(() => {
    const interval = setInterval(() => {
      if (pageVisibleRef.current && !loading) {
        fetchJobs()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [loading])

  // Listen for storage changes (deletion events from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'project_deleted' || e.key === 'job_deleted') {
        // Refresh jobs when deletion is detected from another tab
        fetchJobs()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  async function handleDeleteJob(jobId) {
    if (
      !window.confirm(
        `Delete job ${jobId}?\n\nThis removes the job record, results, and artifact files. The original dataset upload is not deleted (remove it from Upload → Your datasets if needed).`,
      )
    ) {
      return
    }
    setDeletingId(jobId)
    setError('')
    try {
      await deleteJob(jobId)
      setRows((prev) => prev.filter((row) => String(row.id ?? row.job_id ?? row.uuid ?? '') !== jobId))
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete job.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageShell maxWidthClass="max-w-5xl">
      <h1 className="mb-2 text-3xl font-bold text-white">Activity</h1>
      <p className="mb-8 text-sm text-slate-400">
        Recent jobs from <code className="text-slate-500">GET /jobs</code>.
      </p>

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90" role="alert">
          {error}
        </p>
      ) : null}

      {!error && !loading && rows.length === 0 ? (
        <p className="mb-4 text-sm text-slate-500">No jobs yet. Start an analysis from Upload or a project page.</p>
      ) : null}

      {loading ? (
        <GlassCard>
          <p className="text-slate-400">Loading activity…</p>
        </GlassCard>
      ) : (
        <GlassCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Job</th>
                  <th className="px-4 py-3 font-semibold">Project</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Step</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const id = String(row.id ?? row.job_id ?? row.uuid ?? `row-${i}`)
                  const project = String(row.project ?? row.project_name ?? row.name ?? '—')
                  const status = String(row.status ?? row.state ?? '—')
                  const step = String(row.step ?? row.current_step ?? '—')
                  return (
                    <tr key={id} className="border-b border-white/5 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{id}</td>
                      <td className="px-4 py-3 text-slate-200">{project}</td>
                      <td className="px-4 py-3 text-slate-300">{status}</td>
                      <td className="px-4 py-3 text-slate-400">{step}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/progress/${encodeURIComponent(id)}`}
                          className="mr-3 text-indigo-300 hover:text-indigo-200 hover:underline"
                        >
                          Progress
                        </Link>
                        <Link
                          to={`/results/${encodeURIComponent(id)}`}
                          className="mr-3 text-indigo-300 hover:text-indigo-200 hover:underline"
                        >
                          Results
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId != null}
                          onClick={() => handleDeleteJob(id)}
                          className="text-rose-300 hover:text-rose-200 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </PageShell>
  )
}
