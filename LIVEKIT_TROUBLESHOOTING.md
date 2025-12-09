# LiveKit Voice Chat Troubleshooting Guide

## Common Issues and Solutions

### 1. "LiveKit package is not installed" Error

**Problem**: Backend returns 503 error saying LiveKit package is not installed.

**Solution**:
```bash
cd backend
pip install livekit livekit-agents livekit-plugins-gemini livekit-plugins-openai
```

Or install from requirements.txt:
```bash
pip install -r requirements.txt
```

### 2. "LiveKit is not configured" Error

**Problem**: Backend returns 500 error saying LiveKit is not configured.

**Solution**: Add these environment variables to your `.env` file or Render environment:

```env
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
GEMINI_API_KEY=your-gemini-key
```

**Where to get LiveKit credentials**:
- Sign up at [LiveKit Cloud](https://cloud.livekit.io) (free tier available)
- Or self-host using [Docker](https://docs.livekit.io/deploy/)

### 3. "Failed to connect to voice chat" Error

**Problem**: Frontend shows connection error when trying to start voice chat.

**Possible Causes**:
1. **LiveKit Agent Worker not running** (MOST COMMON)
   - The agent worker must run as a separate process
   - Solution: Run `python backend/run_livekit_agent.py` in a separate terminal

2. **Wrong LiveKit URL**
   - Make sure `LIVEKIT_URL` uses `wss://` (not `https://`)
   - Example: `wss://your-project.livekit.cloud`

3. **Invalid API keys**
   - Verify your LiveKit API key and secret are correct
   - Check they match your LiveKit server/cloud account

4. **Network/CORS issues**
   - Ensure your LiveKit server allows connections from your domain
   - Check browser console for CORS errors

### 4. "Requested device not found" Error

**Problem**: Browser console shows `NotFoundError: Requested device not found`.

**Solution**:
- This happens when no microphone is available
- Grant microphone permissions in browser settings
- Check system microphone settings
- Try on a device with a microphone

### 5. Agent Not Responding / No Voice Output

**Problem**: Connected but agent doesn't speak or respond.

**Possible Causes**:
1. **Agent worker not running**
   - Check if `run_livekit_agent.py` is running
   - Look for "Agent connected to room" in logs

2. **Gemini API key missing or invalid**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check agent worker logs for Gemini errors

3. **Agent worker not connecting to same server**
   - Ensure agent worker uses same `LIVEKIT_URL` as backend
   - Check agent worker logs for connection errors

### 6. Microphone Not Working

**Problem**: Can't hear yourself or microphone not detected.

**Solution**:
- Grant microphone permissions in browser
- Check browser settings → Privacy → Microphone
- Try refreshing the page
- Check system microphone settings
- Test microphone in another app first

## Step-by-Step Setup Verification

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set environment variables** (`.env` file):
   ```env
   LIVEKIT_URL=wss://your-livekit-server.com
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   GEMINI_API_KEY=your-gemini-key
   ```

3. **Start backend**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Verify backend is working**:
   - Check logs for "LiveKit router" message
   - Test `/api/livekit/token` endpoint (should not return 503)

### Agent Worker Setup

1. **Start agent worker** (separate terminal):
   ```bash
   cd backend
   python run_livekit_agent.py
   ```

2. **Verify agent is running**:
   - Should see "Starting LiveKit Agent..." message
   - Should see "LiveKit URL: ..." and "Gemini Model: ..."
   - Should NOT see any errors about missing config

3. **When a user connects**:
   - Should see "Agent connected to room: therapy-session-XXX"
   - Should see "Hello, I'm Dr. Sarah Chen..." greeting

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start frontend**:
   ```bash
   npm run dev
   ```

3. **Test voice chat**:
   - Open a therapy session chat
   - Click the microphone (🎤) button
   - Click "Start Voice Chat"
   - Grant microphone permissions
   - Should connect and hear greeting

## Debugging Checklist

- [ ] LiveKit packages installed (`pip list | grep livekit`)
- [ ] Environment variables set in `.env` or Render
- [ ] Backend server running and shows LiveKit router loaded
- [ ] Agent worker running in separate terminal/process
- [ ] LiveKit URL uses `wss://` protocol
- [ ] API keys are correct and valid
- [ ] Browser has microphone permissions
- [ ] Microphone is working in other apps
- [ ] No CORS errors in browser console
- [ ] Agent worker logs show connection to room

## Getting Help

If issues persist:

1. **Check backend logs** for errors when requesting token
2. **Check agent worker logs** for connection/processing errors
3. **Check browser console** for frontend errors
4. **Verify LiveKit server status** (if using LiveKit Cloud, check dashboard)
5. **Test with LiveKit's example apps** to verify your LiveKit setup

## Architecture Reminder

```
Browser (Frontend)
    ↓ (requests token)
FastAPI Backend (/api/livekit/token)
    ↓ (connects with token)
LiveKit Server
    ↓ (detects connection)
LiveKit Agent Worker (run_livekit_agent.py)
    ↓ (uses)
Gemini API (STT, LLM, TTS)
```

**All components must be running for voice chat to work!**

