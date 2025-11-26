import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../App.css';

const CounselorChat = ({ sessionId, onTherapyGenerated }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [therapyGenerated, setTherapyGenerated] = useState(false);
    const [therapyGenerating, setTherapyGenerating] = useState(false);
    const [typingIndicator, setTypingIndicator] = useState(false);
    const messagesEndRef = useRef(null);
    const statusCheckInterval = useRef(null);

    // Auto-scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, typingIndicator]);

    // Load existing messages when component mounts
    useEffect(() => {
        loadMessages();
        checkTherapyStatus();
        
        // Poll for therapy status every 3 seconds
        statusCheckInterval.current = setInterval(() => {
            checkTherapyStatus();
        }, 3000);
        
        return () => {
            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }
        };
    }, [sessionId]);

    const loadMessages = async () => {
        try {
            const response = await axios.get(`/api/chat/${sessionId}`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const checkTherapyStatus = async () => {
        try {
            const response = await axios.get(`/api/chat/${sessionId}/status`);
            const { therapy_generated, therapy_generating } = response.data;
            
            if (therapy_generated) {
                setTherapyGenerated(true);
                setTherapyGenerating(false);
                if (onTherapyGenerated) {
                    onTherapyGenerated();
                }
                // Stop polling once therapy is generated
                if (statusCheckInterval.current) {
                    clearInterval(statusCheckInterval.current);
                    statusCheckInterval.current = null;
                }
            } else if (therapy_generating) {
                setTherapyGenerating(true);
            } else {
                setTherapyGenerating(false);
            }
        } catch (error) {
            console.error('Error checking therapy status:', error);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || loading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setLoading(true);
        setTypingIndicator(true);

        try {
            // Send message to backend
            const response = await axios.post(`/api/chat/${sessionId}`, {
                content: userMessage
            });

            // Reload all messages to get the latest (including AI response)
            await loadMessages();

            // Check if therapy was generated
            await checkTherapyStatus();

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setLoading(false);
            setTypingIndicator(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '600px',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--white)',
            overflow: 'hidden'
        }}>
            {/* Therapy Generation Status Banners */}
            {therapyGenerating && !therapyGenerated && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--primary-50)',
                    borderBottom: '1px solid var(--primary-200)',
                    textAlign: 'center',
                    color: 'var(--primary-700)',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                }}>
                    <div className="typing-indicator" style={{ display: 'flex', gap: '0.25rem' }}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span>Generating personalized therapy content based on our conversation...</span>
                </div>
            )}
            
            {therapyGenerated && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'var(--green-50)',
                    borderBottom: '1px solid var(--green-200)',
                    textAlign: 'center',
                    color: 'var(--green-700)',
                    fontWeight: 600
                }}>
                    ✨ Therapy content has been generated and sent for psychologist review! You can continue our conversation if you'd like.
                </div>
            )}

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                {/* Welcome Message */}
                {messages.length === 0 && (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--gray-600)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌸</div>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--gray-900)' }}>
                            Welcome to your therapy session
                        </h3>
                        <p>I'm here to listen and support you. Feel free to share what's on your mind.</p>
                    </div>
                )}

                {/* Message Bubbles */}
                {messages.map((msg, index) => (
                    <div
                        key={msg.id || index}
                        style={{
                            display: 'flex',
                            justifyContent: msg.is_ai_message ? 'flex-start' : 'flex-end',
                            animation: 'fadeIn 0.3s ease-in'
                        }}
                    >
                        <div
                            style={{
                                maxWidth: '70%',
                                padding: '0.875rem 1.125rem',
                                borderRadius: msg.is_ai_message ? '1rem 1rem 1rem 0.25rem' : '1rem 1rem 0.25rem 1rem',
                                backgroundColor: msg.is_ai_message
                                    ? 'var(--gray-100)'
                                    : 'linear-gradient(135deg, var(--primary-500) 0%, var(--purple-500) 100%)',
                                color: msg.is_ai_message ? 'var(--gray-900)' : 'var(--white)',
                                boxShadow: 'var(--shadow-sm)',
                                wordWrap: 'break-word'
                            }}
                        >
                            {msg.is_ai_message && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    opacity: 0.7,
                                    marginBottom: '0.25rem',
                                    fontWeight: 600
                                }}>
                                    AI Counselor
                                </div>
                            )}
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {typingIndicator && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            padding: '0.875rem 1.125rem',
                            borderRadius: '1rem 1rem 1rem 0.25rem',
                            backgroundColor: 'var(--gray-100)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
                onSubmit={sendMessage}
                style={{
                    padding: '1rem',
                    borderTop: '1px solid var(--gray-200)',
                    backgroundColor: 'var(--gray-50)',
                    display: 'flex',
                    gap: '0.75rem'
                }}
            >
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Share your thoughts..."
                    disabled={loading}
                    style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        border: '2px solid var(--gray-200)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9375rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-400)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--gray-200)'}
                />
                <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="btn btn-primary"
                    style={{
                        padding: '0.75rem 1.5rem',
                        opacity: (loading || !inputMessage.trim()) ? 0.5 : 1
                    }}
                >
                    {loading ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
};

export default CounselorChat;
