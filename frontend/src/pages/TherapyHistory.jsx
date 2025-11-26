import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import '../App.css'

const TherapyHistory = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSessions, setExpandedSessions] = useState(new Set())
  const [playingAudio, setPlayingAudio] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/therapy/my-sessions')
      // Filter to show only approved or audio_generated sessions
      const generatedSessions = response.data.filter(
        session => session.status === 'approved' || session.status === 'audio_generated'
      )
      setSessions(generatedSessions)
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setError('Failed to load therapy history')
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

  const playAudio = async (sessionId) => {
    try {
      setPlayingAudio(sessionId)
      setError('')
      
      // Fetch audio as blob with authentication
      const response = await axios.get(`/api/audio/${sessionId}/play`, {
        responseType: 'blob',
        headers: {
          'Accept': 'audio/mpeg, audio/*'
        }
      })
      
      // Create object URL from blob
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Create and play audio
      const audio = new Audio(audioUrl)
      audio.play()
      
      // Cleanup object URL when done
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        setPlayingAudio(null)
      }
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        setError('Error playing audio. Please try again.')
        setPlayingAudio(null)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error loading audio. Please try again.')
      setPlayingAudio(null)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      approved: { text: 'Approved', color: '#28a745' },
      audio_generated: { text: 'Audio Ready', color: '#17a2b8' }
    }
    const badge = badges[status] || badges.approved
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
    return (
      <div className="container">
        <div className="loading">Loading therapy history...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{ color: 'white', marginBottom: '10px' }}>
            Therapy History
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)' }}>
            All generated and approved therapy sessions
          </p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        {sessions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            No generated therapy sessions yet.
          </p>
        ) : (
          <div>
            {sessions.map((session) => {
              const isExpanded = expandedSessions.has(session.id)
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
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: '10px', color: '#333' }}>
                        Session #{session.id} - {session.patient?.full_name || 'Patient'}
                      </h3>
                      <p style={{ color: '#666', fontSize: '14px' }}>
                        Created: {new Date(session.created_at).toLocaleString()}
                        {session.approved_at && (
                          <span> • Approved: {new Date(session.approved_at).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <strong style={{ color: '#333' }}>Patient's Input:</strong>
                    <p style={{ color: '#666', marginTop: '5px' }}>{session.user_input}</p>
                  </div>

                  {session.generated_text && !session.approved_text && (
                    <div style={{ 
                      marginBottom: '15px', 
                      padding: '15px', 
                      backgroundColor: '#fff3cd', 
                      borderRadius: '6px',
                      border: '1px solid #ffc107'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        color: '#856404'
                      }}>
                        <span style={{ fontSize: '1.5rem' }}>✨</span>
                        <p style={{ margin: 0, fontWeight: 500 }}>
                          Your therapy is generated and our psychologist is curating it for you.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Approved therapy text is only visible to psychologists in their dashboard */}

                  {session.status === 'audio_generated' && session.audio_file_path && (
                    <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '6px' }}>
                      <strong style={{ color: '#0c5460', display: 'block', marginBottom: '10px' }}>
                        Audio Available
                      </strong>
                      <button
                        onClick={() => playAudio(session.id)}
                        className="btn btn-success"
                        disabled={playingAudio === session.id}
                      >
                        {playingAudio === session.id ? '▶ Playing...' : '▶ Play Audio Therapy'}
                      </button>
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

export default TherapyHistory

