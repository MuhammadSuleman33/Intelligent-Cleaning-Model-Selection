import { useCallback, useEffect, useState } from 'react'
import { deleteDataset, fetchDatasets, getErrorMessage } from '../../services/api'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function statusLabel(row) {
  if (!row.latest_job_id) return 'Not run yet'
  const s = row.latest_job_status || '—'
  if (s === 'completed') return 'Completed'
  if (s === 'failed') return 'Failed'
  if (s === 'running') return 'Running'
  if (s === 'queued') return 'Queued'
  return s
}

/**
 * Saved datasets (upload succeeded). Continue analysis or delete (DB + files + linked jobs).
 *
 * @param {{
 *   projectId?: number | null
 *   selectedDatasetId?: number | null
 *   onContinue: (datasetId: number, projectId: number | null) => void
 *   refreshKey?: number
 * }} props
 */
export function DatasetLibrary({ projectId = null, selectedDatasetId = null, onContinue, refreshKey = 0, onDatasetDeleted, }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await fetchDatasets(projectId ?? undefined)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(getErrorMessage(e, 'Could not load datasets.'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  async function onDelete(row) {
    const ok = window.confirm(
      `Delete dataset "${row.original_filename}"?\n\nThis removes the file, all jobs tied to it, and their artifacts from the database and storage. This cannot be undone.`,
    )
    if (!ok) return
    setDeletingId(row.id)
    setError('')
    try {
      await deleteDataset(row.id)
      onDatasetDeleted?.(row.id)
      await load()
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete dataset.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <GlassCard>
      <h2 className="text-lg font-semibold text-white">Your datasets</h2>
      <p className="mt-1 text-sm text-slate-400">
        After an upload succeeds, the dataset stays here until you delete it. If starting a job failed, use{' '}
        <strong className="text-slate-300">Continue</strong> to try again without re-uploading.
      </p>

      {error ? (
        <p className="mt-3 text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No saved datasets yet. Upload a file above to create one.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 font-semibold">File</th>
                <th className="px-3 py-2 font-semibold">Rows</th>
                <th className="px-3 py-2 font-semibold">Uploaded</th>
                <th className="px-3 py-2 font-semibold">Latest job</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const active = selectedDatasetId != null && Number(selectedDatasetId) === Number(row.id)
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-white/5 last:border-0 ${active ? 'bg-indigo-500/10' : ''}`}
                  >
                    <td className="max-w-[200px] truncate px-3 py-2 text-slate-200" title={row.original_filename}>
                      {row.original_filename}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">{row.row_count ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">{formatWhen(row.created_at)}</td>
                    <td className="px-3 py-2 text-slate-300">
                      <span className="text-slate-400">{statusLabel(row)}</span>
                      {row.latest_job_id ? (
                        <span className="mt-0.5 block font-mono text-[10px] text-slate-500">{row.latest_job_id}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 !text-xs"
                        disabled={deletingId != null}
                        onClick={() => onContinue(row.id, row.project_id ?? null)}
                      >
                        Continue
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-2 !py-1 !text-xs text-rose-300 hover:text-rose-200"
                        disabled={deletingId != null}
                        onClick={() => onDelete(row)}
                      >
                        {deletingId === row.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}
