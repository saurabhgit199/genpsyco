from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
import logging
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, get_current_patient, get_current_psychologist
from app.services.openai_service import openai_service
from app.services.elevenlabs_service import elevenlabs_service
from app.services import mongo_therapy_history
from app.services.s3_storage import s3_storage
import os

logger = logging.getLogger(__name__)

router = APIRouter()

AUDIO_DIR = "audio_files"
os.makedirs(AUDIO_DIR, exist_ok=True)

# List of languages supported by OpenAI models
SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English"},
    {"code": "es", "name": "Spanish"},
    {"code": "fr", "name": "French"},
    {"code": "de", "name": "German"},
    {"code": "it", "name": "Italian"},
    {"code": "pt", "name": "Portuguese"},
    {"code": "ru", "name": "Russian"},
    {"code": "ja", "name": "Japanese"},
    {"code": "ko", "name": "Korean"},
    {"code": "zh", "name": "Chinese"},
    {"code": "ar", "name": "Arabic"},
    {"code": "hi", "name": "Hindi"},
    {"code": "tr", "name": "Turkish"},
    {"code": "pl", "name": "Polish"},
    {"code": "nl", "name": "Dutch"},
    {"code": "sv", "name": "Swedish"},
    {"code": "da", "name": "Danish"},
    {"code": "no", "name": "Norwegian"},
    {"code": "fi", "name": "Finnish"},
    {"code": "el", "name": "Greek"},
    {"code": "he", "name": "Hebrew"},
    {"code": "th", "name": "Thai"},
    {"code": "vi", "name": "Vietnamese"},
    {"code": "id", "name": "Indonesian"},
    {"code": "ms", "name": "Malay"},
    {"code": "cs", "name": "Czech"},
    {"code": "ro", "name": "Romanian"},
    {"code": "hu", "name": "Hungarian"},
    {"code": "uk", "name": "Ukrainian"},
    {"code": "bg", "name": "Bulgarian"},
    {"code": "hr", "name": "Croatian"},
    {"code": "sk", "name": "Slovak"},
    {"code": "sl", "name": "Slovenian"},
    {"code": "sr", "name": "Serbian"},
    {"code": "et", "name": "Estonian"},
    {"code": "lv", "name": "Latvian"},
    {"code": "lt", "name": "Lithuanian"},
]


def _session_query(db: Session):
    return db.query(models.TherapySession).options(
        joinedload(models.TherapySession.patient),
        joinedload(models.TherapySession.audio_history),
    )


def _sort_audio_history(session: models.TherapySession):
    if getattr(session, "audio_history", None):
        session.audio_history.sort(key=lambda h: h.created_at or datetime.min, reverse=True)
    return session

@router.get("/languages")
def list_languages(
    current_user: models.User = Depends(get_current_user)
):
    """List all supported languages for therapy generation"""
    return {"languages": SUPPORTED_LANGUAGES}

