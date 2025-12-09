# Testing LiveKit Locally - Step by Step Guide

## Prerequisites Check

1. **Environment Variables** (already set in your `.env`):
   - ✅ `LIVEKIT_URL=wss://genpsyco-0xq53jwu.livekit.cloud`
   - ✅ `LIVEKIT_API_KEY` (set)
   - ✅ `LIVEKIT_API_SECRET` (set)
   - ✅ `GEMINI_API_KEY` (set)

2. **Packages Installed**:
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## Step 1: Start the Backend Server

Open Terminal 1:
```bash
cd "/home/saurabh/mental health app/backend"
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
- Should see "Application startup complete"
- Should see "LiveKit router" message (if LiveKit packages are installed)
- Server running on http://0.0.0.0:8000

## Step 2: Start the LiveKit Agent Worker

Open Terminal 2 (NEW TERMINAL):
```bash
cd "/home/saurabh/mental health app/backend"
source venv/bin/activate
python run_livekit_agent.py
```

**Expected Output:**
```
Starting LiveKit Agent...
LiveKit URL: wss://genpsyco-0xq53jwu.livekit.cloud
Gemini Model: gemini-2.5-flash
```

**If you see errors:**
- "LiveKit configuration missing" → Check your `.env` file
- "Gemini API key missing" → Set `GEMINI_API_KEY` in `.env`
- Import errors → Run `pip install -r requirements.txt`

## Step 3: Start the Frontend

Open Terminal 3 (NEW TERMINAL):
```bash
cd "/home/saurabh/mental health app/frontend"
npm run dev
```

**Expected Output:**
- Frontend running on http://localhost:3000

## Step 4: Test Voice Chat

1. **Open Browser**: Go to http://localhost:3000
2. **Login**: Login as a patient or psychologist
3. **Open a Therapy Session**: Navigate to a chat session
4. **Click Microphone Button** (🎤) in the chat input area
5. **Click "Start Voice Chat"**
6. **Grant Microphone Permission** when browser asks
7. **Test**:
   - You should see "Connected & Listening"
   - Agent should greet: "Hello, I'm Dr. Sarah Chen..."
   - Speak into your microphone
   - Agent should respond with voice

## Troubleshooting

### Backend Issues

**Problem**: "LiveKit package is not installed"
```bash
cd backend
source venv/bin/activate
pip install livekit livekit-agents
```

**Problem**: "LiveKit is not configured"
- Check `.env` file has all required variables
- Restart backend after changing `.env`

### Agent Worker Issues

**Problem**: Agent worker won't start
- Check all environment variables are set
- Verify Gemini API key is valid
- Check LiveKit URL is correct (should start with `wss://`)

**Problem**: "Agent connected to room" but no response
- Check agent worker logs for errors
- Verify Gemini API key has TTS access
- Check network connectivity to LiveKit server

### Frontend Issues

**Problem**: "Failed to connect to voice chat"
- Check backend is running (Terminal 1)
- Check agent worker is running (Terminal 2)
- Check browser console for errors
- Verify LiveKit URL in backend matches your LiveKit server

**Problem**: "Requested device not found"
- Grant microphone permissions in browser
- Check system microphone settings
- Try a different browser

**Problem**: No audio output
- Check browser audio settings
- Verify system volume is up
- Check browser console for audio errors

## Expected Logs

### Backend (Terminal 1):
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Agent Worker (Terminal 2):
```
Starting LiveKit Agent...
LiveKit URL: wss://genpsyco-0xq53jwu.livekit.cloud
Gemini Model: gemini-2.5-flash
Agent connected to room: therapy-session-XXX
```

### Frontend (Browser Console):
```
Connected to LiveKit room
Participant connected: User XXX
```

## Testing Checklist

- [ ] Backend server running (Terminal 1)
- [ ] Agent worker running (Terminal 2)
- [ ] Frontend running (Terminal 3)
- [ ] Can login to application
- [ ] Can open a therapy session chat
- [ ] Microphone button (🎤) appears
- [ ] Can click "Start Voice Chat"
- [ ] Browser requests microphone permission
- [ ] Connection successful ("Connected & Listening")
- [ ] Agent greets with voice
- [ ] Can speak and agent responds

## Next Steps After Local Testing

Once everything works locally:

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "LiveKit voice chat working locally"
   git push origin main
   ```

2. **Deploy to Render**:
   - Render will auto-deploy from GitHub
   - Make sure environment variables are set in Render dashboard
   - **IMPORTANT**: You'll need to run the agent worker on Render too (separate service)

3. **Set up Agent Worker on Render**:
   - Create a new "Background Worker" service in Render
   - Use the same repo
   - Command: `cd backend && python run_livekit_agent.py`
   - Set all environment variables (same as main backend)

## Notes

- The agent worker MUST run as a separate process
- All three components (backend, agent, frontend) must be running
- LiveKit server is already set up (cloud instance)
- Gemini API key must have access to TTS features

