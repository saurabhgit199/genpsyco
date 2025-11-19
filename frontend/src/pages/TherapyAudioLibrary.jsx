import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import '../App.css'

const TherapyAudioLibrary = () => {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedEntries, setExpandedEntries] = useState(new Set())
  const [audioStates, setAudioStates] = useState({}) // { entryId: { isPlaying, currentTime, duration, audioUrl, audioRef } }
  const audioRefs = useRef({}) // Store audio element refs
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null) // Track which audio is currently playing

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await axios.get('/api/therapy/my-sessions')
      const historyItems = []
      response.data.forEach((session) => {
        if (session.audio_history && session.audio_history.length > 0) {
          session.audio_history.forEach((entry) => {
            if (entry.sent_at) {
              historyItems.push({
                ...entry,
                sessionId: session.id,
                sessionCreatedAt: session.created_at,
                approvedText: session.approved_text,
              })
            }
          })
        }
      })
      historyItems.sort(
        (a, b) => new Date(b.sent_at || b.created_at) - new Date(a.sent_at || a.created_at)
      )
      setEntries(historyItems)
    } catch (err) {
      console.error('Error fetching sessions:', err)
      setError('Failed to load therapy audio library')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (entryId) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) newExpanded.delete(entryId)
    else newExpanded.add(entryId)
    setExpandedEntries(newExpanded)
  }

  const loadAudio = async (entryId) => {
    const currentState = audioStates[entryId]
    if (currentState?.audioUrl) return // Already loaded

    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in again to play audio.')
        return
      }

      const response = await axios.get(`/api/audio/history/${entryId}/play`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Normalize content type for WAV files (handle various MIME types)
      let contentType = response.headers['content-type'] || 'audio/mpeg'
      const isWav = contentType.includes('wav') || contentType === 'audio/wave' || contentType === 'audio/x-wav' || contentType === 'audio/wav'
      
      // For WAV files, try the official RFC MIME type first
      if (isWav) {
        contentType = 'audio/wave' // RFC standard MIME type
      }
      
      const audioBlob = new Blob([response.data], { type: contentType })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      audioRefs.current[entryId] = audio

      // Add comprehensive error handler for audio loading issues
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
              errorMsg = 'Audio decoding error. The file format may not be supported.'
              break
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMsg = 'Audio format not supported by your browser.'
              break
            default:
              errorMsg = `Audio error (code: ${error.code}). The file format may not be supported.`
          }
        }
        
        console.error('Audio loading error:', {
          error: error,
          errorCode: error?.code,
          contentType: contentType,
          blobSize: audioBlob.size,
          blobType: audioBlob.type,
          audioSrc: audio.src.substring(0, 50) + '...'
        })
        
        // If WAV failed, try with different MIME types or no MIME type
        if (isWav) {
          const retryTypes = ['audio/x-wav', 'audio/wav', '']
          let retryIndex = 0
          
          const tryNextRetry = () => {
            if (retryIndex >= retryTypes.length) {
              setError(errorMsg + ` (Tried: audio/wave, audio/x-wav, audio/wav, auto-detect)`)
              return
            }
            
            const retryType = retryTypes[retryIndex]
            console.log(`Retrying with MIME type: ${retryType || 'auto-detect (no MIME type)'}...`)
            const retryBlob = new Blob([response.data], retryType ? { type: retryType } : {})
            const retryUrl = URL.createObjectURL(retryBlob)
            const retryAudio = new Audio(retryUrl)
            
            // Set up all event listeners for retry audio
            retryAudio.addEventListener('loadedmetadata', () => {
              // Success with retry - replace the original audio
              URL.revokeObjectURL(audioUrl)
              audioRefs.current[entryId] = retryAudio
              setAudioStates(prev => ({
                ...prev,
                [entryId]: {
                  ...prev[entryId],
                  audioUrl: retryUrl,
                  duration: retryAudio.duration
                }
              }))
            })

            retryAudio.addEventListener('timeupdate', () => {
              setAudioStates(prev => ({
                ...prev,
                [entryId]: {
                  ...prev[entryId],
                  currentTime: retryAudio.currentTime
                }
              }))
            })

            retryAudio.addEventListener('ended', () => {
              setCurrentlyPlayingId(null)
              setAudioStates(prev => ({
                ...prev,
                [entryId]: {
                  ...prev[entryId],
                  isPlaying: false,
                  currentTime: 0
                }
              }))
            })

            retryAudio.addEventListener('play', () => {
              // Stop any other currently playing audio
              if (currentlyPlayingId && currentlyPlayingId !== entryId) {
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
              setCurrentlyPlayingId(entryId)
              setAudioStates(prev => ({
                ...prev,
                [entryId]: {
                  ...prev[entryId],
                  isPlaying: true
                }
              }))
            })

            retryAudio.addEventListener('pause', () => {
              if (currentlyPlayingId === entryId) {
                setCurrentlyPlayingId(null)
              }
              setAudioStates(prev => ({
                ...prev,
                [entryId]: {
                  ...prev[entryId],
                  isPlaying: false
                }
              }))
            })
            
            retryAudio.addEventListener('error', () => {
              URL.revokeObjectURL(retryUrl)
              retryIndex++
              tryNextRetry() // Try next MIME type
            })
            
            retryAudio.load()
          }
          
          tryNextRetry() // Start the retry chain
          return
        }
        
        setError(errorMsg)
      })

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setAudioStates(prev => ({
          ...prev,
          [entryId]: {
            ...prev[entryId],
            duration: audio.duration
          }
        }))
      })

      audio.addEventListener('timeupdate', () => {
        setAudioStates(prev => ({
          ...prev,
          [entryId]: {
            ...prev[entryId],
            currentTime: audio.currentTime
          }
        }))
      })

      audio.addEventListener('ended', () => {
        setCurrentlyPlayingId(null)
        setAudioStates(prev => ({
          ...prev,
          [entryId]: {
            ...prev[entryId],
            isPlaying: false,
            currentTime: 0
          }
        }))
      })

      audio.addEventListener('play', () => {
        // Stop any other currently playing audio
        if (currentlyPlayingId && currentlyPlayingId !== entryId) {
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
        setCurrentlyPlayingId(entryId)
        setAudioStates(prev => ({
          ...prev,
          [entryId]: {
            ...prev[entryId],
            isPlaying: true
          }
        }))
      })

      audio.addEventListener('pause', () => {
        if (currentlyPlayingId === entryId) {
          setCurrentlyPlayingId(null)
        }
        setAudioStates(prev => ({
          ...prev,
          [entryId]: {
            ...prev[entryId],
            isPlaying: false
          }
        }))
      })

      setAudioStates(prev => ({
        ...prev,
        [entryId]: {
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

  const togglePlayPause = async (entryId) => {
    // Stop any currently playing audio (if different from the one being clicked)
    if (currentlyPlayingId && currentlyPlayingId !== entryId) {
      const currentAudio = audioRefs.current[currentlyPlayingId]
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause()
        setAudioStates(prev => ({
          ...prev,
          [currentlyPlayingId]: {
            ...prev[currentlyPlayingId],
            isPlaying: false
          }
        }))
      }
    }

    let audio = audioRefs.current[entryId]
    if (!audio) {
      await loadAudio(entryId)
      // Wait for audio to be created and ready
      const checkAudio = () => {
        audio = audioRefs.current[entryId]
        if (audio) {
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            setCurrentlyPlayingId(entryId)
            audio.play().catch((err) => {
              console.error('Audio play error:', err)
              setError('Unable to play audio. Please try again.')
              setCurrentlyPlayingId(null)
            })
          } else {
            audio.addEventListener('canplay', () => {
              setCurrentlyPlayingId(entryId)
              audio.play().catch((err) => {
                console.error('Audio play error:', err)
                setError('Unable to play audio. Please try again.')
                setCurrentlyPlayingId(null)
              })
            }, { once: true })
          }
        } else {
          setTimeout(checkAudio, 50)
        }
      }
      checkAudio()
      return
    }

    if (audioStates[entryId]?.isPlaying) {
      audio.pause()
      setCurrentlyPlayingId(null)
    } else {
      setCurrentlyPlayingId(entryId)
      audio.play().catch((err) => {
        console.error('Audio play error:', err)
        setError('Unable to play audio. Please try again.')
        setCurrentlyPlayingId(null)
      })
    }
  }

  const seekBackward = (entryId) => {
    const audio = audioRefs.current[entryId]
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10)
    }
  }

  const seekForward = (entryId) => {
    const audio = audioRefs.current[entryId]
    if (audio) {
      const duration = audioStates[entryId]?.duration || audio.duration || 0
      audio.currentTime = Math.min(duration, audio.currentTime + 10)
    }
  }

  const handleSeek = (entryId, value) => {
    const audio = audioRefs.current[entryId]
    if (audio) {
      const duration = audioStates[entryId]?.duration || audio.duration || 0
      audio.currentTime = (value / 100) * duration
    }
  }

  const formatTime = (seconds) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
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

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading therapy audio library...</div>
      </div>
    )
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
          Therapy Audio Library
        </h1>
        <p style={{ 
          color: 'var(--gray-600)', 
          fontSize: '1.125rem',
          fontWeight: 400
        }}>
          Access and play all your therapy audio sessions
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              No audio therapy sessions available yet.
            </p>
            <p style={{ color: '#999', fontSize: '14px' }}>
              Audio will appear here once your psychologist generates it for approved sessions.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ 
              marginBottom: '20px', 
              padding: '15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '6px' 
            }}>
              <p style={{ margin: 0, color: '#1976d2', fontSize: '14px' }}>
                📚 You have {entries.length} delivered audio therapy session{entries.length !== 1 ? 's' : ''} available
              </p>
            </div>

            {entries.map((entry) => {
              const isExpanded = expandedEntries.has(entry.id)
              return (
                <div 
                  key={entry.id}
                  style={{ 
                    padding: '15px', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px',
                    marginBottom: '15px',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <div>
                        <strong style={{ color: '#333' }}>
                          Session #{entry.session_id} • {entry.provider === 'google' ? 'Voice Engine B' : 'Voice Engine A'}
                        </strong>
                        <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
                          Delivered on {entry.sent_at ? new Date(entry.sent_at).toLocaleString() : new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Audio Player Controls */}
                    <div style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: '#f8f9fa'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {/* Play/Pause Button */}
                        <button
                          onClick={() => togglePlayPause(entry.id)}
                          className="btn"
                          style={{
                            backgroundColor: '#667eea',
                            color: 'white',
                            minWidth: '50px',
                            padding: '10px 15px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '18px'
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
                            backgroundColor: '#6c757d',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: audioStates[entry.id]?.audioUrl ? 'pointer' : 'not-allowed',
                            opacity: audioStates[entry.id]?.audioUrl ? 1 : 0.6
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
                            backgroundColor: '#6c757d',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: audioStates[entry.id]?.audioUrl ? 'pointer' : 'not-allowed',
                            opacity: audioStates[entry.id]?.audioUrl ? 1 : 0.6
                          }}
                        >
                          10s ⏩
                        </button>

                        {/* Time Display */}
                        <span style={{ color: '#666', fontSize: '14px', minWidth: '100px' }}>
                          {formatTime(audioStates[entry.id]?.currentTime || 0)} / {formatTime(audioStates[entry.id]?.duration || 0)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={audioStates[entry.id]?.duration > 0 
                            ? (audioStates[entry.id].currentTime / audioStates[entry.id].duration) * 100 
                            : 0}
                          onChange={(e) => handleSeek(entry.id, parseFloat(e.target.value))}
                          disabled={!audioStates[entry.id]?.audioUrl}
                          style={{
                            width: '100%',
                            height: '8px',
                            borderRadius: '4px',
                            outline: 'none',
                            cursor: audioStates[entry.id]?.audioUrl ? 'pointer' : 'not-allowed',
                            backgroundColor: '#e0e0e0'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {entry.voice_id && (
                    <p style={{ color: '#555', fontSize: '13px' }}>
                      Voice: {entry.voice_id}
                    </p>
                  )}

                  {entry.instruction && (
                    <details
                      open={isExpanded}
                      style={{ marginTop: '10px' }}
                    >
                      <summary
                        style={{
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: '#2e7d32'
                        }}
                          onClick={(e) => {
                            e.preventDefault()
                            toggleExpand(entry.id)
                          }}
                      >
                        {isExpanded ? '▼' : '▶'} Voice Instruction
                      </summary>
                      <p style={{ color: '#1b5e20', whiteSpace: 'pre-wrap', marginTop: '8px' }}>
                        {entry.instruction}
                      </p>
                    </details>
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

export default TherapyAudioLibrary

