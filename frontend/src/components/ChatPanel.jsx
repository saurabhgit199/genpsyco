import { useEffect, useState } from 'react'
import axios from 'axios'

const ChatPanel = ({ sessionId }) => {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await axios.get(`/api/chat/${sessionId}`)
      setMessages(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load messages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // simple polling
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      await axios.post(`/api/chat/${sessionId}`, { content: text.trim() })
      setText('')
      await load()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '10px' }}>
      <h4 style={{ marginBottom: '10px' }}>Chat</h4>
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="loading">Loading chat...</div>
      ) : (
        <>
          <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#fff', border: '1px solid #eee', borderRadius: '6px', padding: '10px', marginBottom: '10px' }}>
            {messages.length === 0 ? (
              <div style={{ color: '#666' }}>No messages yet.</div>
            ) : (
              messages.map(m => (
                <div key={m.id} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#999' }}>{new Date(m.created_at).toLocaleString()}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={send} style={{ display: 'flex', gap: '8px' }}>
            <input
              placeholder="Type your message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '6px' }}
            />
            <button className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default ChatPanel


