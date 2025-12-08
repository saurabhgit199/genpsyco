# LiveKit Voice Chat Setup Guide

This guide explains how to set up and use the LiveKit voice chat feature with Gemini integration.

## Prerequisites

1. **LiveKit Server**: You need a LiveKit server instance. You can:
   - Use [LiveKit Cloud](https://cloud.livekit.io) (free tier available)
   - Self-host using [Docker](https://docs.livekit.io/deploy/)

2. **Gemini API Key**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Environment Variables

Add these to your `.env` file in the backend directory:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Gemini API (should already be set)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL_ID=gemini-2.5-flash
GEMINI_TTS_MODEL_ID=gemini-2.5-flash-preview-tts
```

## Installation

### Backend

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Frontend

1. Install dependencies:
```bash
cd frontend
npm install
```

## Running the Application

### 1. Start the FastAPI Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the LiveKit Agent Worker

In a **separate terminal**, run:

```bash
cd backend
python run_livekit_agent.py
```

The agent worker will:
- Connect to your LiveKit server
- Wait for voice chat connections
- Handle voice interactions using Gemini

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

## Usage

1. **Start a Therapy Session**: Log in as a patient and create a new therapy session
2. **Open Chat**: The text chat interface will appear
3. **Start Voice Chat**: Click the microphone (🎤) button in the chat input area
4. **Connect**: Click "Start Voice Chat" to connect to the voice session
5. **Speak**: The AI counselor (using Gemini) will respond to your voice
6. **Mute/Unmute**: Use the mute button to toggle your microphone
7. **End Call**: Click "End Call" to disconnect

## How It Works

1. **Frontend**: When you click "Start Voice Chat", the frontend requests a LiveKit token from the backend
2. **Backend**: The `/api/livekit/token` endpoint generates a secure token for the room
3. **Connection**: The frontend connects to LiveKit using the token
4. **Agent**: The LiveKit agent worker detects the connection and starts a voice session
5. **Gemini Integration**: 
   - **STT (Speech-to-Text)**: Gemini converts your speech to text
   - **LLM**: Gemini processes the conversation and generates responses
   - **TTS (Text-to-Speech)**: Gemini converts the response back to speech
6. **Real-time**: The conversation happens in real-time with low latency

## Troubleshooting

### "LiveKit is not configured" error
- Make sure all LiveKit environment variables are set in your `.env` file
- Restart the backend server after adding environment variables

### "Failed to connect to voice chat"
- Check that the LiveKit agent worker is running
- Verify your LiveKit server URL is correct
- Ensure your API keys are valid

### No audio/voice not working
- Check browser permissions for microphone access
- Ensure your microphone is not muted in system settings
- Try refreshing the page and allowing microphone access again

### Agent not responding
- Check the agent worker logs for errors
- Verify Gemini API key is set correctly
- Ensure the agent worker is connected to the same LiveKit server

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │─────────▶│  FastAPI     │─────────▶│  LiveKit    │
│  (Frontend) │         │  Backend     │         │   Server    │
└─────────────┘         └──────────────┘         └──────┬───────┘
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │ LiveKit Agent│
                                                │   Worker     │
                                                │  (Gemini)    │
                                                └──────────────┘
```

## Notes

- The LiveKit agent worker must run as a separate process
- Voice chat works alongside text chat - you can use both simultaneously
- The agent uses the same counselor personality as the text chat
- All voice conversations are processed in real-time using Gemini

