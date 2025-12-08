from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, therapy, audio
from app.routers import chat as chat_router
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Try to import livekit router (optional - only if LiveKit is configured)
try:
    from app.routers import livekit
    LIVEKIT_AVAILABLE = True
except ImportError as e:
    logger.warning(f"LiveKit router not available: {e}")
    LIVEKIT_AVAILABLE = False
    livekit = None

# Create database tables (with error handling)
try:
Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    # Don't crash the app, but log the error

app = FastAPI(title="Genpsyco- Personalised Generative therapies API", version="1.0.0")

# CORS middleware - parse allowed origins from environment variable
allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Log S3 configuration status at startup"""
    from app.services.s3_storage import s3_storage
    
    logger.info("=" * 50)
    logger.info("S3 Configuration Check:")
    logger.info(f"AWS_ACCESS_KEY_ID: {'SET' if settings.aws_access_key_id else 'NOT SET'}")
    logger.info(f"AWS_SECRET_ACCESS_KEY: {'SET' if settings.aws_secret_access_key else 'NOT SET'}")
    logger.info(f"AWS_S3_BUCKET_NAME: {settings.aws_s3_bucket_name or 'NOT SET'}")
    logger.info(f"AWS_S3_REGION: {settings.aws_s3_region}")
    logger.info(f"S3 Configured: {s3_storage.is_configured()}")
    if s3_storage.is_configured():
        logger.info(f"S3 Bucket: {s3_storage.bucket_name}")
    else:
        logger.warning("S3 is NOT configured - audio files will be stored locally")
    logger.info("=" * 50)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(therapy.router, prefix="/api/therapy", tags=["therapy"])
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(chat_router.router, prefix="/api/chat", tags=["chat"])
if LIVEKIT_AVAILABLE and livekit:
    app.include_router(livekit.router, prefix="/api/livekit", tags=["livekit"])

@app.get("/")
def read_root():
    return {"message": "Genpsyco- Personalised Generative therapies API"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

