import { useMemo } from 'react'
import { ErrorBoundary } from '../ErrorBoundary'
import { PlotFigure } from './PlotFigure'

const darkLayout = {
  autosize: true,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(15, 23, 42, 0.5)',
  font: { color: '#e2e8f0', family: 'DM Sans, sans-serif', size: 11 },
  margin: { t: 36, r: 12, b: 40, l: 48 },
  showlegend: false,
  xaxis: { gridcolor: 'rgba(148,163,184,0.15)', zerolinecolor: 'rgba(148,163,184,0.3)' },
  yaxis: { gridcolor: 'rgba(148,163,184,0.15)', zerolinecolor: 'rgba(148,163,184,0.3)' },
}

const HIST_MAX_POINTS = 25_000
const BOX_MAX_POINTS = 15_000

/** Coerce to finite numbers; optionally cap length for Plotly performance */
function toNumericSeries(raw, maxLen) {
  if (!Array.isArray(raw)) return []
  let out = raw
    .filter((v) => v != null && v !== '')
    .map(Number)
    .filter((v) => Number.isFinite(v))
  if (maxLen != null && out.length > maxLen) {
    const step = Math.ceil(out.length / maxLen)
    out = out.filter((_, i) => i % step === 0)
  }
  return out
}

/** Ensure heatmap z is a rectangular matrix of finite numbers (Plotly / JSON safe). */
function sanitizeHeatmapZ(z) {
  if (!Array.isArray(z) || z.length === 0) return null
  const cleaned = z.map((row) => {
    if (!Array.isArray(row)) return null
    return row.map((v) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    })
  })
  const w = cleaned[0]?.length ?? 0
  if (!w || cleaned.some((r) => !r || r.length !== w)) return null
  return cleaned
}

/**
 * @param {{ eda?: Record<string, unknown> }} props
 */
