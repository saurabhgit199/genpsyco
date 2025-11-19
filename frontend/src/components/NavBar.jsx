import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NavBar = () => {
  const { isAuthenticated, user, logout } = useAuth() || {}
  const location = useLocation()

  if (!isAuthenticated) return null

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{ 
      background: 'var(--white)', 
      borderBottom: '1px solid var(--gray-200)',
      padding: '1rem 2rem', 
      display: 'flex', 
      gap: '1rem', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ 
          color: 'var(--gray-900)', 
          fontWeight: 700,
          fontSize: '1.25rem',
          background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--purple-600) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Therapy App
        </span>
        {user?.role === 'patient' && (
          <>
            <Link 
              className="btn" 
              style={{ 
                background: isActive('/patient') ? 'linear-gradient(135deg, var(--primary-500) 0%, var(--purple-500) 100%)' : 'var(--gray-100)', 
                color: isActive('/patient') ? 'var(--white)' : 'var(--gray-700)',
                border: isActive('/patient') ? 'none' : '1px solid var(--gray-200)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }} 
              to="/patient"
            >
              Dashboard
            </Link>
            <Link 
              className="btn" 
              style={{ 
                background: isActive('/patient/therapies') ? 'linear-gradient(135deg, var(--primary-500) 0%, var(--purple-500) 100%)' : 'var(--gray-100)', 
                color: isActive('/patient/therapies') ? 'var(--white)' : 'var(--gray-700)',
                border: isActive('/patient/therapies') ? 'none' : '1px solid var(--gray-200)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }} 
              to="/patient/therapies"
            >
              📋 Therapies
            </Link>
            <Link 
              className="btn" 
              style={{ 
                background: isActive('/patient/audio-library') ? 'linear-gradient(135deg, var(--primary-500) 0%, var(--purple-500) 100%)' : 'var(--gray-100)', 
                color: isActive('/patient/audio-library') ? 'var(--white)' : 'var(--gray-700)',
                border: isActive('/patient/audio-library') ? 'none' : '1px solid var(--gray-200)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }} 
              to="/patient/audio-library"
            >
              🎵 Audio
            </Link>
            <Link 
              className="btn" 
              style={{ 
                background: isActive('/patient/choose-psychologist') ? 'linear-gradient(135deg, var(--primary-500) 0%, var(--purple-500) 100%)' : 'var(--gray-100)', 
                color: isActive('/patient/choose-psychologist') ? 'var(--white)' : 'var(--gray-700)',
                border: isActive('/patient/choose-psychologist') ? 'none' : '1px solid var(--gray-200)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }} 
              to="/patient/choose-psychologist"
            >
              Choose Psychologist
            </Link>
            <Link 
              className="btn" 
              style={{ 
                background: isActive('/patient/profile') ? 'linear-gradient(135deg, var(--primary-500) 0%, var(--purple-500) 100%)' : 'var(--gray-100)', 
                color: isActive('/patient/profile') ? 'var(--white)' : 'var(--gray-700)',
                border: isActive('/patient/profile') ? 'none' : '1px solid var(--gray-200)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }} 
              to="/patient/profile"
            >
              Profile
            </Link>
          </>
        )}
        {user?.role === 'psychologist' && (
          <>
            <Link 
              className="btn" 
              style={{ 
                background: isActive('/psychologist') ? 'linear-gradient(135deg, var(--primary-500) 0%, var(--purple-500) 100%)' : 'var(--gray-100)', 
                color: isActive('/psychologist') ? 'var(--white)' : 'var(--gray-700)',
                border: isActive('/psychologist') ? 'none' : '1px solid var(--gray-200)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }} 
              to="/psychologist"
            >
              Dashboard
            </Link>
          </>
        )}
      </div>
      <div>
        <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Logout
        </button>
      </div>
    </nav>
  )
}

export default NavBar


