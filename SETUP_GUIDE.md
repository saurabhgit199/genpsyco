# Mental Health Audio Therapy Application - Setup Guide

This guide will help you set up and run the Mental Health Audio Therapy application.

## Prerequisites

- **Python 3.8+** installed on your system
- **Node.js 16+** and npm installed on your system
- **OpenAI API Key** (for text generation)
- **Eleven Labs API Key** (for text-to-speech)

## Quick Setup

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Create a Python virtual environment
- Install all backend dependencies
- Install all frontend dependencies
- Create a `.env` file template

### Option 2: Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the `backend` directory:
```bash
cp .env.example .env
# Or create it manually
```

5. Edit the `.env` file and add your API keys (see below for how to get them)

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Getting API Keys

### OpenAI API Key

1. Go to [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up for an account or log in if you already have one
3. Navigate to **API Keys** section (usually in your account settings or dashboard)
4. Click **"Create new secret key"**
5. Give it a name (e.g., "Mental Health Therapy App")
6. Copy the key immediately (you won't be able to see it again)
7. Add it to your `backend/.env` file:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

**Note:** OpenAI uses a pay-as-you-go model. Make sure to set up billing and monitor your usage.

### Eleven Labs API Key

1. Go to [https://elevenlabs.io/](https://elevenlabs.io/)
2. Sign up for an account or log in
3. Navigate to your **Profile** or **Settings**
4. Find the **API Key** section
5. Copy your API key
6. Add it to your `backend/.env` file:
   ```
   ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
   ```

**Note:** Eleven Labs offers a free tier with limited characters per month. Check their pricing for more details.

### Optional: Voice ID Configuration

You can customize the voice used for text-to-speech by changing the `ELEVENLABS_VOICE_ID` in your `.env` file. The default voice ID is `21m00Tcm4TlvDq8ikWAM` (Rachel - a friendly female voice).

To find other voice IDs:
1. Log into your Eleven Labs account
2. Go to the Voice Library
3. Select a voice you like
4. The voice ID will be in the URL or voice settings

## Environment Variables

Your `backend/.env` file should look like this:

```env
# Database Configuration
DATABASE_URL=sqlite:///./therapy_app.db

# JWT Configuration
SECRET_KEY=your-secret-key-change-in-production-please-use-a-strong-random-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4

# Eleven Labs API Configuration
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

**Important Security Notes:**
- Never commit your `.env` file to version control
- Change the `SECRET_KEY` to a strong random string in production
- Keep your API keys secure and don't share them

## Running the Application

### Start the Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Activate the virtual environment (if not already activated):
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at:
- API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Alternative Docs: `http://localhost:8000/redoc`

### Start the Frontend

1. Open a new terminal window
2. Navigate to the frontend directory:
```bash
cd frontend
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Testing the Application

### 1. Create Test Accounts

1. Open `http://localhost:3000` in your browser
2. Click "Register" to create accounts:
   - Create a **Patient** account
   - Create a **Psychologist** account

### 2. Test Patient Flow

1. Log in as a Patient
2. Click "New Therapy Session"
3. Enter your mental health concerns (e.g., "I've been feeling anxious about work lately")
4. Submit the form
5. The AI will generate therapy content (or show placeholder if API key is missing)
6. Wait for psychologist approval

### 3. Test Psychologist Flow

1. Log in as a Psychologist
2. Go to "Pending Review" tab
3. Review the AI-generated therapy content
4. Edit if needed
5. Click "Approve"
6. Go to "My Reviewed Sessions" tab
7. Click "Generate Audio" for approved sessions
8. Audio will be generated and delivered to the patient

### 4. Test Audio Playback

1. Log back in as the Patient
2. Find the session with "Audio Ready" status
3. Click "Play Audio Therapy" to listen

## Troubleshooting

### Backend Issues

**Problem:** `ModuleNotFoundError` or import errors
- **Solution:** Make sure you're in the virtual environment and all dependencies are installed:
  ```bash
  source venv/bin/activate
  pip install -r requirements.txt
  ```

**Problem:** Database errors
- **Solution:** The database will be created automatically on first run. If you need to reset it, delete `therapy_app.db` and restart the server.

**Problem:** API key errors
- **Solution:** 
  - Verify your API keys are correct in the `.env` file
  - Make sure there are no extra spaces or quotes around the keys
  - Check that your OpenAI/Eleven Labs accounts are active and have credits

### Frontend Issues

**Problem:** `npm install` fails
- **Solution:** 
  - Make sure you have Node.js 16+ installed
  - Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
  - Check your internet connection

**Problem:** Frontend can't connect to backend
- **Solution:**
  - Make sure the backend is running on port 8000
  - Check the proxy configuration in `vite.config.js`
  - Verify CORS settings in `backend/app/main.py`

**Problem:** Authentication not working
- **Solution:**
  - Check browser console for errors
  - Verify JWT token is being stored in localStorage
  - Make sure the backend is running and accessible

### API Issues

**Problem:** OpenAI API returns errors
- **Solution:**
  - Verify your API key is correct
  - Check your OpenAI account has credits
  - Try using `gpt-3.5-turbo` instead of `gpt-4` in `.env` (cheaper option)
  - Check OpenAI status page for outages

**Problem:** Eleven Labs API returns errors
- **Solution:**
  - Verify your API key is correct
  - Check your Eleven Labs account has available characters
  - Verify the voice ID is correct
  - Check Eleven Labs status page for outages

## Production Deployment

For production deployment, consider:

1. **Change SECRET_KEY** to a strong random string
2. **Use PostgreSQL** instead of SQLite for the database
3. **Set up HTTPS** for secure connections
4. **Configure environment variables** on your hosting platform
5. **Set up proper logging** and monitoring
6. **Implement rate limiting** to prevent abuse
7. **Use a production WSGI server** like Gunicorn with Uvicorn workers
8. **Set up a reverse proxy** (nginx) for the frontend
9. **Configure CORS** properly for your domain
10. **Set up automated backups** for the database

## Support

If you encounter issues:
1. Check the API documentation at `http://localhost:8000/docs`
2. Review the error messages in the browser console and terminal
3. Check that all dependencies are installed correctly
4. Verify API keys are correct and accounts have credits

## Next Steps

Once everything is set up:
1. Test the complete workflow (Patient → Psychologist → Audio)
2. Customize the therapy prompts in `backend/app/services/openai_service.py`
3. Adjust the voice settings in `backend/app/services/elevenlabs_service.py`
4. Customize the UI styling in `frontend/src/App.css` and `frontend/src/index.css`
5. Add additional features as needed

Happy coding! 🎉

