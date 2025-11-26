from typing import List, Dict, Union
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pymongo.errors import PyMongoError
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.mongo import get_chat_collection
from app.cache import cache_get, cache_set, cache_delete
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

CHAT_CACHE_TTL_SECONDS = 30


def _ensure_access(session: models.TherapySession, user: models.User):
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapy session not found")
    # patient or assigned psychologist can access
    if user.role == models.UserRole.PATIENT and session.patient_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if user.role == models.UserRole.PSYCHOLOGIST and session.psychologist_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")


def _serialize_chat(doc: Union[dict, models.ChatMessage]) -> dict:
    if isinstance(doc, models.ChatMessage):
        return {
            "id": str(doc.id),
            "session_id": doc.session_id,
            "sender_id": doc.sender_id,
            "content": doc.content,
            "is_ai_message": bool(doc.is_ai_message),
            "created_at": doc.created_at.isoformat(),
        }
    created_at = doc.get("created_at") or datetime.utcnow()
    return {
        "id": str(doc.get("_id")),
        "session_id": doc.get("session_id"),
        "sender_id": doc.get("sender_id"),
        "content": doc.get("content"),
        "is_ai_message": bool(doc.get("is_ai_message", 0)),
        "created_at": created_at.isoformat(),
    }


def _cache_key(session_id: int) -> str:
    return f"chat:session:{session_id}"


@router.get("/{session_id}", response_model=List[schemas.ChatMessageResponse])
def list_messages(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.TherapySession).filter(models.TherapySession.id == session_id).first()
    _ensure_access(session, current_user)

    cached = cache_get(_cache_key(session_id))
    if cached is not None:
        return cached

    try:
        collection = get_chat_collection()
        docs = collection.find({"session_id": session_id}).sort("created_at", 1)
        messages = [_serialize_chat(doc) for doc in docs]
        cache_set(_cache_key(session_id), messages, ttl=CHAT_CACHE_TTL_SECONDS)
        return messages
    except PyMongoError as exc:
        print(f"[WARN] MongoDB unavailable for chat session {session_id}, falling back to SQL: {exc}")
    except Exception as exc:
        print(f"[WARN] Unexpected chat retrieval error for session {session_id}: {exc}")

    sql_messages = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )
    return [_serialize_chat(msg) for msg in sql_messages]


def _generate_therapy_background(session_id: int, conversation_history: List[Dict[str, str]], language: str = "English"):
    """
    Background task to generate therapy text from conversation.
    This runs asynchronously so the conversation can continue.
    """
    from app.database import SessionLocal
    from app.services.counselor_service import generate_therapy_from_conversation
    from app import models
    
    db = SessionLocal()
    try:
        session = db.query(models.TherapySession).filter(models.TherapySession.id == session_id).first()
        if not session:
            logger.error(f"Session {session_id} not found for background therapy generation")
            return
        
        # Check if therapy was already generated (avoid duplicate generation)
        if session.generated_text:
            logger.info(f"Therapy already generated for session {session_id}")
            return
        
        logger.info(f"Starting background therapy generation for session {session_id}")
        
        # Generate therapy from conversation
        therapy_text = generate_therapy_from_conversation(conversation_history, language=language)
        
        # Update session with generated therapy
        session.generated_text = therapy_text
        session.therapy_auto_generated = 1
        session.status = models.TherapyStatus.PENDING
        db.commit()
        
        logger.info(f"Successfully generated therapy for session {session_id} ({len(therapy_text)} chars)")
        
        # Clear cache
        cache_delete(_cache_key(session_id))
        
    except Exception as e:
        logger.error(f"Error in background therapy generation for session {session_id}: {e}")
        db.rollback()
    finally:
        db.close()


