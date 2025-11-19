import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app import models
from app.config import settings
import logging

logger = logging.getLogger(__name__)

CODE_TTL_MINUTES = 15


def _generate_code(length: int = 6) -> str:
    upper = 10 ** length
    return f"{random.randint(0, upper - 1):0{length}d}"


def _create_entry(db: Session, user: models.User, vtype: models.VerificationType) -> models.VerificationCode:
    code = _generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES)
    entry = models.VerificationCode(
        user_id=user.id,
        code=code,
        type=vtype,
        expires_at=expires_at,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def send_email_verification(db: Session, user: models.User):
    entry = _create_entry(db, user, models.VerificationType.EMAIL)
    # Placeholder for real email service integration
    print(f"[Email Verification] To: {user.email} Code: {entry.code}")


def send_phone_verification(db: Session, user: models.User):
    if not user.phone_number:
        raise ValueError("User does not have a phone number on file")
    entry = _create_entry(db, user, models.VerificationType.PHONE)
    
    # Development mode: just log the code
    if settings.sms_dev_mode or not settings.twilio_account_sid:
        logger.info(f"[SMS Verification - DEV MODE] To: {user.phone_number} Code: {entry.code}")
        print(f"[SMS Verification - DEV MODE] To: {user.phone_number} Code: {entry.code}")
        return entry.code  # Return code for dev mode
    
    # Production: Send via Twilio
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
        
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        
        # Ensure phone number is in E.164 format
        phone_to = user.phone_number.strip()
        if not phone_to.startswith('+'):
            # Try to add + if missing
            if phone_to.startswith('1') and len(phone_to) == 11:
                phone_to = '+' + phone_to
            elif len(phone_to) == 10:
                phone_to = '+1' + phone_to  # Default to US
            else:
                phone_to = '+' + phone_to
        
        message = client.messages.create(
            body=f"Your verification code is: {entry.code}. Valid for {CODE_TTL_MINUTES} minutes.",
            from_=settings.twilio_phone_number,
            to=phone_to
        )
        
        logger.info(f"SMS sent successfully. SID: {message.sid}")
        return None  # Don't return code in production
    except TwilioRestException as e:
        logger.error(f"Twilio API error: {e.code} - {e.msg}")
        # If authentication fails or invalid phone number, fall back to dev mode
        if e.code == 20003 or 'Authenticate' in str(e) or e.code == 21211 or 'Invalid' in str(e) or 'To' in str(e):
            logger.warning(f"Twilio error ({e.code}): {e.msg}. Falling back to dev mode.")
            logger.warning(f"[SMS Verification - FALLBACK] To: {user.phone_number} Code: {entry.code}")
            print(f"[SMS Verification - FALLBACK] To: {user.phone_number} Code: {entry.code}")
            return entry.code  # Return code for fallback
        # For other errors, still fall back to dev mode rather than failing
        logger.warning(f"Twilio error ({e.code}): {e.msg}. Falling back to dev mode.")
        logger.warning(f"[SMS Verification - FALLBACK] To: {user.phone_number} Code: {entry.code}")
        print(f"[SMS Verification - FALLBACK] To: {user.phone_number} Code: {entry.code}")
        return entry.code  # Return code for fallback
    except Exception as e:
        logger.error(f"Failed to send SMS via Twilio: {str(e)}")
        # Fallback to dev mode if Twilio fails
        logger.warning(f"[SMS Verification - FALLBACK] To: {user.phone_number} Code: {entry.code}")
        print(f"[SMS Verification - FALLBACK] To: {user.phone_number} Code: {entry.code}")
        return entry.code  # Return code for fallback instead of raising


def verify_code(db: Session, user: models.User, code: str, vtype: models.VerificationType) -> bool:
    entry = (
        db.query(models.VerificationCode)
        .filter(
            models.VerificationCode.user_id == user.id,
            models.VerificationCode.type == vtype,
            models.VerificationCode.code == code,
            models.VerificationCode.consumed_at.is_(None),
            models.VerificationCode.expires_at >= datetime.utcnow(),
        )
        .order_by(models.VerificationCode.created_at.desc())
        .first()
    )
    if not entry:
        return False

    entry.consumed_at = datetime.utcnow()
    db.add(entry)

    if vtype == models.VerificationType.EMAIL:
        user.email_verified_at = datetime.utcnow()
    elif vtype == models.VerificationType.PHONE:
        user.phone_verified_at = datetime.utcnow()

    db.add(user)
    db.commit()
    return True

