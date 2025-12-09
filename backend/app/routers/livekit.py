from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.config import settings
from app.auth import get_current_user
from app import models
import logging

logger = logging.getLogger(__name__)

# Try to import LiveKit (optional dependency)
try:
    from livekit import api, rtc
    LIVEKIT_AVAILABLE = True
except ImportError as e:
    LIVEKIT_AVAILABLE = False
    logger.warning(f"LiveKit package not installed: {e}. LiveKit features will be unavailable.")
    # Create dummy classes to prevent import errors
    api = None
    rtc = None

router = APIRouter()


class TokenRequest(BaseModel):
    room_name: str
    session_id: int


class TokenResponse(BaseModel):
    token: str
    url: str
    room_name: str


@router.post("/token", response_model=TokenResponse)
def generate_token(
    request: TokenRequest,
    current_user: models.User = Depends(get_current_user)
):
    """
    Generate a LiveKit access token for joining a voice chat room.
    """
    if not LIVEKIT_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit package is not installed. Please install 'livekit' package to use this feature."
        )
    
    if not settings.livekit_url or not settings.livekit_api_key or not settings.livekit_api_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LiveKit is not configured. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your environment."
        )
    
    try:
        # Create access token
        token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret) \
            .with_identity(str(current_user.id)) \
            .with_name(current_user.full_name or f"User {current_user.id}") \
            .with_grants(
                api.VideoGrants(
                    room_join=True,
                    room=request.room_name,
                    can_publish=True,
                    can_subscribe=True,
                    can_publish_data=True,
                )
            )
        
        token_str = token.to_jwt()
        
        logger.info(f"Generated LiveKit token for user {current_user.id}, room: {request.room_name}")
        
        return TokenResponse(
            token=token_str,
            url=settings.livekit_url,
            room_name=request.room_name
        )
    except Exception as e:
        logger.error(f"Error generating LiveKit token: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate token: {str(e)}"
        )

