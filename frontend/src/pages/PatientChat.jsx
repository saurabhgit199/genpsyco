import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../App.css'

const PatientChat = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSession()
    loadMessages()
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const response = await axios.get(`/api/therapy/${sessionId}`)
      setSession(response.data)
    } catch (err) {
      setError('Failed to load session')
      console.error(err)
    }
  }

  const loadMessages = async () => {
    try {
      const res = await axios.get(`/api/chat/${sessionId}`)
      setMessages(res.data)
    } catch (e) {
      console.error('Error loading messages:', e)
    } finally {
      setLoading(false)
    }
  }

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      await axios.post(`/api/chat/${sessionId}`, { content: text.trim() })
      setText('')
      await loadMessages()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading && !session) {
    return <div className="container"><div className="loading">Loading...</div></div>
  }

  return (
    <div className="container">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '3rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ 
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--purple-600) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Chat with Psychologist
          </h1>
          <p style={{ 
            color: 'var(--gray-600)', 
            fontSize: '1.125rem',
            fontWeight: 400
          }}>
            {session ? `Session #${session.id}` : 'Therapy Session Chat'}
          </p>
        </div>
        <button onClick={() => navigate('/patient/therapies')} className="btn btn-secondary">
          ← Back to Therapies
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        {session && (
          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '10px' }}>Session #{session.id}</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Created: {new Date(session.created_at).toLocaleString()}
            </p>
            <div style={{ marginTop: '10px' }}>
              <strong>Your Input:</strong>
              <p style={{ color: '#666', marginTop: '5px' }}>{session.user_input}</p>
            </div>
          </div>
        )}

        <div style={{ 
          maxHeight: '500px', 
          overflowY: 'auto', 
          background: '#fff', 
          border: '1px solid #eee', 
          borderRadius: '6px', 
          padding: '15px', 
          marginBottom: '20px',
          minHeight: '300px'
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map(m => {
              const isPatient = m.sender_id === user?.id
              return (
                <div 
                  key={m.id} 
                  style={{ 
                    marginBottom: '15px',
                    display: 'flex',
                    justifyContent: isPatient ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '12px 15px',
                    borderRadius: '12px',
                    backgroundColor: isPatient ? '#667eea' : '#e0e0e0',
                    color: isPatient ? 'white' : '#333'
                  }}>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '5px' }}>
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <form onSubmit={send} style={{ display: 'flex', gap: '10px' }}>
          <input
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ 
              flex: 1, 
              padding: '12px', 
              border: '1px solid #ccc', 
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <button 
            className="btn btn-primary" 
            disabled={sending || !text.trim()}
            style={{ minWidth: '100px' }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PatientChat

