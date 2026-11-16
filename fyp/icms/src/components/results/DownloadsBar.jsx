import { useState } from 'react'
import { Button } from '../ui/Button'
import { downloadArtifactByUrl, getErrorMessage } from '../../services/api'

const DEFAULTS = [
  { key: 'bundle', label: 'Download all artifacts', filename: 'job_bundle.zip' },
]

/**
 * @param {{
 *   downloads?: Record<string, string | null | undefined>
 *   onAfterDownload?: () => void | Promise<void>
 * }} props
 */
export function DownloadsBar({ downloads, onAfterDownload }) {
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState('')

  async function handleDownload(d) {
    const url = downloads?.[d.key]
    if (!url) return
    setError('')
    setBusyKey(d.key)
    try {
      await downloadArtifactByUrl(url, d.filename)
      if (onAfterDownload) await onAfterDownload()
    } catch (e) {
      setError(getErrorMessage(e, 'Download failed. Are you signed in?'))
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section aria-labelledby="dl-heading" className="flex flex-col gap-3">
      <h2 id="dl-heading" className="text-lg font-semibold text-white">
        Downloads
      </h2>
      <div className="flex flex-wrap gap-2">
        {DEFAULTS.map((d) => {
          const url = downloads?.[d.key]
          const disabled = !url || busyKey === d.key
          return (
            <Button
              key={d.key}
              variant="ghost"
              className="!text-xs"
              disabled={disabled}
              onClick={() => handleDownload(d)}
            >
              {busyKey === d.key ? 'Downloading…' : d.label}
              {!url ? ' (n/a)' : ''}
            </Button>
          )
        })}
      </div>
      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-slate-500">
        Files are fetched with your session token (same as the API). PDF report appears when the backend provides{' '}
        <code className="text-slate-400">pdf_report</code> in results.
      </p>
    </section>
  )
}
