import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { deleteProject, fetchProject, getErrorMessage } from '../services/api'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'

export default function ProjectDetail() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const location = useLocation()
  const [fallback] = useState(() => location.state?.project ?? null)

  const [remote, setRemote] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!projectId) return undefined
    let cancelled = false
    ;(async () => {
      try {
        setError('')
        setLoading(true)
        const data = await fetchProject(projectId)
        if (cancelled) return
        setRemote(data?.project ?? data)
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e, 'Could not load project.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const project = remote ?? fallback
  const id = String(project?.id ?? project?.project_id ?? projectId ?? '')
  const name = String(project?.name ?? project?.title ?? 'Project')
  const description = project?.description ?? project?.summary ?? ''
  const lastStatus = project?.last_run_status ?? project?.status ?? fallback?.last_run_status ?? '—'
  const lastJobId = project?.last_job_id ?? project?.job_id ?? project?.latest_job_id
  const created = project?.created_at ?? project?.created ?? ''
  const showSkeleton = loading && !project

  async function handleDeleteProject() {
    if (
      !window.confirm(
        `Delete project "${name}"?\n\nAll jobs for this project will be removed and their artifacts deleted. Datasets remain in your library without this project link.`,
      )
    ) {
      return
    }
    setDeleting(true)
    setError('')
    try {
      await deleteProject(id)
      navigate('/', { replace: true })
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete project.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <PageShell maxWidthClass="max-w-4xl">
      <div className="mb-6">
        <Link
          to="/"
          className="text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          ← All projects
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">{name}</h1>
        <p className="mt-1 font-mono text-xs text-slate-500">ID · {id}</p>
      </div>

      {error && !project ? (
        <GlassCard className="mb-6 border-rose-500/20">
          <p className="text-rose-400" role="alert">
            {error}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            No cached project data. Ensure <code className="text-slate-500">GET /projects/:id</code> exists or open this
            page from the project list.
          </p>
        </GlassCard>
      ) : null}

      {error && project ? (
        <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          API detail incomplete: {error}. Showing list snapshot or partial data.
        </p>
      ) : null}

      {showSkeleton ? (
        <GlassCard>
          <p className="text-slate-400">Loading project…</p>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-6">
          <GlassCard>
            <h2 className="text-lg font-semibold text-white">Overview</h2>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{String(description)}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No description from API.</p>
            )}
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Last run status</dt>
                <dd className="font-medium text-slate-200">{String(lastStatus)}</dd>
              </div>
              {created ? (
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="font-medium text-slate-200">{String(created)}</dd>
                </div>
              ) : null}
              {lastJobId ? (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Latest job</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    <Button to={`/progress/${encodeURIComponent(String(lastJobId))}`} variant="ghost" className="!text-xs">
                      Open pipeline
                    </Button>
                    <Button to={`/results/${encodeURIComponent(String(lastJobId))}`} variant="ghost" className="!text-xs">
                      Open results
                    </Button>
                  </dd>
                </div>
              ) : null}
            </dl>
          </GlassCard>

          <GlassCard>
            <h2 className="text-lg font-semibold text-white">Actions</h2>
            <p className="mt-1 text-sm text-slate-400">Upload a dataset and configure cleaning &amp; model selection.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button to={`/upload?project=${encodeURIComponent(id)}`}>Start new analysis</Button>
              <Button to="/activity" variant="ghost">
                View activity
              </Button>
              <Button type="button" variant="danger" disabled={deleting} onClick={() => handleDeleteProject()}>
                {deleting ? 'Deleting…' : 'Delete project'}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </PageShell>
  )
}