@router.post("/create", response_model=schemas.TherapySessionResponse)
def create_therapy_session(
    session_data: schemas.TherapySessionCreate,
    current_user: models.User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Create a new therapy session in conversation mode (no initial therapy text generation)"""
    # Create therapy session in conversation mode - therapy will be auto-generated from chat
    db_session = models.TherapySession(
        patient_id=current_user.id,
        user_input=session_data.user_input or "Starting conversation...",
        generated_text=None,  # Will be generated from conversation
        conversation_started=1,  # Mark as conversation mode
        status=models.TherapyStatus.PENDING
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Load patient relationship
    db_session = _session_query(db).filter(models.TherapySession.id == db_session.id).first()
    _sort_audio_history(db_session)
    
    return db_session

@router.get("/my-sessions", response_model=List[schemas.TherapySessionResponse])
def get_my_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all therapy sessions for the current user"""
    if current_user.role == models.UserRole.PATIENT:
        sessions = _session_query(db).filter(
            models.TherapySession.patient_id == current_user.id
        ).order_by(models.TherapySession.created_at.desc()).all()
    else:
        sessions = _session_query(db).filter(
            models.TherapySession.psychologist_id == current_user.id
        ).order_by(models.TherapySession.created_at.desc()).all()

    return [_sort_audio_history(s) for s in sessions]

@router.get("/pending", response_model=List[schemas.TherapySessionResponse])
def get_pending_sessions(
    current_user: models.User = Depends(get_current_psychologist),
    db: Session = Depends(get_db)
):
    """Get all pending therapy sessions for psychologist review"""
    sessions = _session_query(db).filter(
        models.TherapySession.status == models.TherapyStatus.PENDING,
        models.TherapySession.psychologist_id == current_user.id
    ).order_by(models.TherapySession.created_at.asc()).all()
    return [_sort_audio_history(s) for s in sessions]

@router.get("/{session_id}", response_model=schemas.TherapySessionResponse)
def get_therapy_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific therapy session"""
    session = _session_query(db).filter(
        models.TherapySession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Therapy session not found"
        )
    
    # Check permissions
    if current_user.role == models.UserRole.PATIENT and session.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    return session


@router.put("/{session_id}/update-input", response_model=schemas.TherapySessionResponse)
def update_therapy_input(
    session_id: int,
    payload: schemas.TherapySessionPatientUpdate,
    current_user: models.User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Allow patients to update their therapy request and regenerate AI content."""
    session = _session_query(db).filter(
        models.TherapySession.id == session_id,
        models.TherapySession.patient_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapy session not found")

    session.user_input = payload.user_input

    try:
        generated_text = openai_service.generate_therapy_text(payload.user_input)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to regenerate therapy content: {str(e)}"
        )

    # Reset session state so it can be re-reviewed
    session.generated_text = generated_text
    session.approved_text = None
    session.status = models.TherapyStatus.PENDING
    session.psychologist_id = None
    session.approved_at = None

    # Delete audio file (S3 or local)
    if session.audio_file_path:
        if s3_storage.is_s3_url(session.audio_file_path):
            # Extract S3 key from URL and delete from S3
            # URL format: https://bucket.s3.region.amazonaws.com/audio/key
            try:
                # Extract key from S3 URL
                if 'amazonaws.com/' in session.audio_file_path:
                    s3_key = session.audio_file_path.split('amazonaws.com/')[1]
                    s3_storage.delete_file(s3_key)
            except Exception as e:
                logger.warning(f"Failed to delete S3 file: {e}")
        elif os.path.exists(session.audio_file_path):
            # Delete local file
            try:
                os.remove(session.audio_file_path)
            except Exception as e:
                logger.warning(f"Failed to delete local file: {e}")
    session.audio_file_path = None

    db.commit()
    db.refresh(session)

    mongo_therapy_history.record_user_prompt(session, payload.user_input, generated_text)

    session = _session_query(db).filter(models.TherapySession.id == session.id).first()

    return _sort_audio_history(session)

@router.post("/{session_id}/prompt-generate", response_model=schemas.PromptGenerateResponse)
def prompt_generate_revision(
    session_id: int,
    payload: schemas.PromptGenerateRequest,
    current_user: models.User = Depends(get_current_psychologist),
    db: Session = Depends(get_db)
):
    """
    Psychologist-provided prompt to revise the therapy script.
    If payload.base_text is not provided, use the session.generated_text or approved_text (prefers approved).
    """
    session = _session_query(db).filter(
        models.TherapySession.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapy session not found")
    if session.psychologist_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to this session")
    base_text = payload.base_text or session.approved_text or session.generated_text
    if not base_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No base text available to revise")
    try:
        revised = openai_service.revise_therapy_text_with_prompt(base_text, payload.prompt)
        mongo_therapy_history.record_psychologist_prompt(session, payload.prompt, revised)
        return schemas.PromptGenerateResponse(revised_text=revised)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{session_id}/approve", response_model=schemas.TherapySessionResponse)
def approve_therapy_session(
    session_id: int,
    update_data: schemas.TherapySessionUpdate,
    current_user: models.User = Depends(get_current_psychologist),
    db: Session = Depends(get_db)
):
    """Approve and optionally edit therapy session content"""
    session = _session_query(db).filter(
        models.TherapySession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Therapy session not found"
        )
    
    if session.status != models.TherapyStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not in pending status"
        )
    
    # Must be assigned to this psychologist
    if session.psychologist_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this session"
        )
    
    # Update session
    if update_data.approved_text:
        session.approved_text = update_data.approved_text
    else:
        session.approved_text = session.generated_text
    
    session.psychologist_id = current_user.id
    session.status = update_data.status or models.TherapyStatus.APPROVED
    session.approved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(session)
    mongo_therapy_history.record_approval(session, session.approved_text)
    
    # Reload with patient relationship
    session = _session_query(db).filter(models.TherapySession.id == session.id).first()
    return _sort_audio_history(session)

@router.put("/{session_id}/assign", response_model=schemas.TherapySessionResponse)
def assign_psychologist(
    session_id: int,
    payload: schemas.AssignPsychologistRequest,
    current_user: models.User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    """Assign a psychologist to a pending session (patient only)."""
    session = _session_query(db).filter(
        models.TherapySession.id == session_id
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapy session not found")
    if session.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this session")
    if session.status != models.TherapyStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending sessions can be assigned")
    # Validate psychologist
    psych = db.query(models.User).filter(models.User.id == payload.psychologist_id, models.User.role == models.UserRole.PSYCHOLOGIST).first()
    if not psych:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Psychologist not found")
    session.psychologist_id = psych.id
    db.commit()
    db.refresh(session)
    session = _session_query(db).filter(models.TherapySession.id == session.id).first()
    return _sort_audio_history(session)

