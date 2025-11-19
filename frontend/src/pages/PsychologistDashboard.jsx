import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import '../App.css'
import PsychologistGenerateAudio from '../components/PsychologistGenerateAudio'
import ChatPanel from '../components/ChatPanel'

const PsychologistDashboard = () => {
  const { user, logout } = useAuth()
  const [pendingSessions, setPendingSessions] = useState([])
  const [mySessions, setMySessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [editingSession, setEditingSession] = useState(null)
  const [approvedText, setApprovedText] = useState('')
  const [promptText, setPromptText] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bio, setBio] = useState(user?.bio || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState({ error: '', success: '' })
  const [sendingAudioId, setSendingAudioId] = useState(null)
  const [audioStates, setAudioStates] = useState({}) // { historyId: { isPlaying, currentTime, duration, audioUrl } }
  const audioRefs = useRef({}) // Store audio element refs
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null) // Track which audio is currently playing

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    setBio(user?.bio || '')
  }, [user])

  const fetchSessions = async () => {
    try {
      const [pendingRes, myRes] = await Promise.all([
        axios.get('/api/therapy/pending'),
        axios.get('/api/therapy/my-sessions')
      ])
      setPendingSessions(pendingRes.data)
      setMySessions(myRes.data)
    } catch (err) {
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (session) => {
    setEditingSession(session)
    setApprovedText(session.generated_text || '')
    setError('')
    setSuccess('')
  }

  const handleApprove = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await axios.put(`/api/therapy/${editingSession.id}/approve`, {
        approved_text: approvedText,
        status: 'approved'
      })
      setSuccess('Session approved successfully!')
      setEditingSession(null)
      setApprovedText('')
      fetchSessions()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve session')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (sessionId) => {
    if (!window.confirm('Are you sure you want to reject this session?')) {
      return
    }

    try {
      await axios.put(`/api/therapy/${sessionId}/approve`, {
        status: 'rejected'
      })
      setSuccess('Session rejected.')
      fetchSessions()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject session')
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileMessage({ error: '', success: '' })
    setProfileSaving(true)
    try {
      await axios.patch('/api/auth/me', { bio })
      setProfileMessage({ error: '', success: 'Profile updated successfully.' })
    } catch (err) {
      setProfileMessage({ error: err.response?.data?.detail || 'Failed to update profile.', success: '' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleAfterGenerate = async () => {
    setSuccess('Audio generated successfully!')
    await fetchSessions()
  }

  const loadAudio = async (historyId) => {
    const currentState = audioStates[historyId]
    if (currentState?.audioUrl) return // Already loaded

    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in again to play audio.')
        return
      }

      const response = await axios.get(`/api/audio/history/${historyId}/play`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      let contentType = response.headers['content-type'] || 'audio/mpeg'
      const isWav = contentType.includes('wav') || contentType === 'audio/wave' || contentType === 'audio/x-wav' || contentType === 'audio/wav'
      
      if (isWav) {
        contentType = 'audio/wave'
      }
      
      const audioBlob = new Blob([response.data], { type: contentType })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      audioRefs.current[historyId] = audio

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setAudioStates(prev => ({
          ...prev,
          [historyId]: {
            ...prev[historyId],
            duration: audio.duration
          }
        }))
      })

      audio.addEventListener('timeupdate', () => {
        setAudioStates(prev => ({
          ...prev,
          [historyId]: {
            ...prev[historyId],
            currentTime: audio.currentTime
          }
        }))
      })

      audio.addEventListener('ended', () => {
        setCurrentlyPlayingId(null)
        setAudioStates(prev => ({
          ...prev,
          [historyId]: {
            ...prev[historyId],
            isPlaying: false,
            currentTime: 0
          }
        }))
      })

      audio.addEventListener('play', () => {
        // Stop any other currently playing audio
        if (currentlyPlayingId && currentlyPlayingId !== historyId) {
          const otherAudio = audioRefs.current[currentlyPlayingId]
          if (otherAudio && !otherAudio.paused) {
            otherAudio.pause()
            setAudioStates(prev => ({
              ...prev,
              [currentlyPlayingId]: {
                ...prev[currentlyPlayingId],
                isPlaying: false
              }
            }))
          }
        }
        setCurrentlyPlayingId(historyId)
        setAudioStates(prev => ({
          ...prev,
          [historyId]: {
            ...prev[historyId],
            isPlaying: true
          }
        }))
      })

      audio.addEventListener('pause', () => {
        if (currentlyPlayingId === historyId) {
          setCurrentlyPlayingId(null)
        }
        setAudioStates(prev => ({
          ...prev,
          [historyId]: {
            ...prev[historyId],
            isPlaying: false
          }
        }))
      })

      audio.addEventListener('error', (e) => {
        const error = audio.error
        let errorMsg = 'Unable to play audio.'
        if (error) {
          switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMsg = 'Audio playback was aborted.'
              break
            case MediaError.MEDIA_ERR_NETWORK:
              errorMsg = 'Network error while loading audio.'
              break
            case MediaError.MEDIA_ERR_DECODE:
              errorMsg = 'Audio decoding error.'
              break
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMsg = 'Audio format not supported.'
              break
          }
        }
        setError(errorMsg)
      })

      setAudioStates(prev => ({
        ...prev,
        [historyId]: {
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          audioUrl: audioUrl
        }
      }))
    } catch (err) {
      console.error('Error loading audio:', err)
      setError(err.response?.data?.detail || 'Unable to load audio. Please try again.')
    }
  }

  const togglePlayPause = async (historyId) => {
    await loadAudio(historyId)
    const audio = audioRefs.current[historyId]
    if (!audio) return

    if (audio.paused) {
      audio.play().catch((err) => {
        console.error('Error playing audio:', err)
        setError('Unable to play audio.')
      })
    } else {
      audio.pause()
    }
  }

  const seekBackward = (historyId) => {
    const audio = audioRefs.current[historyId]
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10)
    }
  }

  const seekForward = (historyId) => {
    const audio = audioRefs.current[historyId]
    if (audio) {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 10)
    }
  }

  const handleSeek = (historyId, percentage) => {
    const audio = audioRefs.current[historyId]
    if (audio && audio.duration) {
      audio.currentTime = (percentage / 100) * audio.duration
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio && audio.src) {
          URL.revokeObjectURL(audio.src)
        }
      })
      Object.values(audioStates).forEach(state => {
        if (state?.audioUrl) {
          URL.revokeObjectURL(state.audioUrl)
        }
      })
    }
  }, [])

  const sendAudioHistory = async (historyId) => {
    setSendingAudioId(historyId)
    setError('')
    try {
      await axios.post(`/api/audio/history/${historyId}/send`)
      setSuccess('Audio sent to patient.')
      await fetchSessions()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send audio.')
    } finally {
      setSendingAudioId(null)
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
    return <div className="loading">Loading...</div>
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
          <h1 style={{ 
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--purple-600) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Welcome, Dr. {user?.full_name || 'Psychologist'}
          </h1>
          <p style={{ 
            color: 'var(--gray-600)', 
            fontSize: '1.125rem',
            fontWeight: 400
          }}>
            Review and approve therapy sessions
          </p>
        </div>
        <button onClick={logout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>My Public Profile</h3>
        <p style={{ color: '#666', marginBottom: '10px' }}>
          This short description helps patients learn more about you. It will appear in the “Choose Psychologist” section.
        </p>
        {profileMessage.error && <div className="error-message">{profileMessage.error}</div>}
        {profileMessage.success && <div className="success-message">{profileMessage.success}</div>}
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label>Short Bio / Description</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share your therapeutic style, specialties, or experience."
              style={{ minHeight: '140px' }}
            />
          </div>
          <button className="btn btn-primary" disabled={profileSaving}>
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '20px',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '10px'
        }}>
          <button
            onClick={() => setActiveTab('pending')}
            className="btn"
            style={{
              backgroundColor: activeTab === 'pending' ? '#667eea' : '#e0e0e0',
              color: activeTab === 'pending' ? 'white' : '#333'
            }}
          >
            Pending Review ({pendingSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('reviewed')}
            className="btn"
            style={{
              backgroundColor: activeTab === 'reviewed' ? '#667eea' : '#e0e0e0',
              color: activeTab === 'reviewed' ? 'white' : '#333'
            }}
          >
            My Reviewed Sessions ({mySessions.length})
          </button>
        </div>

        {activeTab === 'pending' && (
          <div>
            {pendingSessions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                No pending sessions to review.
              </p>
            ) : (
              pendingSessions.map((session) => (
                <div 
                  key={session.id} 
                  style={{ 
                    padding: '20px', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px',
                    marginBottom: '15px',
                    backgroundColor: '#fffbf0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ marginBottom: '10px', color: '#333' }}>
                        Session #{session.id} - {session.patient?.full_name || 'Patient'}
                      </h3>
                      <p style={{ color: '#666', fontSize: '14px' }}>
                        Created: {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <strong style={{ color: '#333' }}>Patient's Input:</strong>
                    <p style={{ color: '#666', marginTop: '5px' }}>{session.user_input}</p>
                  </div>

                  {session.generated_text && (
                    <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#1976d2' }}>
                          AI Generated Therapy Content (click to expand)
                        </summary>
                        <p style={{ color: '#0d47a1', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
                          {session.generated_text}
                        </p>
                      </details>
                    </div>
                  )}

                  {editingSession?.id === session.id ? (
                    <form onSubmit={handleApprove} style={{ marginTop: '20px' }}>
                      <div className="form-group">
                        <label>Edit and Approve Therapy Content:</label>
                        <textarea
                          value={approvedText}
                          onChange={(e) => setApprovedText(e.target.value)}
                          required
                          style={{ minHeight: '200px' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>Prompt-based AI revision (optional):</label>
                        <textarea
                          value={promptText}
                          onChange={(e) => setPromptText(e.target.value)}
                          placeholder="e.g., Make it more concise and add 2 grounding exercises."
                          style={{ minHeight: '120px' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                          <button
                            type="button"
                            className="btn"
                            style={{ background: '#f0f0f0', color: '#333' }}
                            disabled={promptLoading || !promptText.trim()}
                            onClick={async () => {
                              setPromptLoading(true)
                              setError('')
                              try {
                                const res = await axios.post(`/api/therapy/${editingSession.id}/prompt-generate`, {
                                  prompt: promptText,
                                  base_text: approvedText
                                })
                                const revised = res.data?.revised_text || ''
                                if (revised) {
                                  setApprovedText(revised)
                                  setSuccess('Draft updated from AI prompt.')
                                }
                              } catch (err) {
                                setError(err.response?.data?.detail || 'Failed to generate revision.')
                              } finally {
                                setPromptLoading(false)
                              }
                            }}
                          >
                            {promptLoading ? 'Generating...' : 'Generate with prompt'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setPromptText('')}
                          >
                            Clear prompt
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          type="submit" 
                          className="btn btn-success"
                          disabled={submitting}
                        >
                          {submitting ? 'Approving...' : 'Approve'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingSession(null)
                            setApprovedText('')
                            setPromptText('')
                          }}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleEdit(session)}
                        className="btn btn-primary"
                      >
                        Review & Edit
                      </button>
                      <button 
                        onClick={() => handleReject(session.id)}
                        className="btn btn-danger"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviewed' && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => {
                  const historyUrl = window.location.origin + '/psychologist/therapy-history'
                  window.open(historyUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
                }}
                className="btn"
                style={{
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📚 View All Generated Therapies
              </button>
            </div>
            {mySessions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                You haven't reviewed any sessions yet.
              </p>
            ) : (
              mySessions.map((session) => (
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
                        Session #{session.id} - {session.patient?.full_name || 'Patient'}
                      </h3>
                      <p style={{ color: '#666', fontSize: '14px' }}>
                        Approved: {session.approved_at ? new Date(session.approved_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>

                  {session.approved_text && (
                    <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '6px' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#2e7d32' }}>
                          Approved Therapy Content (click to expand)
                        </summary>
                        <p style={{ color: '#1b5e20', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
                          {session.approved_text}
                        </p>
                      </details>
                    </div>
                  )}

                  {session.status === 'approved' && (
                    <PsychologistGenerateAudio sessionId={session.id} onDone={handleAfterGenerate} />
                  )}
                  {session.audio_history && session.audio_history.length > 0 && (
                    <div style={{ marginTop: '15px', borderTop: '1px solid #e0e0e0', paddingTop: '12px' }}>
                      <h4 style={{ marginBottom: '10px' }}>Audio History</h4>
                      {session.audio_history.map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            border: '1px solid #eee',
                            borderRadius: '6px',
                            padding: '10px',
                            marginBottom: '10px',
                            background: '#f8f8f8'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <strong>{entry.provider === 'google' ? 'Voice Engine B' : 'Voice Engine A'}</strong>
                              <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
                                Generated on {new Date(entry.created_at).toLocaleString()}
                              </p>
                              {entry.sent_at ? (
                                <span style={{ color: '#2e7d32', fontWeight: 600 }}>
                                  Sent on {new Date(entry.sent_at).toLocaleString()}
                                </span>
                              ) : (
                                <span style={{ color: '#d17a00', fontWeight: 600 }}>Not sent yet</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              <button
                                className="btn btn-success"
                                disabled={!!entry.sent_at || sendingAudioId === entry.id}
                                onClick={() => sendAudioHistory(entry.id)}
                              >
                                {entry.sent_at ? 'Sent' : (sendingAudioId === entry.id ? 'Sending...' : 'Send to Patient')}
                              </button>
                            </div>
                          </div>
                          
                          {/* Audio Player Controls */}
                          <div style={{
                            marginTop: '1rem',
                            border: '1px solid var(--gray-200)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            backgroundColor: 'var(--gray-50)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                              {/* Play/Pause Button */}
                              <button
                                onClick={() => togglePlayPause(entry.id)}
                                className="btn"
                                style={{
                                  backgroundColor: 'var(--primary-500)',
                                  color: 'var(--white)',
                                  minWidth: '2.5rem',
                                  height: '2.5rem',
                                  padding: 0,
                                  borderRadius: 'var(--radius-full)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '1.125rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: 'var(--shadow-sm)'
                                }}
                              >
                                {audioStates[entry.id]?.isPlaying ? '⏸' : '▶'}
                              </button>

                              {/* Backward 10s */}
                              <button
                                onClick={() => seekBackward(entry.id)}
                                disabled={!audioStates[entry.id]?.audioUrl}
                                className="btn"
                                style={{
                                  backgroundColor: 'var(--gray-400)',
                                  color: 'var(--white)',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 'var(--radius-md)',
                                  border: 'none',
                                  cursor: audioStates[entry.id]?.audioUrl ? 'pointer' : 'not-allowed',
                                  opacity: audioStates[entry.id]?.audioUrl ? 1 : 0.6,
                                  fontSize: '0.875rem'
                                }}
                              >
                                ⏪ 10s
                              </button>

                              {/* Forward 10s */}
                              <button
                                onClick={() => seekForward(entry.id)}
                                disabled={!audioStates[entry.id]?.audioUrl}
                                className="btn"
                                style={{
                                  backgroundColor: 'var(--gray-400)',
                                  color: 'var(--white)',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: 'var(--radius-md)',
                                  border: 'none',
                                  cursor: audioStates[entry.id]?.audioUrl ? 'pointer' : 'not-allowed',
                                  opacity: audioStates[entry.id]?.audioUrl ? 1 : 0.6,
                                  fontSize: '0.875rem'
                                }}
                              >
                                10s ⏩
                              </button>

                              {/* Time Display */}
                              <span style={{ color: 'var(--gray-700)', fontSize: '0.875rem', minWidth: '6.25rem' }}>
                                {formatTime(audioStates[entry.id]?.currentTime || 0)} / {formatTime(audioStates[entry.id]?.duration || 0)}
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={audioStates[entry.id]?.duration > 0 ? ((audioStates[entry.id]?.currentTime || 0) / audioStates[entry.id].duration) * 100 : 0}
                                onChange={(e) => handleSeek(entry.id, parseFloat(e.target.value))}
                                disabled={!audioStates[entry.id]?.audioUrl}
                                style={{
                                  width: '100%',
                                  height: '0.5rem',
                                  borderRadius: 'var(--radius-full)',
                                  outline: 'none',
                                  cursor: audioStates[entry.id]?.audioUrl ? 'pointer' : 'not-allowed',
                                  backgroundColor: 'var(--gray-300)',
                                  WebkitAppearance: 'none',
                                  appearance: 'none',
                                  background: `linear-gradient(to right, var(--primary-500) ${audioStates[entry.id]?.duration > 0 ? ((audioStates[entry.id]?.currentTime || 0) / audioStates[entry.id].duration) * 100 : 0}%, var(--gray-300) ${audioStates[entry.id]?.duration > 0 ? ((audioStates[entry.id]?.currentTime || 0) / audioStates[entry.id].duration) * 100 : 0}%)`
                                }}
                              />
                            </div>
                          </div>
                          
                          {entry.voice_id && (
                            <p style={{ marginTop: '6px', color: '#555', fontSize: '13px' }}>
                              Voice: {entry.voice_id}
                            </p>
                          )}
                          {entry.instruction && (
                            <details style={{ marginTop: '6px' }}>
                              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Voice Instruction</summary>
                              <p style={{ marginTop: '4px', whiteSpace: 'pre-wrap', color: '#444' }}>
                                {entry.instruction}
                              </p>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <ChatPanel sessionId={session.id} />

                  {(session.audio_history || []).some(entry => entry.sent_at) && (
                    <div style={{ padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '6px', marginTop: '10px' }}>
                      <strong style={{ color: '#0c5460' }}>✓ At least one audio has been delivered to the patient.</strong>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PsychologistDashboard

