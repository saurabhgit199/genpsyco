from datetime import datetime
from typing import List, Literal
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session, joinedload
import logging
import httpx
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, get_current_psychologist
from app.services.elevenlabs_service import elevenlabs_service, ElevenLabsPaymentIssueError
from app.services.google_gemini_service import google_gemini_service
from app.services.s3_storage import s3_storage
import os
from pydantic import BaseModel

router = APIRouter()

AUDIO_DIR = "audio_files"
os.makedirs(AUDIO_DIR, exist_ok=True)
logger = logging.getLogger(__name__)

class GenerateAudioRequest(BaseModel):
    voice_id: str | None = None
    provider: Literal["elevenlabs", "google"] = "elevenlabs"
    instruction: str | None = None

@router.get("/voices")
def list_voices(
    provider: Literal["elevenlabs", "google"] = "elevenlabs",
    current_user: models.User = Depends(get_current_user)
):
    """List available ElevenLabs voices with preview urls for selection"""
    try:
        if provider == "google":
            voices = google_gemini_service.list_voices()
        else:
            voices = elevenlabs_service.list_voices()
        return {"voices": voices}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch voices: {str(e)}"
        )

@router.post("/generate/{session_id}")
def generate_audio(
    session_id: int,
    current_user: models.User = Depends(get_current_psychologist),
    db: Session = Depends(get_db),
    body: GenerateAudioRequest | None = None
):
    """Generate audio from approved therapy text"""
    session = db.query(models.TherapySession).filter(
        models.TherapySession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Therapy session not found"
        )
    
    if session.status not in (models.TherapyStatus.APPROVED, models.TherapyStatus.AUDIO_GENERATED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session must be approved before generating audio"
        )
    
    if not session.approved_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No approved text available for audio generation"
        )
    
    provider = body.provider if body else "elevenlabs"
    voice_id = body.voice_id if body else None
    instruction = body.instruction if body else None
    extension = ".wav" if provider == "google" else ".mp3"
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    audio_filename = f"therapy_session_{session_id}_{timestamp}{extension}"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)
    
    try:
        # Generate audio locally first
        if provider == "google":
            google_gemini_service.text_to_speech(session.approved_text, audio_path, voice_id=voice_id, instruction=instruction)
        else:
            elevenlabs_service.text_to_speech(session.approved_text, audio_path, voice_id=voice_id)
        
        # Verify local file was created and has content
        if not os.path.exists(audio_path):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Audio file was not created"
            )
        
        local_file_size = os.path.getsize(audio_path)
        logger.info(f"[audio.generate] session_id={session_id} Local file created: {audio_path}, size={local_file_size} bytes")
        
        # Validate file size (should be at least 1KB for valid audio)
        if local_file_size < 1024:
            logger.error(f"[audio.generate] session_id={session_id} File too small: {local_file_size} bytes - audio generation may have failed")
            # Don't fail completely, but log the warning
        
        # Upload to S3 if configured, otherwise use local path
        final_file_path = audio_path
        if s3_storage.is_configured():
            # Create S3 key (path in bucket)
            s3_key = f"audio/therapy_session_{session_id}_{timestamp}{extension}"
            
            # Upload to S3
            s3_url = s3_storage.upload_file(audio_path, s3_key)
            
            if s3_url:
                # Verify S3 upload by checking object size (use s3_url which is the s3:// identifier)
                s3_size = s3_storage.get_file_size(s3_url)
                if s3_size is not None:
                    if s3_size != local_file_size:
                        logger.error(f"[audio.generate] session_id={session_id} Size mismatch! Local={local_file_size}, S3={s3_size}")
                    else:
                        logger.info(f"[audio.generate] session_id={session_id} S3 upload verified: size={s3_size} bytes")
                else:
                    logger.warning(f"[audio.generate] session_id={session_id} Could not verify S3 upload size")
                
                # Use S3 URL instead of local path
                final_file_path = s3_url
                logger.info(f"[audio.generate] session_id={session_id} Audio uploaded to S3: {s3_url}")
                
                # Clean up local file after successful upload
                try:
                    os.remove(audio_path)
                    logger.info(f"[audio.generate] Local file cleaned up: {audio_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up local file: {e}")
            else:
                logger.warning(f"[audio.generate] session_id={session_id} S3 upload failed, using local path")
        
        # Store file path (S3 URL or local path) in database
        history_entry = models.AudioHistory(
            session_id=session.id,
            provider=provider,
            voice_id=voice_id,
            instruction=instruction,
            file_path=final_file_path,
            created_by=current_user.id,
        )
        db.add(history_entry)

        session.audio_file_path = final_file_path
        session.status = models.TherapyStatus.AUDIO_GENERATED

        db.commit()
        db.refresh(history_entry)
        
        return {
            "message": "Audio generated successfully",
            "audio_path": final_file_path,
            "session_id": session_id,
            "history_id": history_entry.id,
        }
    except ElevenLabsPaymentIssueError as e:
        raise HTTPException(
            status_code=402,
            detail=f"Audio generation unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating audio: {str(e)}"
        )

