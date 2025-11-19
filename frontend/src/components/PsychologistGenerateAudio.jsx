import { useEffect, useState } from 'react'
import axios from 'axios'

const PROVIDERS = [
  { id: 'elevenlabs', label: 'Voice Engine A' },
  { id: 'google', label: 'Voice Engine B' }
]

const VOICE_INSTRUCTION = `“Read aloud in a slow, calming, meditative female voice.

Keep the tone warm, gentle, and soothing, as if guiding someone through a healing therapy session.

Maintain soft pauses and relaxed breathing throughout.”`

const getVoiceStorageKey = (sessionId, provider) => `voice_for_session_${sessionId}_${provider}`
const getInstructionStorageKey = (sessionId) => `instruction_for_session_${sessionId}_google`

const PsychologistGenerateAudio = ({ sessionId, onDone }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [voices, setVoices] = useState([])
  const [showVoiceSection, setShowVoiceSection] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('')
  const [fetchingVoices, setFetchingVoices] = useState(false)
  const [provider, setProvider] = useState('elevenlabs')
  const [googleInstruction, setGoogleInstruction] = useState(() => {
    if (typeof window === 'undefined') return VOICE_INSTRUCTION
    return window.localStorage.getItem(getInstructionStorageKey(sessionId)) || VOICE_INSTRUCTION
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedVoice = window.localStorage.getItem(getVoiceStorageKey(sessionId, provider))
    setSelectedVoice(savedVoice || '')
    const savedInstruction = window.localStorage.getItem(getInstructionStorageKey(sessionId))
    setGoogleInstruction(savedInstruction || VOICE_INSTRUCTION)
  }, [sessionId, provider])

  const loadVoices = async (selectedProvider) => {
    setFetchingVoices(true)
    setError('')
    try {
      const res = await axios.get(`/api/audio/voices?provider=${selectedProvider}`)
      setVoices(res.data.voices || [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to fetch voices.')
    } finally {
      setFetchingVoices(false)
    }
  }

  const openVoiceSection = async () => {
    if (!showVoiceSection) {
      setShowVoiceSection(true)
      await loadVoices(provider)
    } else {
      setShowVoiceSection(false)
    }
  }

  const handleProviderChange = async (nextProvider) => {
    setProvider(nextProvider)
    if (typeof window !== 'undefined') {
      const savedVoice = window.localStorage.getItem(getVoiceStorageKey(sessionId, nextProvider))
      setSelectedVoice(savedVoice || '')
    } else {
      setSelectedVoice('')
    }
    await loadVoices(nextProvider)
  }

  const generate = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await axios.post(`/api/audio/generate/${sessionId}`, {
        voice_id: selectedVoice || null,
        provider,
        instruction: provider === 'google' ? googleInstruction : undefined
      })
      if (selectedVoice) {
        window.localStorage.setItem(getVoiceStorageKey(sessionId, provider), selectedVoice)
      }
      if (provider === 'google') {
        window.localStorage.setItem(getInstructionStorageKey(sessionId), googleInstruction)
      }
      setSuccess('Audio generated successfully!')
      setShowVoiceSection(false)
      onDone && onDone()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate audio.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: 'var(--gray-700)', fontSize: '0.9375rem' }}>Audio Provider:</span>
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            className="btn"
            onClick={() => handleProviderChange(p.id)}
            style={{
              background: provider === p.id 
                ? 'linear-gradient(135deg, var(--primary-500) 0%, var(--purple-500) 100%)' 
                : 'var(--gray-100)',
              color: provider === p.id ? 'var(--white)' : 'var(--gray-700)',
              border: provider === p.id ? 'none' : '1px solid var(--gray-300)',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              transition: 'all var(--transition-base)'
            }}
            disabled={loading || showVoiceSection}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button 
        className="btn btn-success" 
        onClick={openVoiceSection} 
        disabled={loading}
        style={{
          marginBottom: showVoiceSection ? '1.5rem' : '0'
        }}
      >
        {loading ? 'Generating Audio...' : showVoiceSection ? 'Hide Voice Selection' : `Generate Audio (${PROVIDERS.find(p => p.id === provider)?.label || ''})`}
      </button>

      {showVoiceSection && (
        <div 
          className="card"
          style={{
            marginTop: '1.5rem',
            padding: '2rem',
            backgroundColor: 'var(--white)',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '0.5rem',
              color: 'var(--gray-900)',
              fontSize: '1.25rem',
              fontWeight: 600
            }}>
              Select Voice for Audio Generation
            </h3>
            <p style={{ 
              margin: 0, 
              color: 'var(--gray-600)', 
              fontSize: '0.875rem' 
            }}>
              Choose a voice from {provider === 'google' ? 'Voice Engine B' : 'Voice Engine A'} to generate your therapy audio
            </p>
          </div>
          {provider === 'google' && (
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: 600, 
                color: 'var(--gray-700)',
                fontSize: '0.9375rem'
              }}>
                Voice Instruction
              </label>
              <textarea
                value={googleInstruction}
                onChange={(e) => setGoogleInstruction(e.target.value)}
                placeholder="Provide guidance for tone, pace, etc."
                style={{ 
                  minHeight: '120px',
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9375rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <p style={{ 
                fontSize: '0.8125rem', 
                color: 'var(--gray-500)', 
                marginTop: '0.5rem',
                marginBottom: 0
              }}>
                💡 Tip: Describe tone, pacing, or imagery you want the AI to convey.
              </p>
            </div>
          )}

          {fetchingVoices ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 1rem',
              color: 'var(--gray-600)'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
              <p style={{ margin: 0 }}>Loading voices...</p>
            </div>
          ) : voices.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 1rem',
              color: 'var(--gray-600)'
            }}>
              <p style={{ margin: 0 }}>No voices available. Please try again.</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              {voices.map(v => (
                <div 
                  key={v.id} 
                  style={{ 
                    border: selectedVoice === v.id 
                      ? '2px solid var(--primary-500)' 
                      : '1px solid var(--gray-200)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '1.25rem',
                    backgroundColor: selectedVoice === v.id ? 'var(--primary-50)' : 'var(--white)',
                    transition: 'all var(--transition-base)',
                    cursor: 'pointer',
                    boxShadow: selectedVoice === v.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                  }}
                  onClick={() => setSelectedVoice(v.id)}
                  onMouseEnter={(e) => {
                    if (selectedVoice !== v.id) {
                      e.currentTarget.style.backgroundColor = 'var(--gray-50)'
                      e.currentTarget.style.borderColor = 'var(--primary-300)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedVoice !== v.id) {
                      e.currentTarget.style.backgroundColor = 'var(--white)'
                      e.currentTarget.style.borderColor = 'var(--gray-200)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                    }
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    marginBottom: '0.75rem' 
                  }}>
                    <strong style={{ 
                      color: 'var(--gray-900)',
                      fontSize: '0.9375rem',
                      fontWeight: 600
                    }}>
                      {v.name || v.id}
                    </strong>
                    <input
                      type="radio"
                      name={`voice-${sessionId}`}
                      value={v.id}
                      checked={selectedVoice === v.id}
                      onChange={() => setSelectedVoice(v.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ 
                        cursor: 'pointer',
                        width: '1.125rem',
                        height: '1.125rem',
                        accentColor: 'var(--primary-500)'
                      }}
                    />
                  </div>
                  {v.preview_url && (
                    <audio 
                      controls 
                      style={{ 
                        width: '100%', 
                        marginTop: '0.5rem',
                        outline: 'none',
                        height: '2rem'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <source src={v.preview_url} type="audio/mpeg" />
                    </audio>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '0.75rem', 
            marginTop: '1.5rem', 
            paddingTop: '1.5rem', 
            borderTop: '1px solid var(--gray-200)' 
          }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowVoiceSection(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={generate} 
              disabled={loading || fetchingVoices || !selectedVoice}
            >
              {loading ? 'Generating...' : 'Generate with Selected Voice'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PsychologistGenerateAudio


