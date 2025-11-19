import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../App.css'

const Login = () => {
  const [loginMethod, setLoginMethod] = useState('password') // 'password', 'google', 'phone'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [role, setRole] = useState('patient')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOTP, setSendingOTP] = useState(false)
  const [devModeOTP, setDevModeOTP] = useState('')
  const { login, googleLogin, phoneLogin, requestPhoneOTP, user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Store handleGoogleSignIn in a ref to avoid dependency issues
  const handleGoogleSignInRef = useRef(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'patient') {
        navigate('/patient')
      } else if (user.role === 'psychologist') {
        navigate('/psychologist')
      }
    }
  }, [isAuthenticated, user, navigate])

  const handleGoogleSignIn = async (response) => {
    if (!response || !response.credential) {
      setError('No credential received from Google. Please try again.')
      return
    }
    
    setError('')
    setLoading(true)
    try {
      await googleLogin(response.credential, role)
      // Navigation will happen via useEffect when user is set
    } catch (err) {
      console.error('Google login error:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Google login failed. Please try again.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  // Update ref when handler changes
  useEffect(() => {
    handleGoogleSignInRef.current = handleGoogleSignIn
  }, [handleGoogleSignIn])

  // Load Google Identity Services
  useEffect(() => {
    if (loginMethod === 'google' && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      // Clean up any existing button
      const existingContainer = document.getElementById('g_id_signin')
      if (existingContainer) {
        existingContainer.innerHTML = ''
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)

      script.onload = () => {
        if (window.google && window.google.accounts) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: (response) => {
              // Use ref to get latest version of handler
              if (handleGoogleSignInRef.current) {
                handleGoogleSignInRef.current(response)
              }
            },
          })
          
          // Wait a bit for DOM to be ready, then render button
          setTimeout(() => {
            const buttonContainer = document.getElementById('g_id_signin')
            if (buttonContainer && window.google && window.google.accounts) {
              try {
                window.google.accounts.id.renderButton(buttonContainer, {
                  type: 'standard',
                  theme: 'outline',
                  size: 'large',
                  text: 'sign_in_with',
                  shape: 'rectangular',
                  logo_alignment: 'left',
                  width: '100%'
                })
              } catch (err) {
                console.error('Error rendering Google button:', err)
                setError('Failed to render Google Sign-In button. Please refresh the page.')
              }
            }
          }, 200)
        } else {
          setError('Google Identity Services not loaded. Please refresh the page.')
        }
      }
      
      script.onerror = () => {
        setError('Failed to load Google Sign-In. Please refresh the page.')
      }

      return () => {
        // Cleanup
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
        // Clear button container
        const container = document.getElementById('g_id_signin')
        if (container) {
          container.innerHTML = ''
        }
      }
    }
  }, [loginMethod])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      // Navigation will happen via useEffect when user is set
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
      setLoading(false)
    }
  }

  const handleRequestOTP = async (e) => {
    e.preventDefault()
    setError('')
    setSendingOTP(true)
    setDevModeOTP('')

    try {
      const response = await requestPhoneOTP(phoneNumber, role)
      setOtpSent(true)
      setError('')
      // If dev mode, show the OTP code
      if (response.otp_code) {
        setDevModeOTP(response.otp_code)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.')
    } finally {
      setSendingOTP(false)
    }
  }

  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await phoneLogin(phoneNumber, otpCode, role)
      // Navigation will happen via useEffect when user is set
    } catch (err) {
      setError(err.response?.data?.detail || 'Phone login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--purple-600) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '2rem'
        }}>
          Mental Health Therapy
        </h1>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          color: 'var(--gray-600)',
          fontSize: '1.5rem',
          fontWeight: 400
        }}>
          Login
        </h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {/* Login Method Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--gray-200)'
        }}>
          <button
            onClick={() => {
              setLoginMethod('password')
              setError('')
              setOtpSent(false)
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: 'transparent',
              borderBottom: loginMethod === 'password' ? '2px solid var(--primary-500)' : '2px solid transparent',
              color: loginMethod === 'password' ? 'var(--primary-600)' : 'var(--gray-600)',
              cursor: 'pointer',
              fontWeight: loginMethod === 'password' ? 600 : 400,
              transition: 'all var(--transition-base)'
            }}
          >
            Password
          </button>
          <button
            onClick={() => {
              setLoginMethod('google')
              setError('')
              setOtpSent(false)
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: 'transparent',
              borderBottom: loginMethod === 'google' ? '2px solid var(--primary-500)' : '2px solid transparent',
              color: loginMethod === 'google' ? 'var(--primary-600)' : 'var(--gray-600)',
              cursor: 'pointer',
              fontWeight: loginMethod === 'google' ? 600 : 400,
              transition: 'all var(--transition-base)'
            }}
          >
            Google
          </button>
          <button
            onClick={() => {
              setLoginMethod('phone')
              setError('')
              setOtpSent(false)
            }}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: 'transparent',
              borderBottom: loginMethod === 'phone' ? '2px solid var(--primary-500)' : '2px solid transparent',
              color: loginMethod === 'phone' ? 'var(--primary-600)' : 'var(--gray-600)',
              cursor: 'pointer',
              fontWeight: loginMethod === 'phone' ? 600 : 400,
              transition: 'all var(--transition-base)'
            }}
          >
            Phone
          </button>
        </div>

        {/* Role Selection */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>I am a:</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              border: '1px solid var(--gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9375rem',
              backgroundColor: 'var(--white)',
              color: 'var(--gray-900)'
            }}
          >
            <option value="patient">Patient</option>
            <option value="psychologist">Psychologist</option>
          </select>
        </div>

        {/* Password Login */}
        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* Google Login */}
        {loginMethod === 'google' && (
          <div>
            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <div
                id="g_id_signin"
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}
              />
            ) : (
              <div className="error-message" style={{ marginTop: '1rem' }}>
                Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.
                <br />
                <small style={{ fontSize: '0.875rem' }}>
                  You can still use password or phone login.
                </small>
              </div>
            )}
          </div>
        )}

        {/* Phone Login */}
        {loginMethod === 'phone' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleRequestOTP}>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    placeholder="+1234567890"
                    pattern="[+]?[0-9]{10,15}"
                  />
                  <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                    Include country code (e.g., +1 for US)
                  </p>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  disabled={sendingOTP}
                >
                  {sendingOTP ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneLogin}>
                {devModeOTP && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--primary-50)',
                    border: '1px solid var(--primary-200)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: 0, color: 'var(--primary-700)', fontWeight: 600 }}>
                      🔧 DEV MODE: Your OTP Code is
                    </p>
                    <p style={{ 
                      margin: '0.5rem 0 0 0', 
                      fontSize: '1.5rem', 
                      fontFamily: 'monospace',
                      color: 'var(--primary-900)',
                      fontWeight: 700,
                      letterSpacing: '0.25rem'
                    }}>
                      {devModeOTP}
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                      (In production, this would be sent via SMS)
                    </p>
                  </div>
                )}
                <div className="form-group">
                  <label>Enter OTP Code</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="000000"
                    maxLength="6"
                    style={{ 
                      textAlign: 'center',
                      fontSize: '1.5rem',
                      letterSpacing: '0.5rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <p style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
                    OTP sent to {phoneNumber}
                  </p>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    setOtpSent(false)
                    setOtpCode('')
                    setError('')
                  }}
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                >
                  Change Phone Number
                </button>
              </form>
            )}
          </div>
        )}
        
        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--gray-600)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
