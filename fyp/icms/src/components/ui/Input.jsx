/**
 * @param {{
 *   id: string
 *   label: string
 *   type?: string
 *   value: string
 *   onChange: (e: import('react').ChangeEvent<HTMLInputElement>) => void
 *   autoComplete?: string
 *   error?: string
 *   placeholder?: string
 * }} props
 */
export function Input({ id, label, type = 'text', value, onChange, autoComplete, error, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/30"
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
