import { useEffect, useState } from 'react'

/**
 * Vite + CJS `react-plotly.js` often exposes the component as `default.default`, not `default`.
 * `mod.default` alone can be a namespace object — React then throws "Element type is invalid ... got: object".
 */
function resolvePlotlyReactComponent(mod) {
  if (!mod || typeof mod !== 'object') return null
  const a = mod.default
  if (typeof a === 'function') return a
  if (a && typeof a === 'object' && typeof a.default === 'function') return a.default
  return null
}

/**
 * Load react-plotly.js only on the client after mount (avoids SSR / strict double-mount issues).
 */
export function PlotFigure({ fallbackHeight = 280, ...plotProps }) {
  const [Plot, setPlot] = useState(null)

  useEffect(() => {
    let active = true
    import('react-plotly.js')
      .then((mod) => {
        if (!active) return
        const C = resolvePlotlyReactComponent(mod)
        // Must use functional updater: bare setPlot(C) would treat a function component as an updater.
        setPlot(() => C)
      })
      .catch(() => {
        if (active) setPlot(() => null)
      })
    return () => {
      active = false
    }
  }, [])

  if (!Plot) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-white/5 text-sm text-slate-500"
        style={{ minHeight: fallbackHeight }}
      >
        Loading chart…
      </div>
    )
  }

  return <Plot {...plotProps} />
}
