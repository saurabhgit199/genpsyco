import { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant } from 'livekit-client';
import axios from 'axios';
import '../App.css';

const VoiceChat = ({ sessionId, onClose }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const roomRef = useRef(null);
    const audioTracksRef = useRef([]);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            disconnect();
        };
    }, []);

    const disconnect = async () => {
        if (roomRef.current) {
            try {
                await roomRef.current.disconnect();
            } catch (err) {
                console.error('Error disconnecting:', err);
            }
            roomRef.current = null;
        }
        setIsConnected(false);
        setIsMuted(false);
    };

    const connect = async () => {
        if (isConnecting || isConnected) return;

        setIsConnecting(true);
        setError(null);

        try {
            // Get LiveKit token from backend
            const tokenResponse = await axios.post('/api/livekit/token', {
                room_name: `therapy-session-${sessionId}`,
                session_id: sessionId
            });

            const { token, url, room_name } = tokenResponse.data;

            // Create and connect to room
            const room = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            // Set up event listeners
            room.on(RoomEvent.Connected, () => {
                console.log('Connected to LiveKit room');
                setIsConnected(true);
                setIsConnecting(false);
            });

            room.on(RoomEvent.Disconnected, () => {
                console.log('Disconnected from LiveKit room');
                setIsConnected(false);
            });

            room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === 'audio') {
                    const audioElement = track.attach();
                    audioElement.setAttribute('playsinline', 'true');
                    audioElement.setAttribute('autoplay', 'true');
                    document.body.appendChild(audioElement);
                    audioTracksRef.current.push(audioElement);
                }
            });

            room.on(RoomEvent.TrackUnsubscribed, (track) => {
                track.detach();
            });

            room.on(RoomEvent.ParticipantConnected, (participant) => {
                console.log('Participant connected:', participant.identity);
            });

            // Connect to room
            await room.connect(url, token);

            // Enable microphone
            await room.localParticipant.setMicrophoneEnabled(true);

            roomRef.current = room;
        } catch (err) {
            console.error('Error connecting to LiveKit:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to connect to voice chat');
            setIsConnecting(false);
        }
    };

    const toggleMute = async () => {
        if (!roomRef.current) return;

        try {
            const newMutedState = !isMuted;
            await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
            setIsMuted(newMutedState);
        } catch (err) {
            console.error('Error toggling mute:', err);
        }
    };

    const handleDisconnect = async () => {
        await disconnect();
        if (onClose) {
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '300px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: '20px',
            zIndex: 1000
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
            }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--gray-900)' }}>
                    Voice Chat
                </h3>
                <button
                    onClick={handleDisconnect}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: 'var(--gray-600)'
                    }}
                >
                    ×
                </button>
            </div>

            {error && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#fee',
                    color: '#c33',
                    borderRadius: '6px',
                    marginBottom: '15px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {!isConnected ? (
                    <button
                        onClick={connect}
                        disabled={isConnecting}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: isConnecting ? 'var(--gray-400)' : 'var(--primary-600)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isConnecting ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            fontWeight: 600
                        }}
                    >
                        {isConnecting ? 'Connecting...' : 'Start Voice Chat'}
                    </button>
                ) : (
                    <>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px',
                            backgroundColor: isMuted ? '#fee' : '#efe',
                            borderRadius: '6px'
                        }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: isMuted ? '#c33' : '#3c3',
                                animation: isMuted ? 'none' : 'pulse 2s infinite'
                            }} />
                            <span style={{ fontSize: '14px', color: 'var(--gray-700)' }}>
                                {isMuted ? 'Microphone Muted' : 'Connected & Listening'}
                            </span>
                        </div>
                        <button
                            onClick={toggleMute}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: isMuted ? 'var(--primary-600)' : 'var(--gray-600)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 600
                            }}
                        >
                            {isMuted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                            onClick={handleDisconnect}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#c33',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 600
                            }}
                        >
                            End Call
                        </button>
                    </>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default VoiceChat;

