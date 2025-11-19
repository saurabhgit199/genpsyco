from google.oauth2 import id_token
from google.auth.transport import requests
from app.config import settings
import secrets
import string

def generate_username_from_email(email: str) -> str:
    """Generate a unique username from email"""
    base_username = email.split('@')[0].lower()
    # Remove special characters, keep only alphanumeric
    base_username = ''.join(c for c in base_username if c.isalnum())
    # Add random suffix to ensure uniqueness
    random_suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
    return f"{base_username}_{random_suffix}"

def verify_google_token(token: str) -> dict:
    """
    Verify Google OAuth token and return user info
    Returns dict with: email, name, sub (Google user ID), picture
    """
    if not settings.google_oauth_client_id:
        raise ValueError("Google OAuth Client ID is not configured")
    
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.google_oauth_client_id
        )
        
        # Verify the issuer
        if idinfo.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError(f'Wrong issuer: {idinfo.get("iss")}')
        
        return {
            'email': idinfo.get('email'),
            'name': idinfo.get('name', ''),
            'sub': idinfo.get('sub'),  # Google user ID
            'picture': idinfo.get('picture'),
            'email_verified': idinfo.get('email_verified', False)
        }
    except ValueError as e:
        raise ValueError(f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error verifying Google token: {str(e)}")

