import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // If a specific role is required, check it
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user role
    if (user?.role === 'patient') {
      return <Navigate to="/patient" replace />
    } else if (user?.role === 'psychologist') {
      return <Navigate to="/psychologist" replace />
    }
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute

