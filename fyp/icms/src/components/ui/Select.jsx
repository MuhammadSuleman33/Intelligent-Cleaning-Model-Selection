/**
 * @param {{
 *   id: string
 *   label: string
 *   value: string
 *   onChange: (e: import('react').ChangeEvent<HTMLSelectElement>) => void
 *   options: { value: string, label: string }[]
 *   error?: string
 * }} props
 */
export function Select({ id, label, value, onChange, options, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-slate-100 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
