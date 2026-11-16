import { Link } from 'react-router-dom'

/**
 * @param {{
 *   children: import('react').ReactNode
 *   className?: string
 *   variant?: 'primary' | 'ghost' | 'danger'
 *   type?: 'button' | 'submit'
 *   disabled?: boolean
 *   onClick?: () => void
 *   to?: string
 *   state?: unknown
 *   replace?: boolean
 * }} props
 */
export function Button({
  children,
  className = '',
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
  to,
  state,
  replace,
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45'
  const variants = {
    primary:
      'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 focus-visible:outline-indigo-400',
    ghost:
      'border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 focus-visible:outline-slate-300',
    danger:
      'bg-rose-500/90 text-white hover:bg-rose-400 focus-visible:outline-rose-400',
  }
  const cls = `${base} ${variants[variant]} ${className}`

  if (to) {
    return (
      <Link
        to={to}
        state={state}
        replace={replace}
        className={cls}
        aria-disabled={disabled ? 'true' : undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={disabled ? (e) => e.preventDefault() : undefined}
      >
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
