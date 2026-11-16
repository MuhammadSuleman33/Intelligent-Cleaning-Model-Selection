import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAuthHydration } from '../../hooks/useAuthHydration'
import { AuthLoading } from './AuthLoading'

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  const hydrated = useAuthHydration()

  if (!hydrated) {
    return <AuthLoading />
  }

  if (token) {
    return children
  }

  return <Navigate to="/login" replace state={{ from: location }} />
}
