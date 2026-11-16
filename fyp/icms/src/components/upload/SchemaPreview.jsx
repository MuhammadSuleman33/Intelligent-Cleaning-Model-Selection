/**
 * @param {{
 *   columns: { name: string, dataType: string }[]
 *   sampleRows: Record<string, unknown>[]
 * }} props
 */
export function SchemaPreview({ columns, sampleRows }) {
  if (!columns?.length) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {columns.map((c) => (
              <th key={c.name} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold text-slate-200">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-white/5 bg-white/[0.02] text-xs text-slate-400">
            {columns.map((c) => (
              <td key={`type-${c.name}`} className="whitespace-nowrap px-3 py-2">
                {c.dataType}
              </td>
            ))}
          </tr>
          {sampleRows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5 last:border-0">
              {columns.map((c) => (
                <td key={`${c.name}-${ri}`} className="max-w-[160px] truncate px-3 py-2 text-slate-300">
                  {String(row[c.name] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
