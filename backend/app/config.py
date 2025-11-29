from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./therapy_app.db"
    
    # JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # OpenAI API
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4"
    
    # Eleven Labs API
    elevenlabs_api_key: Optional[str] = None
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Default voice ID
    elevenlabs_model_id: str = "eleven_turbo_v2_5"  # Model: eleven_turbo_v2_5, eleven_multilingual_v2, eleven_monolingual_v1
    
    # Data infrastructure defaults
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "therapy_app"
    mongodb_chat_collection: str = "chat_messages"
    redis_url: Optional[str] = "redis://localhost:6379/0"
    sqlalchemy_echo: bool = False
    mongodb_client_id: Optional[str] = None
    mongodb_client_secret: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model_id: str = "gemini-2.5-flash"
    gemini_tts_model_id: str = "gemini-2.5-flash-preview-tts"
    
    # Google OAuth
    google_oauth_client_id: Optional[str] = None
    google_oauth_client_secret: Optional[str] = None
    google_oauth_redirect_uri: str = "http://localhost:3000/auth/google/callback"
    
    # Twilio SMS (for phone OTP)
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    # Development mode: if True, OTP will be returned in response (for testing without SMS)
    sms_dev_mode: bool = False
    
    # CORS allowed origins (comma-separated list)
    # Example: "http://localhost:3000,https://yourdomain.com"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # LiveKit configuration
    livekit_url: Optional[str] = None
    livekit_api_key: Optional[str] = None
    livekit_api_secret: Optional[str] = None
    
    # AWS S3 configuration for audio storage
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_s3_bucket_name: Optional[str] = None
    aws_s3_region: str = "us-east-1"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

settings = Settings()

