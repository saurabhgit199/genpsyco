import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const PatientChoosePsychologist = () => {
  const { user } = useAuth()
  const [psychologists, setPsychologists] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedProfiles, setExpandedProfiles] = useState({})
  const [selectedPsychologists, setSelectedPsychologists] = useState({})

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, sessionsRes] = await Promise.all([
          axios.get('/api/auth/users/psychologists'),
          axios.get('/api/therapy/my-sessions')
        ])
        setPsychologists(usersRes.data)
        const pending = sessionsRes.data.filter(s => s.status === 'pending')
        const selectedMap = {}
        pending.forEach((session) => {
          if (session.psychologist_id) {
            selectedMap[session.id] = session.psychologist_id
          }
        })
        setSessions(pending)
        setSelectedPsychologists(selectedMap)
      } catch (e) {
        setError('Failed to load psychologists or sessions.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const assign = async (sessionId, psychologistId) => {
    setError('')
    setSuccess('')
    setAssigning(true)
    try {
      await axios.put(`/api/therapy/${sessionId}/assign`, { psychologist_id: psychologistId })
      setSuccess('Psychologist assigned successfully.')
      // Refresh pending sessions list
      const res = await axios.get('/api/therapy/my-sessions')
      const pending = res.data.filter(s => s.status === 'pending')
      setSessions(pending)
      setSelectedPsychologists(prev => ({
        ...prev,
        [sessionId]: psychologistId
      }))
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to assign psychologist.')
    } finally {
      setAssigning(false)
    }
  }

  const toggleProfile = (id) => {
    setExpandedProfiles(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="container">
      <div className="card">
        <h2>Choose a Psychologist</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {sessions.length === 0 ? (
          <p style={{ color: '#666' }}>You have no pending sessions requiring assignment.</p>
        ) : (
          sessions.map(session => (
            <div key={session.id} style={{ padding: '16px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '12px', background: '#fafafa' }}>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <strong>Session #{session.id}</strong> &nbsp;
                  <span style={{ color: '#666' }}>Created: {new Date(session.created_at).toLocaleString()}</span>
                </div>
                {selectedPsychologists[session.id] && (
                  <span style={{ color: '#17a2b8', fontWeight: 600 }}>
                    Selected: {psychologists.find(p => p.id === selectedPsychologists[session.id])?.full_name || 'Pending'}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Select Psychologist</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {psychologists.length === 0 ? (
                    <p style={{ color: '#888' }}>No psychologists available yet.</p>
                  ) : (
                    psychologists.map(p => {
                      const isSelected = selectedPsychologists[session.id] === p.id
                      const isExpanded = expandedProfiles[p.id]
                      return (
                        <div
                          key={p.id}
                          style={{
                            border: `2px solid ${isSelected ? '#43a047' : '#e0e0e0'}`,
                            borderRadius: '8px',
                            padding: '12px',
                            background: isSelected ? '#e8f5e9' : '#fff',
                            transition: 'background 0.2s ease',
                          }}
                        >
                          <div
                            onClick={() => toggleProfile(p.id)}
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <span style={{ fontWeight: 600, color: '#333' }}>{p.full_name}</span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              {isExpanded ? 'Hide details ▲' : 'View details ▼'}
                            </span>
                          </div>
                          {isExpanded && (
                            <div style={{ marginTop: '10px', color: '#444', fontSize: '14px' }}>
                              <p style={{ margin: '4px 0' }}>
                                <strong>Therapies delivered:</strong> {p.delivered_count}
                              </p>
                              <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>
                                {p.bio?.trim() ? p.bio : 'Description coming soon.'}
                              </p>
                            </div>
                          )}
                          <button
                            className="btn"
                            style={{
                              marginTop: '10px',
                              background: isSelected ? '#2e7d32' : '#667eea',
                              color: 'white',
                              width: '100%'
                            }}
                            disabled={assigning && !isSelected}
                            onClick={() => assign(session.id, p.id)}
                          >
                            {isSelected ? 'Selected' : 'Choose Psychologist'}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Available Psychologists</h3>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Tap on a psychologist to view their profile details, delivered therapies, and description.
        </p>
        {psychologists.length === 0 ? (
          <p style={{ color: '#888' }}>No psychologists available yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {psychologists.map(p => {
              const isExpanded = expandedProfiles[p.id]
              return (
                <div key={p.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                  <div
                    onClick={() => toggleProfile(p.id)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <strong>{p.full_name}</strong>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {isExpanded ? 'Hide details ▲' : 'View details ▼'}
                    </span>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: '10px', color: '#444', fontSize: '14px' }}>
                      <p style={{ margin: '4px 0' }}>Therapies delivered: {p.delivered_count}</p>
                      <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>
                        {p.bio?.trim() ? p.bio : 'Description coming soon.'}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientChoosePsychologist


