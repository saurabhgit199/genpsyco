import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import '../App.css'

const PreviousTherapies = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedSessions, setExpandedSessions] = useState(new Set())
  const [editingSession, setEditingSession] = useState(null)
  const [editInput, setEditInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showVoiceDialog, setShowVoiceDialog] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [fetchingVoices, setFetchingVoices] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/therapy/my-sessions')
      setSessions(response.data)
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setError('Failed to load therapy sessions')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (sessionId) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  const handleEdit = (session) => {
    setEditingSession(session)
    setEditInput(session.user_input)
    setError('')
    setSuccess('')
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingSession) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await axios.put(`/api/therapy/${editingSession.id}/update-input`, {
        user_input: editInput
      })
      setSuccess('Session updated! Fresh therapy content is being reviewed.')
      setEditingSession(null)
      setEditInput('')
      await fetchSessions()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update session')
    } finally {
      setSubmitting(false)
    }
  }

  const openVoiceDialog = async (sessionId) => {
    setSelectedSessionId(sessionId)
    setShowVoiceDialog(true)
    setFetchingVoices(true)
    setError('')
    
    const saved = window.localStorage.getItem(`voice_for_session_${sessionId}`)
    if (saved) {
      setSelectedVoice(saved)
    }
    
    try {
      const res = await axios.get('/api/audio/voices')
      setVoices(res.data.voices || [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to fetch voices.')
    } finally {
      setFetchingVoices(false)
    }
  }

  const saveVoiceSelection = () => {
    if (selectedVoice && selectedSessionId) {
      window.localStorage.setItem(`voice_for_session_${selectedSessionId}`, selectedVoice)
      setSuccess('Voice preference saved! Your psychologist will use this voice to generate audio.')
      setShowVoiceDialog(false)
      setSelectedSessionId(null)
      setSelectedVoice('')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending Review', color: '#ffc107' },
      approved: { text: 'Approved', color: '#28a745' },
      rejected: { text: 'Rejected', color: '#dc3545' },
      audio_generated: { text: 'Audio Ready', color: '#17a2b8' }
    }
    const badge = badges[status] || badges.pending
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        backgroundColor: badge.color,
        color: 'white',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return <div className="container"><div className="loading">Loading...</div></div>
  }

  return (
    <div className="container">
      <div style={{ 
        marginBottom: '3rem'
      }}>
        <h1 style={{ 
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--purple-600) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Previous Therapies
        </h1>
        <p style={{ 
          color: 'var(--gray-600)', 
          fontSize: '1.125rem',
          fontWeight: 400
        }}>
          View and manage all your therapy sessions
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="card">
        {sessions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            No therapy sessions yet. Create your first session from the dashboard!
          </p>
        ) : (
          <div>
            {sessions.map((session) => {
              const isExpanded = expandedSessions.has(session.id)
              const isEditing = editingSession?.id === session.id

              return (
                <div 
                  key={session.id} 
                  style={{ 
                    padding: '20px', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px',
                    marginBottom: '15px',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ marginBottom: '10px', color: '#333' }}>
                        Session #{session.id}
                      </h3>
                      <p style={{ color: '#666', fontSize: '14px' }}>
                        Created: {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleUpdate} style={{ marginBottom: '15px' }}>
                      <div className="form-group">
                        <label>Your Input:</label>
                        <textarea
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          required
                          style={{ minHeight: '100px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={submitting}
                        >
                          {submitting ? 'Updating...' : 'Save Changes'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingSession(null)
                            setEditInput('')
                          }}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ marginBottom: '15px' }}>
                      <strong style={{ color: '#333' }}>Your Input:</strong>
                      <p style={{ color: '#666', marginTop: '5px' }}>{session.user_input}</p>
                    </div>
                  )}

                  {session.generated_text && (
                    <div style={{ marginBottom: '15px' }}>
                      <details open={isExpanded}>
                        <summary 
                          style={{ cursor: 'pointer', fontWeight: 600, color: '#333' }}
                          onClick={(e) => {
                            e.preventDefault()
                            toggleExpand(session.id)
                          }}
                        >
                          {isExpanded ? '▼' : '▶'} Generated Therapy Content
                        </summary>
                        <p style={{ color: '#666', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
                          {session.generated_text}
                        </p>
                      </details>
                    </div>
                  )}

                  {session.approved_text && (
                    <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '6px' }}>
                      <details open={isExpanded}>
                        <summary 
                          style={{ cursor: 'pointer', fontWeight: 600, color: '#2e7d32' }}
                          onClick={(e) => {
                            e.preventDefault()
                            toggleExpand(session.id)
                          }}
                        >
                          {isExpanded ? '▼' : '▶'} Approved Therapy Content
                        </summary>
                        <p style={{ color: '#1b5e20', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
                          {session.approved_text}
                        </p>
                      </details>
                    </div>
                  )}

                  {/* Action Buttons - Always Active */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px' }}>
                    {!isEditing && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleEdit(session)}
                      >
                        ✏️ Edit Input
                      </button>
                    )}
                    
                    {(session.status === 'approved' || session.status === 'audio_generated') && (
                      <button
                        className="btn btn-primary"
                        onClick={() => openVoiceDialog(session.id)}
                      >
                        🎤 Select Voice & Preview
                      </button>
                    )}

                    {session.psychologist_id && (
                      <a 
                        className="btn" 
                        style={{ background: '#667eea', color: 'white' }}
                        href={`/patient/chat/${session.id}`}
                      >
                        💬 Chat with Psychologist
                      </a>
                    )}

                    {session.status === 'audio_generated' && (
                      <a 
                        className="btn" 
                        style={{ background: '#17a2b8', color: 'white' }}
                        href="/patient/audio-library"
                      >
                        🎵 Listen to Audio
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Voice Selection Dialog */}
      {showVoiceDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            width: 'min(720px, 95vw)',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Select Your Preferred Voice</h3>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
              Choose a voice for your therapy audio. Your psychologist will use this preference when generating audio.
            </p>
            
            {fetchingVoices ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Loading available voices...</p>
              </div>
            ) : voices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No voices available at the moment. Please try again later.</p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '12px',
                marginBottom: '20px'
              }}>
                {voices.map(v => (
                  <div 
                    key={v.id} 
                    style={{ 
                      border: selectedVoice === v.id ? '2px solid #667eea' : '1px solid #eee', 
                      borderRadius: '6px', 
                      padding: '12px',
                      backgroundColor: selectedVoice === v.id ? '#f0f4ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setSelectedVoice(v.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: '#333' }}>{v.name || v.id}</strong>
                      <input
                        type="radio"
                        name="voice"
                        value={v.id}
                        checked={selectedVoice === v.id}
                        onChange={() => setSelectedVoice(v.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                    {v.preview_url && (
                      <audio 
                        controls 
                        style={{ width: '100%', marginTop: '8px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <source src={v.preview_url} type="audio/mpeg" />
                      </audio>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowVoiceDialog(false)
                  setSelectedSessionId(null)
                  setSelectedVoice('')
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={saveVoiceSelection}
                disabled={!selectedVoice || fetchingVoices}
              >
                Save Voice Preference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PreviousTherapies

