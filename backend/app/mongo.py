from functools import lru_cache
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError, ConnectionFailure
from app.config import settings
import logging

logger = logging.getLogger(__name__)

_mongo_client = None
_mongo_available = False

@lru_cache
def _get_mongo_client() -> MongoClient:
    global _mongo_client, _mongo_available
    if _mongo_client is None:
        try:
            _mongo_client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=2000)
            # Test connection
            _mongo_client.admin.command('ping')
            _mongo_available = True
            logger.info("MongoDB connection established")
        except (ConnectionFailure, PyMongoError, Exception) as e:
            logger.warning(f"MongoDB connection failed: {e}. Chat will use SQL fallback.")
            _mongo_available = False
            _mongo_client = None
    return _mongo_client


def get_mongo_database():
    if not _mongo_available:
        raise PyMongoError("MongoDB not available")
    client = _get_mongo_client()
    if client is None:
        raise PyMongoError("MongoDB client not initialized")
    return client[settings.mongodb_database]


def get_chat_collection() -> Collection:
    if not _mongo_available:
        raise PyMongoError("MongoDB not available")
    db = get_mongo_database()
    return db[settings.mongodb_chat_collection]

