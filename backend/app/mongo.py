from functools import lru_cache
from pymongo import MongoClient
from pymongo.collection import Collection
from app.config import settings


@lru_cache
def _get_mongo_client() -> MongoClient:
    return MongoClient(settings.mongodb_uri)


def get_mongo_database():
    client = _get_mongo_client()
    return client[settings.mongodb_database]


def get_chat_collection() -> Collection:
    db = get_mongo_database()
    return db[settings.mongodb_chat_collection]