@router.get("/{session_id}/play")
async def play_audio(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stream latest audio file for session playback"""
    session = db.query(models.TherapySession).filter(
        models.TherapySession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Therapy session not found"
        )
    
    if current_user.role == models.UserRole.PATIENT:
        if session.patient_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this audio"
            )
    elif current_user.role == models.UserRole.PSYCHOLOGIST:
        if session.psychologist_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this audio"
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    if not session.audio_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found"
        )
    
    file_path = session.audio_file_path
    
    # Check if it's an S3 URL or S3 identifier
    if s3_storage.is_s3_url(file_path):
        logger.info(f"[audio.play] session_id={session_id} file_path={file_path} - Fetching from S3")
        # Get presigned URL and fetch the audio from S3
        presigned_url = s3_storage.get_presigned_url(file_path)
        if presigned_url:
            try:
                # Fetch audio content fully from S3 to get Content-Length
                # This is necessary for browser audio playback with blob URLs
                async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
                    s3_response = await client.get(presigned_url)
                    if s3_response.status_code >= 400:
                        logger.error(f"[audio.play] S3 returned status {s3_response.status_code}")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Failed to fetch audio from storage"
                        )
                    audio_content = s3_response.content
                    content_length = len(audio_content)
                    logger.info(
                        f"[audio.play] session_id={session_id} S3 status={s3_response.status_code} "
                        f"resp_content_type={s3_response.headers.get('content-type')} "
                        f"size={content_length}"
                    )
                    if content_length < 1024:
                        logger.warning(
                            f"[audio.play] session_id={session_id} very small audio payload ({content_length} bytes) "
                            f"- playback may fail"
                        )
                
                media_type, download_name = _detect_media_type(file_path)
                
                logger.info(f"[audio.play] session_id={session_id} Serving from S3, size={content_length}, type={media_type}")
                return Response(
                    content=audio_content,
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f'inline; filename="{download_name}"',
                        "Content-Length": str(content_length),
                        "Cache-Control": "public, max-age=3600",
                        "Accept-Ranges": "bytes"
                    }
                )
            except httpx.HTTPError as e:
                logger.error(f"[audio.play] session_id={session_id} Error fetching from S3: {e}")
                import traceback
                logger.error(traceback.format_exc())
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to fetch audio: {str(e)}"
                )
            except Exception as e:
                logger.error(f"[audio.play] session_id={session_id} Error: {e}")
                import traceback
                logger.error(traceback.format_exc())
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to serve audio: {str(e)}"
                )
        else:
            logger.error(f"[audio.play] session_id={session_id} Failed to generate presigned URL for: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate audio access URL"
            )
    
    # Otherwise, serve from local filesystem (backward compatibility)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found on disk"
        )
    
    media_type, download_name = _detect_media_type(file_path)
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=download_name
    )


def _get_history_entry(db: Session, history_id: int) -> models.AudioHistory:
    entry = (
        db.query(models.AudioHistory)
        .options(joinedload(models.AudioHistory.session))
        .filter(models.AudioHistory.id == history_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio history not found")
    return entry


@router.get("/history/{session_id}", response_model=List[schemas.AudioHistoryResponse])
def list_audio_history(
    session_id: int,
    current_user: models.User = Depends(get_current_psychologist),
    db: Session = Depends(get_db)
):
    session = db.query(models.TherapySession).options(joinedload(models.TherapySession.audio_history)).filter(
        models.TherapySession.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapy session not found")
    if session.psychologist_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return session.audio_history


@router.post("/history/{history_id}/send")
def send_audio_history(
    history_id: int,
    current_user: models.User = Depends(get_current_psychologist),
    db: Session = Depends(get_db)
):
    entry = _get_history_entry(db, history_id)
    session = entry.session
    if session.psychologist_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if entry.sent_at:
        return {"message": "Audio already sent"}
    entry.sent_at = datetime.utcnow()
    entry.sent_by = current_user.id
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"message": "Audio sent to patient"}


@router.get("/history/{history_id}/play")
async def play_audio_history(
    history_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entry = _get_history_entry(db, history_id)
    session = entry.session

    if current_user.role == models.UserRole.PATIENT:
        if session.patient_id != current_user.id or not entry.sent_at:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this audio")
    elif current_user.role == models.UserRole.PSYCHOLOGIST:
        # Allow preview if assigned psychologist OR the current user generated this audio entry
        if session.psychologist_id != current_user.id and entry.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this audio")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Check if it's an S3 URL or S3 identifier
    if s3_storage.is_s3_url(entry.file_path):
        logger.info(f"[audio.play] history_id={history_id} file_path={entry.file_path} - Fetching from S3")
        # Get presigned URL and fetch the audio from S3
        presigned_url = s3_storage.get_presigned_url(entry.file_path)
        if presigned_url:
            try:
                # Fetch audio content fully from S3 to get Content-Length
                # This is necessary for browser audio playback with blob URLs
                async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
                    s3_response = await client.get(presigned_url)
                    if s3_response.status_code >= 400:
                        logger.error(f"[audio.play] S3 returned status {s3_response.status_code}")
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Failed to fetch audio from storage"
                        )
                    audio_content = s3_response.content
                    content_length = len(audio_content)
                    logger.info(
                        f"[audio.play] history_id={history_id} S3 status={s3_response.status_code} "
                        f"resp_content_type={s3_response.headers.get('content-type')} "
                        f"size={content_length}"
                    )
                    if content_length < 1024:
                        logger.warning(
                            f"[audio.play] history_id={history_id} very small audio payload ({content_length} bytes) "
                            f"- playback may fail"
                        )
                
                media_type, download_name = _detect_media_type(entry.file_path)
                
                logger.info(f"[audio.play] history_id={history_id} session_id={session.id} provider={entry.provider} Serving from S3, size={content_length}, type={media_type}")
                return Response(
                    content=audio_content,
                    media_type=media_type,
                    headers={
                        "Content-Disposition": f'inline; filename="{download_name}"',
                        "Content-Length": str(content_length),
                        "Cache-Control": "public, max-age=3600",
                        "Accept-Ranges": "bytes"
                    }
                )
            except httpx.HTTPError as e:
                logger.error(f"[audio.play] history_id={history_id} Error fetching from S3: {e}")
                import traceback
                logger.error(traceback.format_exc())
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to fetch audio: {str(e)}"
                )
            except Exception as e:
                logger.error(f"[audio.play] history_id={history_id} Error: {e}")
                import traceback
                logger.error(traceback.format_exc())
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to serve audio: {str(e)}"
                )
        else:
            logger.error(f"[audio.play] history_id={history_id} Failed to generate presigned URL for: {entry.file_path}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate audio access URL"
            )
    
    # Otherwise, serve from local filesystem (backward compatibility)
    # Log diagnostics for playback
    try:
        file_exists = os.path.exists(entry.file_path)
        file_size = os.path.getsize(entry.file_path) if file_exists else -1
        logger.info(f"[audio.play] history_id={history_id} session_id={session.id} provider={entry.provider} path={entry.file_path} exists={file_exists} size={file_size}")
    except Exception as e:
        logger.warning(f"[audio.play] stat error for path={entry.file_path}: {e}")

    if not os.path.exists(entry.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found on disk")

    media_type, download_name = _detect_media_type(entry.file_path)
    return FileResponse(
        entry.file_path,
        media_type=media_type,
        filename=download_name,
    )


def _detect_media_type(file_path: str) -> tuple[str, str]:
    # Extract file path for extension detection
    # Handle S3 URLs and identifiers
    if file_path.startswith('s3://'):
        # Format: s3://bucket/key
        path_for_ext = file_path.split('/', 3)[-1] if '/' in file_path[5:] else file_path
    elif 'amazonaws.com' in file_path or file_path.startswith('https://'):
        # Extract from URL - get the path part
        try:
            from urllib.parse import urlparse
            parsed = urlparse(file_path)
            path_for_ext = parsed.path
        except:
            path_for_ext = file_path
    else:
        path_for_ext = file_path
    
    _, ext = os.path.splitext(path_for_ext.lower())
    
    # Use browser-compatible MIME types
    if ext == ".wav":
        # Use audio/x-wav for better browser compatibility
        media_type = "audio/x-wav"
    elif ext == ".ogg":
        media_type = "audio/ogg"
    elif ext == ".m4a":
        media_type = "audio/mp4"
    else:
        # Default to MP3 for .mp3 and unknown extensions
        media_type = "audio/mpeg"
    
    # Extract filename for Content-Disposition
    if file_path.startswith('s3://'):
        filename = os.path.basename(file_path.split('/', 3)[-1]) if '/' in file_path[5:] else "audio"
    elif 'amazonaws.com' in file_path:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(file_path)
            filename = os.path.basename(parsed.path) or "audio"
        except:
            filename = os.path.basename(file_path) or "audio"
    else:
        filename = os.path.basename(file_path) or "audio"
    
    return media_type, filename