@router.post("/{session_id}", response_model=schemas.ChatMessageResponse)
def send_message(
    session_id: int,
    payload: schemas.ChatMessageCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.TherapySession).filter(models.TherapySession.id == session_id).first()
    _ensure_access(session, current_user)
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    # Save user message
    user_message = models.ChatMessage(
        session_id=session_id,
        sender_id=current_user.id,
        content=payload.content.strip(),
        is_ai_message=0,
        created_at=datetime.utcnow(),
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Save to MongoDB if available
    try:
        collection = get_chat_collection()
        collection.insert_one({
            "session_id": session_id,
            "sender_id": current_user.id,
            "content": payload.content.strip(),
            "is_ai_message": 0,
            "created_at": user_message.created_at,
        })
    except Exception as exc:
        logger.warning(f"MongoDB write failed for user message: {exc}")

    cache_delete(_cache_key(session_id))

    # Generate AI counselor response (only if user is a patient)
    if current_user.role == models.UserRole.PATIENT:
        from app.services.counselor_service import generate_counselor_response
        
        # Get conversation history for context (including the message we just added)
        conversation_messages = (
            db.query(models.ChatMessage)
            .filter(models.ChatMessage.session_id == session_id)
            .order_by(models.ChatMessage.created_at.asc())
            .all()
        )
        
        # Format conversation for OpenAI
        conversation_history = []
        for msg in conversation_messages:
            role = "assistant" if msg.is_ai_message else "user"
            conversation_history.append({"role": role, "content": msg.content})
        
        # Generate AI response (continue conversation naturally)
        ai_response_text = generate_counselor_response(conversation_history)
        
        # Save AI response
        ai_message = models.ChatMessage(
            session_id=session_id,
            sender_id=current_user.id,  # Use patient ID for consistency
            content=ai_response_text,
            is_ai_message=1,
            created_at=datetime.utcnow(),
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        
        # Save AI message to MongoDB
        try:
            collection = get_chat_collection()
            collection.insert_one({
                "session_id": session_id,
                "sender_id": current_user.id,
                "content": ai_response_text,
                "is_ai_message": 1,
                "created_at": ai_message.created_at,
            })
        except Exception as exc:
            logger.warning(f"MongoDB write failed for AI message: {exc}")
        
        # Check if we should auto-generate therapy (after 2-3 user messages)
        # Count only user messages (not AI responses)
        user_message_count = sum(1 for msg in conversation_messages if not msg.is_ai_message)
        
        # Trigger therapy generation after 2 user messages (allowing conversation to continue)
        if user_message_count >= 2 and not session.generated_text and not session.therapy_auto_generated:
            logger.info(f"Triggering background therapy generation for session {session_id} after {user_message_count} user messages")
            
            # Get language preference (default to English)
            # Note: Language selection can be added to session creation in the future
            language = 'English'  # Default to English for now
            
            # Add conversation history including the new AI response for better context
            full_conversation_history = conversation_history + [
                {"role": "assistant", "content": ai_response_text}
            ]
            
            # Start background task to generate therapy (non-blocking)
            background_tasks.add_task(
                _generate_therapy_background,
                session_id=session_id,
                conversation_history=full_conversation_history,
                language=language
            )
            
            logger.info(f"Background therapy generation task queued for session {session_id}")
        
        cache_delete(_cache_key(session_id))
        
        # Return the AI response immediately (conversation continues)
        return _serialize_chat(ai_message)
    
    # If psychologist sends a message, just return their message
    return _serialize_chat(user_message)


@router.get("/{session_id}/status")
def get_therapy_status(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get therapy generation status for a session."""
    session = db.query(models.TherapySession).filter(models.TherapySession.id == session_id).first()
    _ensure_access(session, current_user)
    
    # Count user messages to determine if therapy generation should have started
    user_message_count = (
        db.query(models.ChatMessage)
        .filter(
            models.ChatMessage.session_id == session_id,
            models.ChatMessage.is_ai_message == 0
        )
        .count()
    )
    
    # Determine if therapy is being generated (2+ messages but not yet generated)
    therapy_generating = (
        user_message_count >= 2 and 
        not session.generated_text and 
        session.conversation_started == 1
    )
    
    return {
        "session_id": session_id,
        "therapy_generated": bool(session.generated_text),
        "therapy_generating": therapy_generating,
        "therapy_auto_generated": bool(session.therapy_auto_generated),
        "status": session.status.value if session.status else None,
        "user_message_count": user_message_count,
    }

