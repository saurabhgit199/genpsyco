import json
from typing import Optional
import redis
from app.config import settings


def _create_client() -> Optional[redis.Redis]:
    if not settings.redis_url:
        return None
    try:
        client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        client.ping()
        return client
    except Exception:
        return None


redis_client = _create_client()


def cache_set(key: str, value: list, ttl: int = 60):
    if not redis_client:
        return
    redis_client.setex(key, ttl, json.dumps(value))


def cache_get(key: str) -> Optional[list]:
    if not redis_client:
        return None
    raw = redis_client.get(key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def cache_delete(key: str):
    if not redis_client:
        return
    redis_client.delete(key)

