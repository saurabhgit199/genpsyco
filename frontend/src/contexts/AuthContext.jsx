import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      setUser(response.data)
    } catch (error) {
      console.error('Error fetching user:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    // OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)

    try {
      const response = await axios.post('/api/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token } = response.data
      setToken(access_token)
      localStorage.setItem('token', access_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      await fetchUser()
      return response.data
    } catch (error) {
      // Log error details for debugging
      console.error('Login error:', error)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
      }
      throw error
    }
  }

  const googleLogin = async (googleToken, role) => {
    const response = await axios.post('/api/auth/google/login', {
      token: googleToken,
      role: role
    })

    const { access_token } = response.data
    setToken(access_token)
    localStorage.setItem('token', access_token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    await fetchUser()
    return response.data
  }

  const phoneLogin = async (phoneNumber, code, role) => {
    const response = await axios.post('/api/auth/phone/login', {
      phone_number: phoneNumber,
      code: code,
      role: role
    })

    const { access_token } = response.data
    setToken(access_token)
    localStorage.setItem('token', access_token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    await fetchUser()
    return response.data
  }

  const requestPhoneOTP = async (phoneNumber, role) => {
    const response = await axios.post('/api/auth/phone/request-otp', {
      phone_number: phoneNumber,
      role: role
    })
    return response.data  // Return full response to access otp_code in dev mode
  }

  const register = async (userData) => {
    const response = await axios.post('/api/auth/register', userData)
    return response.data
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    login,
    googleLogin,
    phoneLogin,
    requestPhoneOTP,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

