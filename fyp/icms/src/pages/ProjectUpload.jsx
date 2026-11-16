import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { uploadDataset, startJob, getErrorMessage, fetchDataset } from '../services/api'
import { parseDatasetPreview } from '../utils/parseDatasetFile'
import { PageShell } from '../components/layout/PageShell'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Collapsible } from '../components/ui/Collapsible'
import { FileDropzone } from '../components/upload/FileDropzone'
import { SchemaPreview } from '../components/upload/SchemaPreview'
import { DatasetLibrary } from '../components/upload/DatasetLibrary'

const MISSING = [
  { value: 'drop', label: 'Drop rows' },
  { value: 'mean', label: 'Impute (mean / mode)' },
  { value: 'median', label: 'Median / mode' },
]

const SCALING = [
  { value: 'standard', label: 'StandardScaler' },
  { value: 'minmax', label: 'MinMax' },
  { value: 'none', label: 'None' },
]

const MODELS = [
  { value: 'auto', label: 'Auto (ICMS)' },
  { value: 'fast', label: 'Fast baseline' },
  { value: 'full', label: 'Full sweep' },
]

export default function ProjectUpload() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const projectHint = params.get('project') || ''

  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [preview, setPreview] = useState({ columns: [], sampleRows: [] })
  const [previewError, setPreviewError] = useState('')

  const [existingDatasetId, setExistingDatasetId] = useState(null)
  const [resumeProjectId, setResumeProjectId] = useState(null)
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0)

  const [targetColumn, setTargetColumn] = useState('')
  const [taskType, setTaskType] = useState('classification')
  const [missingStrategy, setMissingStrategy] = useState('mean')
  const [scaling, setScaling] = useState('standard')
  const [modelMode, setModelMode] = useState('auto')
  const [cvFolds, setCvFolds] = useState('5')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const projectFilter = useMemo(() => {
    const n = parseInt(projectHint, 10)
    return Number.isFinite(n) ? n : null
  }, [projectHint])

  useEffect(() => {
    const raw = params.get('dataset')
    if (!raw) {
      setExistingDatasetId(null)
      setResumeProjectId(null)
      return undefined
    }
    const id = parseInt(raw, 10)
    if (!Number.isFinite(id)) return undefined
    let cancelled = false
    ;(async () => {
      try {
        setError('')
        const d = await fetchDataset(id)
        if (cancelled) return
        setExistingDatasetId(d.id)
        setResumeProjectId(d.project_id ?? null)
        const sp = d.schema_preview
        if (sp?.columns?.length) {
          setPreview({
            columns: sp.columns,
            sampleRows: Array.isArray(sp.sample_rows) ? sp.sample_rows : [],
          })
          setTargetColumn(sp.columns[0].name)
        }
        setFile(null)
        setFileError(null)
        setPreviewError('')
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Could not load saved dataset.'))
          setExistingDatasetId(null)
          setResumeProjectId(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params])

  const onSelectFile = useCallback(
    async ({ file: next, error: err }) => {
      setExistingDatasetId(null)
      setResumeProjectId(null)
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          n.delete('dataset')
          return n
        },
        { replace: true },
      )
      setFileError(err)
      setFile(next)
      setPreview({ columns: [], sampleRows: [] })
      setPreviewError('')
      setTargetColumn('')
      if (!next) return
      try {
        const p = await parseDatasetPreview(next)
        setPreview(p)
        if (p.columns[0]) setTargetColumn(p.columns[0].name)
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : 'Could not parse file.')
      }
    },
    [setParams],
  )

  const columnOptions = useMemo(
    () => preview.columns.map((c) => ({ value: c.name, label: `${c.name} (${c.dataType})` })),
    [preview.columns],
  )

  const hasNewFile = Boolean(file) && !fileError && !previewError
  const hasSavedDataset = existingDatasetId != null
  const canSubmit =
    (hasSavedDataset || hasNewFile) &&
    preview.columns.length > 0 &&
    Boolean(targetColumn) &&
    Number(cvFolds) >= 2

  async function onStart(e) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError('')
    try {
      let datasetId = existingDatasetId
      if (datasetId == null) {
        if (!file) throw new Error('Choose a file or pick a saved dataset below.')
        const up = await uploadDataset(file, projectHint ? { project_id: String(projectHint) } : {})
        datasetId = up.dataset_id ?? up.id ?? up.dataset?.id
        if (!datasetId) throw new Error('Upload response missing dataset id.')
        setLibraryRefreshKey((k) => k + 1)
      }

      const options = {
        missing_value_strategy: missingStrategy,
        scaling,
        model_selection: modelMode,
        cv_folds: Number(cvFolds),
      }

      const projectIdNum = projectHint ? parseInt(projectHint, 10) : NaN
      const resumePid = resumeProjectId != null ? Number(resumeProjectId) : NaN
      const effectiveProject = Number.isFinite(projectIdNum)
        ? projectIdNum
        : Number.isFinite(resumePid)
          ? resumePid
          : NaN

      const jobBody = {
        dataset_id: Number(datasetId),
        target_column: targetColumn,
        task_type: taskType,
        options,
      }
      if (Number.isFinite(effectiveProject)) {
        jobBody.project_id = effectiveProject
      }

      const job = await startJob(jobBody)

      const jobId = job.job_id ?? job.id ?? job.job?.id
      if (!jobId) throw new Error('Start job response missing job id.')
      navigate(`/progress/${encodeURIComponent(jobId)}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start analysis.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell maxWidthClass="max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white">New analysis</h1>
          <p className="mt-1 text-sm text-slate-400">Upload tabular data, configure preprocessing, and train models.</p>
        </div>
      </div>

      <form onSubmit={onStart} className="flex flex-col gap-6">
        <GlassCard>
          <h2 className="text-lg font-semibold text-white">Dataset</h2>
          <p className="mt-1 text-sm text-slate-400">CSV or XLSX · validated client-side before upload</p>
          {existingDatasetId != null ? (
            <p className="mt-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100/95">
              Using saved dataset <span className="font-mono">#{existingDatasetId}</span>. Drop a different file above to
              replace it and create a new upload.
            </p>
          ) : null}
          <div className="mt-4">
            <FileDropzone onSelect={onSelectFile} disabled={busy} error={fileError || undefined} />
          </div>
          {previewError ? (
            <p className="mt-2 text-sm text-rose-400" role="alert">
              {previewError}
            </p>
          ) : null}
          {preview.columns.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-200">Schema preview</h3>
              <div className="mt-2">
                <SchemaPreview columns={preview.columns} sampleRows={preview.sampleRows} />
              </div>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-white">Task configuration</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              id="target"
              label="Target column"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              options={columnOptions.length ? columnOptions : [{ value: '', label: '—' }]}
            />
            <Select
              id="task"
              label="Task type"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              options={[
                { value: 'classification', label: 'Classification' },
                { value: 'regression', label: 'Regression' },
              ]}
            />
          </div>
        </GlassCard>

        <Collapsible title="Advanced options" defaultOpen={false}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="missing"
              label="Missing value strategy"
              value={missingStrategy}
              onChange={(e) => setMissingStrategy(e.target.value)}
              options={MISSING}
            />
            <Select
              id="scaling"
              label="Scaling"
              value={scaling}
              onChange={(e) => setScaling(e.target.value)}
              options={SCALING}
            />
            <Select
              id="models"
              label="Model selection"
              value={modelMode}
              onChange={(e) => setModelMode(e.target.value)}
              options={MODELS}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cv" className="text-sm font-medium text-slate-300">
                Cross-validation folds
              </label>
              <input
                id="cv"
                name="cv"
                type="number"
                min={2}
                max={20}
                value={cvFolds}
                onChange={(e) => setCvFolds(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100"
              />
            </div>
          </div>
        </Collapsible>

        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!canSubmit || busy}>
            {busy ? 'Starting…' : 'Start analysis'}
          </Button>
          <Button to="/" variant="ghost">
            Cancel
          </Button>
        </div>
      </form>

      <div className="mt-10">
        <DatasetLibrary
          projectId={projectFilter}
          selectedDatasetId={existingDatasetId}
          refreshKey={libraryRefreshKey}
          onContinue={(datasetId, dsProjectId) => {
            const qs = new URLSearchParams()
            qs.set('dataset', String(datasetId))
            if (projectHint) qs.set('project', projectHint)
            else if (dsProjectId != null) qs.set('project', String(dsProjectId))
            navigate(`/upload?${qs.toString()}`)
          }}
          onDatasetDeleted={(deletedId) => {
            if (existingDatasetId !== deletedId) return
            setExistingDatasetId(null)
            setResumeProjectId(null)
            setParams((p) => {
              const n = new URLSearchParams(p)
              n.delete('dataset')
              return n
            }, { replace: true })
            setFile(null)
            setPreview({ columns: [], sampleRows: [] })
            setTargetColumn('')
          }}
        />
      </div>
    </PageShell>
  )
}
