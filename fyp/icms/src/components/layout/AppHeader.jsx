import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
  }`

const authClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'text-indigo-200' : 'text-indigo-300/90 hover:text-indigo-200'
  }`

export function AppHeader() {
  const token = useAuthStore((s) => s.token)

  return (
    <header className="mb-8 border-b border-white/10 pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <NavLink
          to="/"
          className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/90 hover:text-indigo-200"
        >
          ICMS
        </NavLink>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
          <NavLink to="/" className={linkClass} end>
            Projects
          </NavLink>
          <NavLink to="/upload" className={linkClass}>
            New run
          </NavLink>
          <NavLink to="/activity" className={linkClass}>
            Activity
          </NavLink>
          <NavLink to="/help" className={linkClass}>
            Help
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Settings
          </NavLink>
          {!token ? (
            <>
              <span className="mx-1 hidden text-slate-600 sm:inline" aria-hidden>
                |
              </span>
              <NavLink to="/login" className={authClass}>
                Log in
              </NavLink>
              <NavLink to="/register" className={authClass}>
                Sign up
              </NavLink>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
