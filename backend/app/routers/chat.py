from typing import List, Union
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pymongo.errors import PyMongoError
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.mongo import get_chat_collection
from app.cache import cache_get, cache_set, cache_delete

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
            "created_at": doc.created_at.isoformat(),
        }
    created_at = doc.get("created_at") or datetime.utcnow()
    return {
        "id": str(doc.get("_id")),
        "session_id": doc.get("session_id"),
        "sender_id": doc.get("sender_id"),
        "content": doc.get("content"),
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


@router.post("/{session_id}", response_model=schemas.ChatMessageResponse)
def send_message(
    session_id: int,
    payload: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.TherapySession).filter(models.TherapySession.id == session_id).first()
    _ensure_access(session, current_user)
    if not payload.content or not payload.content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    db_message = models.ChatMessage(
        session_id=session_id,
        sender_id=current_user.id,
        content=payload.content.strip(),
        created_at=datetime.utcnow(),
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    serialized_sql = _serialize_chat(db_message)

    try:
        message_doc = {
            "session_id": session_id,
            "sender_id": current_user.id,
            "content": payload.content.strip(),
            "created_at": db_message.created_at,
        }
        collection = get_chat_collection()
        result = collection.insert_one(message_doc)
        message_doc["_id"] = result.inserted_id
        serialized = _serialize_chat(message_doc)
    except PyMongoError as exc:
        print(f"[WARN] MongoDB write failed for chat session {session_id}, using SQL message: {exc}")
        serialized = serialized_sql
    except Exception as exc:
        print(f"[WARN] Unexpected chat write error for session {session_id}: {exc}")
        serialized = serialized_sql

    cache_delete(_cache_key(session_id))
    return serialized
