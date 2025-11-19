from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    PATIENT = "patient"
    PSYCHOLOGIST = "psychologist"

class TherapyStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    AUDIO_GENERATED = "audio_generated"

class AuthProvider(str, enum.Enum):
    PASSWORD = "password"
    GOOGLE = "google"
    PHONE = "phone"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)  # Nullable for phone-only users
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    full_name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    phone_number = Column(String, unique=True, nullable=True, index=True)
    bio = Column(Text, nullable=True)
    email_verified_at = Column(DateTime, nullable=True)
    phone_verified_at = Column(DateTime, nullable=True)
    auth_provider = Column(String, nullable=False, default=AuthProvider.PASSWORD.value)  # password, google, phone
    provider_id = Column(String, nullable=True, index=True)  # OAuth provider user ID (e.g., Google sub)
    
    # Relationships
    therapy_sessions = relationship(
        "TherapySession",
        foreign_keys="TherapySession.patient_id",
        back_populates="patient"
    )
    reviewed_sessions = relationship("TherapySession", foreign_keys="TherapySession.psychologist_id", back_populates="psychologist")

    @property
    def is_email_verified(self) -> bool:
        return self.email_verified_at is not None

    @property
    def is_phone_verified(self) -> bool:
        return self.phone_verified_at is not None

class TherapySession(Base):
    __tablename__ = "therapy_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    psychologist_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    user_input = Column(Text, nullable=False)  # User's mental health concerns
    generated_text = Column(Text, nullable=True)  # AI generated therapy text
    approved_text = Column(Text, nullable=True)  # Psychologist approved/edited text
    audio_file_path = Column(String, nullable=True)  # Path to generated audio file
    
    status = Column(SQLEnum(TherapyStatus), default=TherapyStatus.PENDING)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    
    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="therapy_sessions")
    psychologist = relationship("User", foreign_keys=[psychologist_id], back_populates="reviewed_sessions")
    audio_history = relationship(
        "AudioHistory",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="desc(AudioHistory.created_at)",
    )

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("therapy_sessions.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # relationships
    session = relationship("TherapySession")
    sender = relationship("User")


class AudioHistory(Base):
    __tablename__ = "audio_history"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("therapy_sessions.id"), nullable=False, index=True)
    provider = Column(String, nullable=False)
    voice_id = Column(String, nullable=True)
    instruction = Column(Text, nullable=True)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    sent_at = Column(DateTime, nullable=True)
    sent_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    session = relationship("TherapySession", back_populates="audio_history")
    creator = relationship("User", foreign_keys=[created_by], lazy="joined")
    sender = relationship("User", foreign_keys=[sent_by], lazy="joined")


class VerificationType(str, enum.Enum):
    EMAIL = "email"
    PHONE = "phone"


class VerificationCode(Base):
    __tablename__ = "verification_codes"
    __table_args__ = (
        UniqueConstraint("code", "type", name="uq_verification_code_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    code = Column(String(10), nullable=False)
    type = Column(SQLEnum(VerificationType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)

    user = relationship("User")

