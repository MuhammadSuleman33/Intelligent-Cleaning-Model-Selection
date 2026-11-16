import { memo } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../ui/GlassCard'

const statusStyles = {
  completed: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  running: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
}

function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase()
  if (s.includes('run') || s === 'running' || s === 'pending' || s === 'queued') return 'running'
  if (s.includes('fail') || s === 'error') return 'failed'
  return 'completed'
}

/**
 * @param {{
 *   id: string
 *   name: string
 *   last_run_status?: string
 *   onDelete?: (id: string) => void | Promise<void>
 *   deleting?: boolean
 * }} props
 */
const ProjectCard = memo(function ProjectCard({ id, name, last_run_status, onDelete, deleting = false }) {
  const key = normalizeStatus(last_run_status)
  const label =
    key === 'running'
      ? 'Running'
      : key === 'failed'
        ? 'Failed'
        : 'Completed'

  return (
    <GlassCard className="flex flex-col gap-4 transition hover:border-indigo-500/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <p className="mt-1 text-xs text-slate-500">Project ID · {id}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[key]}`}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/projects/${encodeURIComponent(id)}`}
          state={{ project: { id, name, last_run_status } }}
          className="text-sm font-medium text-white underline-offset-4 hover:text-indigo-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          View details
        </Link>
        <Link
          to={`/upload?project=${encodeURIComponent(id)}`}
          className="text-sm font-medium text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          New dataset run
        </Link>
        {onDelete ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(id)}
            className="text-sm font-medium text-rose-300 underline-offset-4 hover:text-rose-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        ) : null}
      </div>
    </GlassCard>
  )
})

export { ProjectCard }
