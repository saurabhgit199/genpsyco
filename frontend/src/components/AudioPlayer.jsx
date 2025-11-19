import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const AudioPlayer = ({ sessionId, sessionTitle, onError }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const handleError = () => {
      setIsPlaying(false)
      if (onError) onError('Error playing audio')
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl, onError])

  const loadAudio = async () => {
    if (audioUrl) return // Already loaded

    setLoading(true)
    try {
      const authToken = (typeof window !== 'undefined') ? (window.localStorage.getItem('token') || window.localStorage.getItem('authToken') || '') : ''
      const response = await axios.get(`/api/audio/${sessionId}/play`, {
        responseType: 'blob',
        headers: {
          'Accept': 'audio/*',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        }
      })
      
      const contentType = response.headers['content-type'] || 'audio/*'
      const audioBlob = new Blob([response.data], { type: contentType })
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      
      if (audioRef.current) {
        audioRef.current.src = url
      }
    } catch (err) {
      if (onError) {
        onError(err.response?.data?.detail || 'Error loading audio')
      }
    } finally {
      setLoading(false)
    }
  }

  const togglePlayPause = async () => {
    if (!audioUrl) {
      await loadAudio()
    }

    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const seekBackward = () => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10)
    }
  }

  const seekForward = () => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 10)
    }
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (audio) {
      const seekTime = (e.target.value / 100) * audio.duration
      audio.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      backgroundColor: '#fafafa',
      marginBottom: '20px'
    }}>
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: 0, color: '#333' }}>{sessionTitle}</h4>
      </div>

      <audio ref={audioRef} preload="none" />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={loading}
          className="btn"
          style={{
            backgroundColor: '#667eea',
            color: 'white',
            minWidth: '50px',
            padding: '10px 15px',
            borderRadius: '50%',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '18px'
          }}
        >
          {loading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </button>

        {/* Backward 10s */}
        <button
          onClick={seekBackward}
          disabled={!audioUrl || loading}
          className="btn"
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: (!audioUrl || loading) ? 'not-allowed' : 'pointer'
          }}
        >
          ⏪ 10s
        </button>

        {/* Forward 10s */}
        <button
          onClick={seekForward}
          disabled={!audioUrl || loading}
          className="btn"
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            cursor: (!audioUrl || loading) ? 'not-allowed' : 'pointer'
          }}
        >
          10s ⏩
        </button>

        {/* Time Display */}
        <span style={{ color: '#666', fontSize: '14px', minWidth: '100px' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: '15px' }}>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          disabled={!audioUrl || loading}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            outline: 'none',
            cursor: (!audioUrl || loading) ? 'not-allowed' : 'pointer',
            backgroundColor: '#e0e0e0'
          }}
        />
      </div>
    </div>
  )
}

export default AudioPlayer

