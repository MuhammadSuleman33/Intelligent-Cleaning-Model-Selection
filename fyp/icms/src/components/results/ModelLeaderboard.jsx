import { useMemo, useState } from 'react'

/**
 * @param {{
 *   rows: Record<string, unknown>[]
 *   taskType: 'classification' | 'regression'
 *   onSelect: (row: Record<string, unknown>) => void
 * }} props
 */
export function ModelLeaderboard({ rows, taskType, onSelect }) {
  const [sortKey, setSortKey] = useState(
    () => (taskType === 'classification' ? 'accuracy' : 'rmse'),
  )

  const sorted = useMemo(() => {
    const copy = [...(rows || [])]
    const mult = sortKey === 'rmse' ? -1 : 1
    copy.sort((a, b) => {
      const av = Number(a[sortKey] ?? 0)
      const bv = Number(b[sortKey] ?? 0)
      if (sortKey === 'rmse') return av - bv
      return mult * (bv - av)
    })
    return copy
  }, [rows, sortKey])

  if (!rows?.length) {
    return (
      <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-200">Model leaderboard</h2>
        <p className="mt-2 text-sm text-slate-500">No models returned yet.</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="lb-heading">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="lb-heading" className="text-lg font-semibold text-white">
            Model leaderboard
          </h2>
          <p className="text-sm text-slate-400">Sortable · click a row for details</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Sort by
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1 text-slate-100"
          >
            <option value="accuracy">Accuracy</option>
            <option value="rmse">RMSE</option>
            <option value="f1">F1</option>
            <option value="r2">R²</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                Model
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Accuracy
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                RMSE
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                F1
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                R²
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const name = String(row.model ?? row.name ?? `Model ${i + 1}`)
              const key = `${name}-${i}`
              return (
                <tr
                  key={key}
                  className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.04]"
                  onClick={() => onSelect(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(row)
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Open details for ${name}`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-indigo-200">{name}</td>
                  <td className="px-3 py-2 text-slate-300">{formatNum(row.accuracy)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatNum(row.rmse)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatNum(row.f1)}</td>
                  <td className="px-3 py-2 text-slate-300">{formatNum(row.r2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {taskType === 'classification'
          ? 'For classification, prefer accuracy and F1; lower RMSE is better for regression-style error on the leaderboard.'
          : 'For regression, prioritize RMSE and R².'}
      </p>
    </section>
  )
}

function formatNum(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  if (n === 0) return '0'
  const s = n.toFixed(4).replace(/\.?0+$/, '')
  return s === '' ? '0' : s
}