export function EDASection({ eda }) {
  const charts = useMemo(() => {
    if (!eda || typeof eda !== 'object') return null

    const histograms = /** @type {any[]} */ (eda.histograms || eda.histogram || [])
    const boxplots = /** @type {any[]} */ (eda.boxplots || eda.boxplot || [])
    const correlation = eda.correlation || eda.corr
    const missing = /** @type {any[]} */ (eda.missing_values || eda.missing || [])

    return { histograms, boxplots, correlation, missing }
  }, [eda])

  if (!charts) {
    return (
      <GlassPlaceholder
        title="Exploratory data analysis"
        subtitle="EDA charts will appear when the API returns `eda` on /results/:id."
      />
    )
  }

  const { histograms, boxplots, correlation, missing } = charts

  const rawHeatmapZ =
    correlation && Array.isArray(correlation.z)
      ? correlation.z
      : correlation?.data?.[0]?.z && Array.isArray(correlation.data[0].z)
        ? correlation.data[0].z
        : null

  const heatmapZ = sanitizeHeatmapZ(rawHeatmapZ)

  const heatmapLabels = correlation?.labels || correlation?.columns
  // Backend sends z:[[1.0]] when fewer than 2 numeric columns — Plotly heatmap crashes if we render that.
  const heatmapOk =
    heatmapZ != null &&
    heatmapZ.length >= 2 &&
    Array.isArray(heatmapLabels) &&
    heatmapLabels.length >= 2 &&
    heatmapLabels.length === heatmapZ.length

  const hasAny =
    (histograms?.length ?? 0) > 0 ||
    (boxplots?.length ?? 0) > 0 ||
    heatmapOk ||
    (missing?.length ?? 0) > 0

  if (!hasAny) {
    return <GlassPlaceholder title="EDA" subtitle="No EDA payload returned yet." />
  }

  return (
    <section aria-labelledby="eda-heading" className="flex flex-col gap-6">
      <div>
        <h2 id="eda-heading" className="text-lg font-semibold text-white">
          Exploratory data analysis
        </h2>
        <p className="mt-1 text-sm text-slate-400">Histograms, box plots, correlation, and missingness (Plotly).</p>
      </div>

      {histograms?.length ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {histograms.flatMap((h, i) => {
            const raw = h.x || h.values || []
            const x = toNumericSeries(raw, HIST_MAX_POINTS)
            const title = h.title || h.name || `Feature ${i + 1}`
            if (x.length === 0) return []
            return [
              <div
                key={`hist-${title}-${i}`}
                className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-2"
              >
                <ErrorBoundary title="Chart error">
                  <PlotFigure
                    fallbackHeight={280}
                    data={[
                      {
                        type: 'histogram',
                        x,
                        nbinsx: Math.min(80, Math.max(10, Math.round(Math.sqrt(Math.max(x.length, 1))))),
                        marker: { color: 'rgba(129, 140, 248, 0.75)' },
                      },
                    ]}
                    layout={{
                      ...darkLayout,
                      title: { text: String(title), font: { size: 13, color: '#f8fafc' } },
                      height: 280,
                    }}
                    config={{ displayModeBar: false, responsive: true }}
                    style={{ width: '100%', height: '280px' }}
                    useResizeHandler
                  />
                </ErrorBoundary>
              </div>,
            ]
          })}
        </div>
      ) : null}

      {boxplots?.length ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {boxplots.flatMap((b, i) => {
            const raw = b.y || b.values || []
            const y = toNumericSeries(raw, BOX_MAX_POINTS)
            const title = b.title || b.name || `Box ${i + 1}`
            if (y.length === 0) return []
            return [
              <div
                key={`box-${title}-${i}`}
                className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-2"
              >
                <ErrorBoundary title="Chart error">
                  <PlotFigure
                    fallbackHeight={280}
                    data={[{ type: 'box', y, name: String(b.group || 'y'), marker: { color: '#a5b4fc' } }]}
                    layout={{
                      ...darkLayout,
                      title: { text: String(title), font: { size: 13, color: '#f8fafc' } },
                      height: 280,
                    }}
                    config={{ displayModeBar: false, responsive: true }}
                    style={{ width: '100%', height: '280px' }}
                    useResizeHandler
                  />
                </ErrorBoundary>
              </div>,
            ]
          })}
        </div>
      ) : null}

      {heatmapOk ? (
        <div className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-2">
          <ErrorBoundary title="Correlation chart error">
            <PlotFigure
              fallbackHeight={360}
              data={[
                {
                  type: 'heatmap',
                  z: heatmapZ,
                  x: heatmapLabels.map(String),
                  y: (correlation.rows || heatmapLabels).map(String),
                  colorscale: 'Viridis',
                },
              ]}
              layout={{
                ...darkLayout,
                title: { text: 'Correlation heatmap', font: { size: 14, color: '#f8fafc' } },
                height: 360,
              }}
              config={{ displayModeBar: true, responsive: true }}
              style={{ width: '100%', height: '360px' }}
              useResizeHandler
            />
          </ErrorBoundary>
        </div>
      ) : null}

      {missing?.length ? (
        <div className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-2">
          <ErrorBoundary title="Missing-values chart error">
            <PlotFigure
              fallbackHeight={320}
              data={[
                {
                  type: 'bar',
                  x: missing.map((m) => String(m.column ?? m.name ?? '')),
                  y: missing.map((m) => {
                    const pct = m.pct ?? m.percent
                    if (pct != null && Number.isFinite(Number(pct))) return Number(pct)
                    const c = Number(m.count)
                    return Number.isFinite(c) ? c : 0
                  }),
                  marker: { color: 'rgba(248, 113, 113, 0.85)' },
                },
              ]}
              layout={{
                ...darkLayout,
                title: { text: 'Missing values', font: { size: 14, color: '#f8fafc' } },
                height: 320,
                yaxis: {
                  ...darkLayout.yaxis,
                  title: {
                    text: missing.some((m) => m.pct != null || m.percent != null) ? '% missing' : 'Count',
                  },
                },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%', height: '320px' }}
              useResizeHandler
            />
          </ErrorBoundary>
        </div>
      ) : null}
    </section>
  )
}

function GlassPlaceholder({ title, subtitle }) {
  return (
    <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </section>
  )
}
