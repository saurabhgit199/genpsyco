from datetime import datetime
from typing import Optional
from app.mongo import get_mongo_database

COLLECTION_NAME = "therapy_sessions_history"


def _collection():
    db = get_mongo_database()
    return db[COLLECTION_NAME]


def _base_set(session) -> dict:
    return {
        "session_id": session.id,
        "patient_id": session.patient_id,
        "psychologist_id": session.psychologist_id,
        "status": session.status.value if hasattr(session.status, "value") else str(session.status),
        "updated_at": datetime.utcnow(),
    }


def record_user_prompt(session, prompt_text: str, generated_text: str, model_id: str = "openai"):
    try:
        coll = _collection()
        coll.update_one(
            {"session_id": session.id},
            {
                "$set": _base_set(session),
                "$push": {
                    "user_prompts": {
                        "text": prompt_text,
                        "timestamp": datetime.utcnow(),
                    },
                    "ai_generations": {
                        "text": generated_text,
                        "model": model_id,
                        "timestamp": datetime.utcnow(),
                    },
                },
            },
            upsert=True,
        )
    except Exception as exc:  # pragma: no cover
        print(f"[WARN] Failed to record user prompt in MongoDB for session {session.id}: {exc}")


def record_psychologist_prompt(session, prompt_text: str, generated_text: str, model_id: str = "openai"):
    try:
        coll = _collection()
        update = {
            "$set": _base_set(session),
            "$push": {
                "psychologist_prompts": {
                    "text": prompt_text,
                    "psychologist_id": session.psychologist_id,
                    "timestamp": datetime.utcnow(),
                },
                "ai_generations": {
                    "text": generated_text,
                    "model": model_id,
                    "timestamp": datetime.utcnow(),
                    "source": "psychologist_prompt",
                },
            },
        }
        coll.update_one({"session_id": session.id}, update, upsert=True)
    except Exception as exc:  # pragma: no cover
        print(f"[WARN] Failed to record psychologist prompt in MongoDB for session {session.id}: {exc}")


def record_approval(session, approved_text: str):
    try:
        coll = _collection()
        coll.update_one(
            {"session_id": session.id},
            {
                "$set": _base_set(session),
                "$push": {
                    "approved_versions": {
                        "text": approved_text,
                        "psychologist_id": session.psychologist_id,
                        "timestamp": datetime.utcnow(),
                    }
                },
            },
            upsert=True,
        )
    except Exception as exc:  # pragma: no cover
        print(f"[WARN] Failed to record approval in MongoDB for session {session.id}: {exc}")

