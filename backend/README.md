# Mental Health Audio Therapy - Backend API

FastAPI backend for the Mental Health Audio Therapy application.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Provision the backing services

   - **PostgreSQL** (primary relational database)
   - **MongoDB** (chat transcripts & unstructured AI output)
   - **Redis** (real-time cache for chat sessions)
   - *(Optional)* Object storage (e.g. S3) for long-form audio archives

3. Create a `.env` file (copy from `.env.example`) and configure:
   - `DATABASE_URL=postgresql://username:password@localhost:5432/therapy_app`
   - `MONGODB_URI=mongodb://localhost:27017`
   - `MONGODB_DATABASE=therapy_app`
   - `REDIS_URL=redis://localhost:6379/0`
   - `ELEVENLABS_API_KEY=...`
   - `OPENAI_API_KEY=...`

```bash
cp .env.example .env
```

4. Run database migrations (first run will auto-create tables)

5. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## Email & Phone Verification

- New columns (`phone_number`, `email_verified_at`, `phone_verified_at`) and a `verification_codes` table were added. Update your database schema before running in production.
- Endpoints:
  - `POST /api/auth/request-email-verification`
  - `POST /api/auth/verify-email`
  - `POST /api/auth/request-phone-verification`
  - `POST /api/auth/verify-phone`
- Verification codes are logged to the console by default; integrate with an email/SMS provider for production use.

## Audio Generation Providers

- ElevenLabs remains the default provider. Configure `ELEVENLABS_API_KEY` and optionally `ELEVENLABS_VOICE_ID`.
- Google AI Studio (Gemini) can also generate calming therapy audio. Configure:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL_ID` (defaults to `gemini-2.5-flash`)
- Psychologists can pick between providers directly in the dashboard UI; patients will see those audio outputs immediately.

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token
- `GET /api/auth/me` - Get current user info

### Therapy Sessions
- `POST /api/therapy/create` - Create a new therapy session (Patient)
- `GET /api/therapy/my-sessions` - Get user's therapy sessions
- `GET /api/therapy/pending` - Get pending sessions (Psychologist)
- `GET /api/therapy/{session_id}` - Get specific session
- `PUT /api/therapy/{session_id}/approve` - Approve/edit session (Psychologist)

### Audio
- `POST /api/audio/generate/{session_id}` - Generate audio from approved text (Psychologist)
- `GET /api/audio/{session_id}/play` - Stream audio file

