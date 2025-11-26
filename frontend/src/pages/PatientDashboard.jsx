import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { DashboardHero, TherapyIcon, AudioIcon, NewSessionIcon } from '../assets/illustrations'
import CounselorChat from '../components/CounselorChat'
import '../App.css'

const PatientDashboard = () => {
  const { user } = useAuth()
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creatingSession, setCreatingSession] = useState(false)

  const handleStartConversation = async () => {
    setError('')
    setSuccess('')
    setCreatingSession(true)

    try {
      // Create a new therapy session in conversation mode
      const response = await axios.post('/api/therapy/create', {
        user_input: 'Starting conversation...'
      })
      setActiveSessionId(response.data.id)
      setSuccess('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start conversation')
    } finally {
      setCreatingSession(false)
    }
  }

  const handleTherapyGenerated = () => {
    setSuccess('Your therapy session has been created and sent to a psychologist for review!')
  }

  const handleBackToDashboard = () => {
    setActiveSessionId(null)
    setSuccess('Session saved! You can view it in Previous Therapies.')
  }

  return (
    <div className="container">
      {/* Header Section */}
      <div style={{
        marginBottom: '3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '2rem'
      }}>
        <div className="animate-fade-in">
          <h1 style={{
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--purple-600) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2.5rem'
          }}>
            Welcome back, {user?.full_name || 'Patient'}
          </h1>
          <p style={{
            color: 'var(--gray-600)',
            fontSize: '1.125rem',
            fontWeight: 400,
            maxWidth: '500px'
          }}>
            Your personalized generative therapy dashboard. Take a moment for yourself today.
          </p>
        </div>
        <div className="animate-float" style={{ display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>
          <DashboardHero />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Main Card */}
      <div className="card glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>✨</span>
          {activeSessionId ? 'Therapy Conversation' : 'Start Your Journey'}
        </h2>

        {activeSessionId ? (
          <div>
            <CounselorChat
              sessionId={activeSessionId}
              onTherapyGenerated={handleTherapyGenerated}
            />
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                onClick={handleBackToDashboard}
                className="btn btn-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{
              margin: '0 auto 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <NewSessionIcon />
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
              Start a conversation with our AI counselor who will listen to your concerns and help create personalized therapy content for you.
            </p>
            <button
              onClick={handleStartConversation}
              className="btn btn-primary"
              disabled={creatingSession}
              style={{
                fontSize: '1rem',
                padding: '1rem 2.5rem',
                borderRadius: 'var(--radius-lg)'
              }}
            >
              {creatingSession ? 'Starting...' : '💬 Start Conversation with AI Counselor'}
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
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  textDecoration: 'none',
                  color: 'var(--gray-900)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '1rem'
                }}
              >
                <TherapyIcon />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Previous Therapies</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>View your therapy history</div>
                </div>
              </a>

              <a
                href="/patient/audio-library"
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  textDecoration: 'none',
                  color: 'var(--gray-900)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '1rem'
                }}
              >
                <AudioIcon />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Audio Library</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Listen to therapy sessions</div>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PatientDashboard

