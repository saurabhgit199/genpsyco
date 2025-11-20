from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, therapy, audio
from app.routers import chat as chat_router
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Create database tables (with error handling)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    # Don't crash the app, but log the error

app = FastAPI(title="Mental Health Audio Therapy API", version="1.0.0")

# CORS middleware - parse allowed origins from environment variable
allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(therapy.router, prefix="/api/therapy", tags=["therapy"])
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(chat_router.router, prefix="/api/chat", tags=["chat"])

@app.get("/")
def read_root():
    return {"message": "Mental Health Audio Therapy API"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

