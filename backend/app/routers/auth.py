from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas
import logging

logger = logging.getLogger(__name__)
from app.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_user_by_email,
    get_user_by_username,
    get_user_by_phone,
    get_user_by_provider_id,
    get_current_user,
    settings
)
from app.services.google_oauth_service import verify_google_token, generate_username_from_email
from app.models import AuthProvider
from app.services import verification_service
from typing import List, Optional
from fastapi import Body

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    if get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    if get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = models.User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        role=user_data.role,
        hashed_password=hashed_password,
        phone_number=user_data.phone_number,
        bio=user_data.bio,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    try:
        verification_service.send_email_verification(db, db_user)
    except Exception as exc:  # pragma: no cover - best effort
        print(f"[WARN] Unable to send email verification: {exc}")

    return db_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    logger.info(f"Login attempt for username: {form_data.username}")
    try:
        user = authenticate_user(db, form_data.username, form_data.password)
        if not user:
            logger.warning(f"Login failed for username: {form_data.username} - user not found or invalid credentials")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        logger.info(f"Login successful for user: {user.username} (ID: {user.id})")
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login for username {form_data.username}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during login: {str(e)}"
        )

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.get("/users/psychologists", response_model=List[schemas.PsychologistSummary])
def list_psychologists(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """List all psychologists available for review/assignment with basic stats."""
    rows = (
        db.query(
            models.User,
            func.count(models.TherapySession.id).label("delivered_count"),
        )
        .outerjoin(models.TherapySession, models.TherapySession.psychologist_id == models.User.id)
        .filter(models.User.role == models.UserRole.PSYCHOLOGIST)
        .group_by(models.User.id)
        .order_by(models.User.full_name.asc())
        .all()
    )
    summaries = []
    for user, delivered_count in rows:
        summaries.append(
            schemas.PsychologistSummary(
                id=user.id,
                full_name=user.full_name,
                email=user.email,
                username=user.username,
                phone_number=user.phone_number,
                bio=user.bio,
                delivered_count=delivered_count or 0,
                is_email_verified=user.is_email_verified,
                is_phone_verified=user.is_phone_verified,
            )
        )
    return summaries

@router.patch("/me", response_model=schemas.UserResponse)
def update_me(
    full_name: Optional[str] = Body(default=None),
    password: Optional[str] = Body(default=None),
    phone_number: Optional[str] = Body(default=None),
    bio: Optional[str] = Body(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user's profile (full_name and/or password)."""
    if full_name is not None and full_name.strip():
        current_user.full_name = full_name.strip()
    if password is not None and password.strip():
        current_user.hashed_password = get_password_hash(password)
    if phone_number is not None:
        phone = phone_number.strip()
        current_user.phone_number = phone or None
        current_user.phone_verified_at = None
    if bio is not None:
        current_user.bio = bio.strip() or None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/request-email-verification")
def request_email_verification(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.is_email_verified:
        return {"message": "Email already verified"}
    verification_service.send_email_verification(db, current_user)
    return {"message": "Verification code sent to email."}


@router.post("/verify-email")
def verify_email(
    payload: schemas.VerificationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = verification_service.verify_code(db, current_user, payload.code, models.VerificationType.EMAIL)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")
    return {"message": "Email verified successfully"}


@router.post("/request-phone-verification")
def request_phone_verification(
    payload: schemas.PhoneVerificationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    current_user.phone_number = payload.phone_number.strip()
    current_user.phone_verified_at = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    verification_service.send_phone_verification(db, current_user)
    return {"message": "Verification code sent to phone."}


@router.post("/verify-phone")
def verify_phone(
    payload: schemas.VerificationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = verification_service.verify_code(db, current_user, payload.code, models.VerificationType.PHONE)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")
    return {"message": "Phone verified successfully"}

@router.post("/google/login", response_model=schemas.Token)
def google_oauth_login(
    payload: schemas.GoogleOAuthRequest,
    db: Session = Depends(get_db)
):
    """Login or register with Google OAuth"""
    if not settings.google_oauth_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured"
        )
    
    try:
        # Verify Google token
        google_user_info = verify_google_token(payload.token)
    except ValueError as e:
        logger.error(f"Google token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during Google login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing Google login: {str(e)}"
        )
    
    email = google_user_info.get('email')
    provider_id = google_user_info.get('sub')
    full_name = google_user_info.get('name', 'User')
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account does not have an email address"
        )
    
    # Check if user exists by provider_id or email
    user = get_user_by_provider_id(db, AuthProvider.GOOGLE.value, provider_id)
    if not user:
        user = get_user_by_email(db, email)
    
    if user:
        # Update provider info if needed
        if user.auth_provider != AuthProvider.GOOGLE.value or user.provider_id != provider_id:
            user.auth_provider = AuthProvider.GOOGLE.value
            user.provider_id = provider_id
            if google_user_info.get('email_verified'):
                user.email_verified_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
    else:
        # Create new user
        # Generate unique username
        base_username = generate_username_from_email(email)
        username = base_username
        counter = 1
        while get_user_by_username(db, username):
            username = f"{base_username}{counter}"
            counter += 1
        
        user = models.User(
            email=email,
            username=username,
            full_name=full_name,
            role=payload.role,
            hashed_password=None,  # No password for OAuth users
            auth_provider=AuthProvider.GOOGLE.value,
            provider_id=provider_id,
            email_verified_at=datetime.utcnow() if google_user_info.get('email_verified') else None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Generate JWT token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/phone/request-otp")
def phone_request_otp(
    payload: schemas.PhoneLoginOTPRequest,
    db: Session = Depends(get_db)
):
    """Request OTP for phone number login"""
    try:
        phone_number = payload.phone_number.strip()
        if not phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required"
            )
        
        logger.info(f"OTP request for phone number: {phone_number}")
        
        # Check if user exists
        user = get_user_by_phone(db, phone_number)
        
        if not user:
            # Create a temporary user for OTP verification
            # Generate unique username
            base_username = f"user_{phone_number.replace('+', '').replace('-', '').replace(' ', '')}"
            username = base_username
            counter = 1
            while get_user_by_username(db, username):
                username = f"{base_username}{counter}"
                counter += 1
            
            user = models.User(
                email=None,  # Will be set later if needed
                username=username,
                full_name=f"User {phone_number}",  # Temporary, can be updated later
                role=payload.role,
                hashed_password=None,
                phone_number=phone_number,
                auth_provider=AuthProvider.PHONE.value,
                phone_verified_at=None
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user for phone login: {user.username}")
        
        # Send OTP
        try:
            otp_code = verification_service.send_phone_verification(db, user)
            response = {"message": "OTP sent to phone number"}
            # If OTP code is returned (dev mode or fallback), include it in response
            if otp_code:
                response["otp_code"] = otp_code
                response["dev_mode"] = True
                response["message"] = "OTP sent (DEV MODE - check console/response for code)"
            logger.info(f"OTP sent successfully for phone: {phone_number}")
            return response
        except ValueError as e:
            logger.error(f"ValueError sending OTP: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            logger.error(f"Error sending OTP: {str(e)}", exc_info=True)
            # Even if sending fails, return the OTP code if available (fallback mode)
            # This ensures the user can still login in dev/test environments
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send OTP: {str(e)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in phone_request_otp: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )

@router.post("/phone/login", response_model=schemas.Token)
def phone_login(
    payload: schemas.PhoneLoginRequest,
    db: Session = Depends(get_db)
):
    """Login with phone number and OTP"""
    phone_number = payload.phone_number.strip()
    
    user = get_user_by_phone(db, phone_number)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone number not found. Please request OTP first."
        )
    
    # Verify OTP
    success = verification_service.verify_code(db, user, payload.code, models.VerificationType.PHONE)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Update user role if needed (in case they want to switch)
    if user.role != payload.role:
        user.role = payload.role
        db.commit()
        db.refresh(user)
    
    # Generate JWT token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

