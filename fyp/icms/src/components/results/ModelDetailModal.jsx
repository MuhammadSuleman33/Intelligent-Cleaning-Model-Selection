import { useEffect, useRef } from 'react'
import { ErrorBoundary } from '../ErrorBoundary'
import { PlotFigure } from './PlotFigure'
import { Button } from '../ui/Button'

const darkLayout = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
  font: { color: '#e2e8f0', family: 'DM Sans, sans-serif', size: 11 },
  margin: { t: 28, r: 12, b: 40, l: 48 },
  xaxis: { gridcolor: 'rgba(148,163,184,0.15)' },
  yaxis: { gridcolor: 'rgba(148,163,184,0.15)' },
}

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   model: Record<string, unknown> | null
 *   taskType: 'classification' | 'regression'
 * }} props
 */
export function ModelDetailModal({ open, onClose, model, taskType }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const t = window.setTimeout(() => panelRef.current?.focus(), 10)
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !model) return null

  const name = String(model.model ?? model.name ?? 'Model')
  const metrics = /** @type {Record<string, unknown>} */ (model.metrics || model)
  const cm = model.confusion_matrix || model.confusionMatrix
  const residual = model.residual_plot || model.residual
  const shap = model.shap || model.feature_importance

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-detail-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="model-detail-title" className="text-xl font-semibold text-white">
              {name}
            </h2>
            <p className="mt-1 text-sm text-slate-400">Metrics, diagnostics, and explainability</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} className="!px-3 !py-1.5">
            Close
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Object.entries(metrics)
            .filter(([k]) => typeof metrics[k] === 'number' || typeof metrics[k] === 'string')
            .slice(0, 8)
            .map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">{k}</p>
                <p className="text-sm font-semibold text-slate-100">{String(v)}</p>
              </div>
            ))}
        </div>

        {taskType === 'classification' && cm?.z ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-2">
            <ErrorBoundary title="Confusion matrix chart error">
              <PlotFigure
                fallbackHeight={340}
                data={[
                  {
                    type: 'heatmap',
                    z: cm.z,
                    x: cm.labels || cm.x,
                    y: cm.labels || cm.y,
                    colorscale: 'Blues',
                  },
                ]}
                layout={{
                  ...darkLayout,
                  title: { text: 'Confusion matrix', font: { size: 14, color: '#f8fafc' } },
                  height: 340,
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%', height: '340px' }}
                useResizeHandler
              />
            </ErrorBoundary>
          </div>
        ) : null}

        {taskType === 'regression' && residual?.y_true && residual?.y_pred ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-2">
            <ErrorBoundary title="Residual plot error">
            <PlotFigure
              fallbackHeight={340}
              data={[
                {
                  type: 'scatter',
                  x: residual.y_true,
                  y: residual.y_pred,
                  mode: 'markers',
                  marker: { color: '#a5b4fc', size: 6, opacity: 0.75 },
                  name: 'pred vs true',
                },
                {
                  type: 'scatter',
                  x: residual.line_x || residual.y_true,
                  y: residual.line_y || residual.y_true,
                  mode: 'lines',
                  line: { color: '#f472b6', width: 2 },
                  name: 'ideal',
                },
              ]}
              layout={{
                ...darkLayout,
                title: { text: 'Residual / prediction plot', font: { size: 14, color: '#f8fafc' } },
                height: 340,
                showlegend: true,
                legend: { font: { color: '#e2e8f0' } },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '340px' }}
              useResizeHandler
            />
            </ErrorBoundary>
          </div>
        ) : null}

        {shap?.features && shap?.values ? (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-2">
            <ErrorBoundary title="SHAP chart error">
            <PlotFigure
              fallbackHeight={Math.min(420, 40 + (shap.features?.length || 8) * 28)}
              data={[
                {
                  type: 'bar',
                  x: shap.values,
                  y: shap.features,
                  orientation: 'h',
                  marker: { color: 'rgba(52, 211, 153, 0.85)' },
                },
              ]}
              layout={{
                ...darkLayout,
                title: { text: 'Feature importance (SHAP)', font: { size: 14, color: '#f8fafc' } },
                height: Math.min(420, 40 + (shap.features?.length || 8) * 28),
                margin: { ...darkLayout.margin, l: 120 },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: Math.min(420, 40 + (shap.features?.length || 8) * 28) }}
              useResizeHandler
            />
            </ErrorBoundary>
          </div>
        ) : null}

        {!cm?.z && !(residual?.y_true && residual?.y_pred) && !shap?.features ? (
          <p className="mt-6 text-sm text-slate-500">
            Provide `confusion_matrix`, `residual_plot`, or `shap` / `feature_importance` in the results payload for
            visuals.
          </p>
        ) : null}
      </div>
    </div>
  )
}
