# Mental Health Audio Therapy Application

A comprehensive web-based application for mental health therapy that uses AI to generate personalized therapy content, which is reviewed by psychologists and converted to audio for patients.

## Features

- **Dual User System**: Separate interfaces for patients and psychologists
- **AI-Powered Therapy Generation**: Uses OpenAI GPT to generate personalized therapy content based on user input
- **Psychologist Review Workflow**: Content is reviewed, edited, and approved by licensed psychologists
- **Text-to-Speech**: Converts approved therapy content to audio using Eleven Labs API
- **Secure Authentication**: JWT-based authentication with role-based access control
- **Modern UI**: Beautiful, responsive React frontend with intuitive user experience

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database management
- **SQLite**: Database (can be upgraded to PostgreSQL)
- **JWT**: Authentication tokens
- **OpenAI API**: Text generation
- **Eleven Labs API**: Text-to-speech conversion

### Frontend
- **React 18**: Modern React with hooks
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Vite**: Fast build tool and dev server

## Project Structure

```
mental health app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration settings
│   │   ├── database.py          # Database setup
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # Authentication utilities
│   │   ├── routers/             # API routes
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── therapy.py       # Therapy session endpoints
│   │   │   └── audio.py         # Audio generation endpoints
│   │   └── services/            # External service integrations
│   │       ├── openai_service.py
│   │       └── elevenlabs_service.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── pages/               # React pages
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── PatientDashboard.jsx
│   │   │   └── PsychologistDashboard.jsx
│   │   ├── components/          # React components
│   │   │   └── ProtectedRoute.jsx
│   │   ├── contexts/            # React contexts
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```

## Quick Start

### Automated Setup (Recommended)

Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

Then add your API keys to `backend/.env` (see [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions).

### Manual Setup

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup instructions including:
- Prerequisites
- Backend and Frontend setup
- How to get OpenAI and Eleven Labs API keys
- Troubleshooting guide
- Production deployment tips

### Quick Setup Summary

1. **Backend:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   # Create .env file and add API keys
   uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access:**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`

## Usage

### For Patients

1. **Register/Login**: Create an account with role "Patient"
2. **Create Therapy Session**: Click "New Therapy Session" and describe your mental health concerns
3. **Wait for Review**: Your session will be reviewed by a psychologist
4. **Listen to Audio**: Once approved and audio is generated, you can play the therapy audio

### For Psychologists

1. **Register/Login**: Create an account with role "Psychologist"
2. **Review Sessions**: View pending therapy sessions in the "Pending Review" tab
3. **Edit & Approve**: Review the AI-generated content, edit if needed, and approve
4. **Generate Audio**: After approval, generate audio from the approved text
5. **Track Progress**: View all your reviewed sessions in the "My Reviewed Sessions" tab

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token
- `GET /api/auth/me` - Get current user info

### Therapy Sessions
- `POST /api/therapy/create` - Create a new therapy session (Patient only)
- `GET /api/therapy/my-sessions` - Get user's therapy sessions
- `GET /api/therapy/pending` - Get pending sessions (Psychologist only)
- `GET /api/therapy/{session_id}` - Get specific session
- `PUT /api/therapy/{session_id}/approve` - Approve/edit session (Psychologist only)

### Audio
- `POST /api/audio/generate/{session_id}` - Generate audio from approved text (Psychologist only)
- `GET /api/audio/{session_id}/play` - Stream audio file

## Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

### Eleven Labs API Key
1. Go to https://elevenlabs.io/
2. Sign up or log in
3. Navigate to your profile settings
4. Copy your API key
5. Add it to your `.env` file

## Development

### Running Tests
Currently, the application doesn't include automated tests. You can test manually using:
- Backend API docs: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`

### Database
The application uses SQLite by default. The database file (`therapy_app.db`) will be created automatically on first run.

To use PostgreSQL instead:
1. Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost/therapy_db
```

## Security Notes

- Change the `SECRET_KEY` in production
- Use environment variables for all sensitive data
- Implement rate limiting for production
- Use HTTPS in production
- Consider adding input validation and sanitization
- Implement proper error handling and logging

## Future Enhancements

- Email notifications for session status updates
- Multiple language support
- Voice selection for TTS
- Session history and analytics
- Patient progress tracking
- Psychologist notes and annotations
- Mobile app version
- Real-time notifications

## License

This project is open source and available for educational purposes.

## Support

For issues or questions, please check the API documentation at `/docs` endpoint or review the code comments.

