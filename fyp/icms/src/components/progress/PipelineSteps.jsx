const STEPS = [
  { key: 'queued', label: 'Queued' },
  { key: 'preprocessing', label: 'Preprocessing' },
  { key: 'eda', label: 'EDA' },
  { key: 'training', label: 'Training' },
  { key: 'evaluation', label: 'Evaluation' },
  { key: 'completed', label: 'Completed' },
]

function normalizeStep(raw) {
  const s = String(raw || '').toLowerCase()
  const found = STEPS.find((x) => x.key === s)
  if (found) return found.key
  if (s.includes('queue')) return 'queued'
  if (s.includes('preprocess')) return 'preprocessing'
  if (s.includes('train')) return 'training'
  if (s.includes('eval')) return 'evaluation'
  if (s.includes('complete') || s === 'done') return 'completed'
  if (s.includes('eda')) return 'eda'
  return 'queued'
}

/**
 * @param {{ currentStep?: string, failed?: boolean }} props
 */
export function PipelineSteps({ currentStep, failed }) {
  const norm = normalizeStep(currentStep)
  let idx = STEPS.findIndex((s) => s.key === norm)
  if (idx < 0) idx = 0

  const finishedOk = norm === 'completed' && !failed

  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2" aria-label="Pipeline progress">
      {STEPS.map((step, i) => {
        const done = finishedOk || i < idx
        const current = !finishedOk && i === idx
        const pending = !finishedOk && i > idx
        const errorHere = Boolean(failed && current)

        let circle =
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold '
        if (errorHere) circle += 'bg-rose-500/20 text-rose-200 ring-2 ring-rose-500/50'
        else if (done) circle += 'bg-emerald-500/20 text-emerald-300'
        else if (current) circle += 'bg-indigo-500/30 text-indigo-100 ring-2 ring-indigo-400/60'
        else circle += 'bg-white/5 text-slate-500'

        const mark = errorHere ? '!' : done ? '✓' : i + 1

        return (
          <li key={step.key} className="flex items-center gap-2 sm:gap-2">
            <span className={circle} aria-current={current || (finishedOk && i === STEPS.length - 1) ? 'step' : undefined}>
              {mark}
            </span>
            <span
              className={`text-sm font-medium ${
                pending ? 'text-slate-500' : errorHere ? 'text-rose-200' : 'text-slate-200'
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="hidden text-slate-600 sm:inline" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
