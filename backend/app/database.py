from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=settings.sqlalchemy_echo,
    pool_size=15,  # Increase pool size further
    max_overflow=25,  # Increase overflow further
    pool_recycle=3600,  # Recycle connections after 1 hour to prevent stale connections
    pool_timeout=60,  # Increase timeout for getting connection from pool
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
