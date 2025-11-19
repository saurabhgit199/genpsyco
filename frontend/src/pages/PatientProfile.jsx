import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const PatientProfile = () => {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setFullName(user?.full_name || '')
  }, [user])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const payload = {}
      if (fullName && fullName !== user?.full_name) payload.full_name = fullName
      if (password) payload.password = password
      await axios.patch('/api/auth/me', payload)
      setSuccess('Profile updated.')
      setPassword('')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>My Profile</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={save}>
          <div className="form-group">
            <label>Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>New Password (optional)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PatientProfile


