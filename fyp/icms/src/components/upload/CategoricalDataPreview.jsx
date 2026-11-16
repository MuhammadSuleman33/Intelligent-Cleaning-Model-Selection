import { useMemo, useState } from 'react'

/**
 * Component to display categorical data preprocessing information.
 * Shows detected categorical columns and their encoding strategies.
 *
 * @param {{
 *   encodingSummary: Record<string, unknown>
 *   preview: Record<string, unknown>
 * }} props
 */
export function CategoricalDataPreview({ encodingSummary, preview }) {
  const [expandedCol, setExpandedCol] = useState(null)

  if (!encodingSummary?.has_categorical) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
        <p>No categorical columns detected in this dataset.</p>
      </div>
    )
  }

  const columns = encodingSummary.columns || {}
  const transformations = preview?.transformations || {}

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
        <h3 className="font-semibold text-indigo-100">{encodingSummary.summary}</h3>
      </div>

      {/* Encoding Strategy Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        {encodingSummary.encoding_plan?.label_encoding?.length > 0 && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <h4 className="mb-2 font-semibold text-blue-200">Label Encoding</h4>
            <p className="mb-2 text-xs text-blue-300">Binary categories → 0, 1</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {encodingSummary.encoding_plan.label_encoding.map((col) => (
                <li key={col} className="font-mono text-xs">
                  • {col}
                </li>
              ))}
            </ul>
          </div>
        )}

        {encodingSummary.encoding_plan?.onehot_encoding?.length > 0 && (
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
            <h4 className="mb-2 font-semibold text-purple-200">One-Hot Encoding</h4>
            <p className="mb-2 text-xs text-purple-300">Multiple categories → binary columns</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {encodingSummary.encoding_plan.onehot_encoding.map((col) => (
                <li key={col} className="font-mono text-xs">
                  • {col}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed Column Information */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-200">Categorical Columns</h4>
        <div className="space-y-2">
          {Object.entries(columns).map(([colName, info]) => (
            <div key={colName} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <button
                type="button"
                onClick={() => setExpandedCol(expandedCol === colName ? null : colName)}
                className="w-full text-left transition-colors hover:bg-white/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-100">{colName}</p>
                    <p className="text-xs text-slate-400">
                      {info.cardinality} unique values · {info.encoding} encoding
                    </p>
                  </div>
                  <span className="text-slate-400">{expandedCol === colName ? '▼' : '▶'}</span>
                </div>
              </button>

              {expandedCol === colName && (
                <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Type:</p>
                    <p className="text-xs text-slate-400">{info.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">Unique Values:</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {info.unique_values?.slice(0, 10).map((val, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-white/10 px-2 py-1 font-mono text-xs text-slate-300"
                        >
                          {String(val).length > 15 ? `${String(val).substring(0, 12)}…` : val}
                        </span>
                      ))}
                      {info.unique_values?.length > 10 && (
                        <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-400">
                          +{info.unique_values.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Encoding Preview */}
      {preview?.has_preview && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-200">Transformation Preview</h4>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="space-y-4">
              {Object.entries(transformations).map(([colName, transform]) => (
                <div key={colName} className="space-y-2 border-b border-white/5 pb-4 last:border-0">
                  <p className="font-mono text-sm font-semibold text-indigo-200">{colName}</p>
                  <p className="text-xs text-slate-400">{transform.description}</p>

                  {transform.encoding_type === 'label_encoding' && (
                    <div className="mt-2 text-xs text-slate-400">
                      <p className="font-semibold text-slate-300">Category → Integer Mapping:</p>
                      <div className="mt-1 space-y-1 font-mono">
                        {Object.entries(transform.mapping || {})
                          .slice(0, 5)
                          .map(([cat, num]) => (
                            <div key={cat} className="text-slate-400">
                              "{cat}" → {num}
                            </div>
                          ))}
                        {Object.keys(transform.mapping || {}).length > 5 && (
                          <div className="text-slate-500">
                            +{Object.keys(transform.mapping).length - 5} more mappings
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {transform.encoding_type === 'onehot_encoding' && (
                    <div className="mt-2 text-xs text-slate-400">
                      <p className="font-semibold text-slate-300">
                        {transform.total_categories} categories detected
                      </p>
                      <p className="mt-1">
                        Will create {transform.total_categories} binary columns, e.g.:
                      </p>
                      <div className="mt-1 space-y-1 font-mono">
                        {transform.categories?.slice(0, 3).map((cat) => (
                          <div key={cat} className="text-slate-400">
                            {colName}_{cat}: 0 or 1
                          </div>
                        ))}
                        {transform.categories && transform.categories.length > 3 && (
                          <div className="text-slate-500">
                            ...and {transform.categories.length - 3} more columns
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
