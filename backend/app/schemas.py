from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models import UserRole, TherapyStatus
from typing import List

# User schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: str
    full_name: str
    role: UserRole
    phone_number: Optional[str] = None
    bio: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr  # Required for traditional registration
    username: str
    full_name: str
    role: UserRole
    password: str
    phone_number: Optional[str] = None
    bio: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_email_verified: bool
    is_phone_verified: bool
    
    class Config:
        from_attributes = True

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Therapy session schemas
class TherapySessionBase(BaseModel):
    user_input: str

class TherapySessionCreate(TherapySessionBase):
    language: Optional[str] = "English"

class TherapySessionUpdate(BaseModel):
    approved_text: Optional[str] = None
    status: Optional[TherapyStatus] = None

class AssignPsychologistRequest(BaseModel):
    psychologist_id: int

class AudioHistoryResponse(BaseModel):
    id: int
    session_id: int
    provider: str
    voice_id: Optional[str]
    instruction: Optional[str]
    file_path: str
    created_at: datetime
    created_by: int
    sent_at: Optional[datetime]
    sent_by: Optional[int]

    class Config:
        from_attributes = True

class TherapySessionResponse(BaseModel):
    id: int
    patient_id: int
    psychologist_id: Optional[int]
    user_input: str
    generated_text: Optional[str]
    approved_text: Optional[str]
    audio_file_path: Optional[str]
    status: TherapyStatus
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime]
    patient: Optional[UserResponse] = None
    audio_history: List[AudioHistoryResponse] = []
    
    class Config:
        from_attributes = True

# Chat schemas
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    id: str
    session_id: int
    sender_id: int
    content: str
    is_ai_message: bool = False
    created_at: datetime


class TherapySessionPatientUpdate(BaseModel):
    user_input: str

# Prompt-based generation
class PromptGenerateRequest(BaseModel):
    prompt: str
    base_text: Optional[str] = None

class PromptGenerateResponse(BaseModel):
    revised_text: str


class VerificationRequest(BaseModel):
    code: str


class PhoneVerificationRequest(BaseModel):
    phone_number: str


class PsychologistSummary(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    username: str
    phone_number: Optional[str]
    bio: Optional[str]
    delivered_count: int
    is_email_verified: bool
    is_phone_verified: bool

    class Config:
        from_attributes = True

# OAuth and Phone Login schemas
class GoogleOAuthRequest(BaseModel):
    token: str
    role: UserRole

class PhoneLoginRequest(BaseModel):
    phone_number: str
    code: str
    role: UserRole

class PhoneLoginOTPRequest(BaseModel):
    phone_number: str
    role: UserRole

