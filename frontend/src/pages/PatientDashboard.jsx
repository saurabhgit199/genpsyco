import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import '../App.css'

const PatientDashboard = () => {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('English')
  const [languages, setLanguages] = useState([])
  const [loadingLanguages, setLoadingLanguages] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (showForm) {
      fetchLanguages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm])

  const fetchLanguages = async () => {
    setLoadingLanguages(true)
    try {
      const response = await axios.get('/api/therapy/languages')
      setLanguages(response.data.languages || [])
    } catch (err) {
      console.error('Error fetching languages:', err)
      // Set default languages if API fails
      setLanguages([
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' }
      ])
    } finally {
      setLoadingLanguages(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await axios.post('/api/therapy/create', { 
        user_input: userInput,
        language: selectedLanguage
      })
      setSuccess('Therapy session created successfully! It will be reviewed by a psychologist. You can view it in Previous Therapies.')
      setUserInput('')
      setSelectedLanguage('English')
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create therapy session')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      {/* Header Section */}
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
          Welcome back, {user?.full_name || 'Patient'}
        </h1>
        <p style={{ 
          color: 'var(--gray-600)', 
          fontSize: '1.125rem',
          fontWeight: 400
        }}>
          Your personalized mental health therapy dashboard
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Main Card */}
      <div className="card">
        <h2 style={{ marginBottom: '2rem' }}>Create New Therapy Session</h2>

        {showForm ? (
          <form onSubmit={handleSubmit} style={{ 
            padding: '2rem', 
            backgroundColor: 'var(--gray-50)', 
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--gray-200)'
          }}>
            <div className="form-group">
              <label>Describe your mental health concerns</label>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                required
                placeholder="Share your thoughts, feelings, and concerns. This will help generate personalized therapy content for you."
                style={{ minHeight: '200px' }}
              />
            </div>
            <div className="form-group">
              <label>Select Language for Therapy Content</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={loadingLanguages}
                style={{ 
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid var(--gray-200)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9375rem',
                  backgroundColor: 'var(--white)',
                  color: 'var(--gray-900)',
                  cursor: loadingLanguages ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingLanguages ? (
                  <option>Loading languages...</option>
                ) : languages.length > 0 ? (
                  languages.map((lang) => (
                    <option key={lang.code} value={lang.name}>
                      {lang.name}
                    </option>
                  ))
                ) : (
                  <option value="English">English</option>
                )}
              </select>
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'var(--gray-500)', 
                marginTop: '0.5rem',
                marginBottom: 0
              }}>
                The therapy content will be generated in the selected language
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Creating Session...' : 'Create Therapy Session'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setUserInput('')
                  setSelectedLanguage('English')
                  setError('')
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 2rem',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--purple-100) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem'
            }}>
              ✨
            </div>
            <h3 style={{ 
              marginBottom: '1rem',
              color: 'var(--gray-900)'
            }}>
              Ready to start your journey?
            </h3>
            <p style={{ 
              color: 'var(--gray-600)', 
              fontSize: '1.125rem', 
              marginBottom: '2.5rem',
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.7
            }}>
              Share your thoughts and concerns, and we'll generate personalized therapy content tailored just for you.
            </p>
            <button 
              onClick={() => setShowForm(true)} 
              className="btn btn-primary"
              style={{ 
                fontSize: '1rem', 
                padding: '1rem 2.5rem',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              + Create New Therapy Session
            </button>
            
            {/* Quick Access Cards */}
            <div style={{ 
              marginTop: '3rem', 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem'
            }}>
              <a 
                href="/patient/therapies"
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--primary-50)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--primary-200)',
                  textDecoration: 'none',
                  color: 'var(--gray-900)',
                  transition: 'all var(--transition-base)',
                  display: 'block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Previous Therapies</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>View your therapy history</div>
              </a>
              
              <a 
                href="/patient/audio-library"
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--purple-50)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--purple-200)',
                  textDecoration: 'none',
                  color: 'var(--gray-900)',
                  transition: 'all var(--transition-base)',
                  display: 'block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Audio Library</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Listen to therapy sessions</div>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientDashboard

