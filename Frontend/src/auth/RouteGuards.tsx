import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Signed-in users only; everyone else is sent to /login. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

/** Login/signup pages; signed-in users are sent into the app. */
export function GuestOnly() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/closet" replace /> : <Outlet />
}
