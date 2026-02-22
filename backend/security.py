"""
Security utilities for Legenddary Platform
JWT handling, password hashing, token management
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import secrets
import hashlib
from config import get_settings

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenPayload(BaseModel):
    sub: str
    type: str
    exp: datetime
    iat: datetime


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# Password functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# JWT Token functions
def create_access_token(user_id: str, additional_claims: dict = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": user_id,
        "type": "access",
        "iat": now,
        "exp": expire
    }
    
    if additional_claims:
        payload.update(additional_claims)
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": expire
    }
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_token_pair(user_id: str, additional_claims: dict = None) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user_id, additional_claims),
        refresh_token=create_refresh_token(user_id)
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Check expiration with timezone awareness
        exp = payload.get("exp")
        if exp:
            exp_datetime = datetime.fromtimestamp(exp, tz=timezone.utc)
            if exp_datetime < datetime.now(timezone.utc):
                return None
        
        return payload
    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[str]:
    payload = decode_token(token)
    if payload and payload.get("type") == "access":
        return payload.get("sub")
    return None


def verify_refresh_token(token: str) -> Optional[str]:
    payload = decode_token(token)
    if payload and payload.get("type") == "refresh":
        return payload.get("sub")
    return None


# Password Reset Token functions
def create_password_reset_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    
    # Create a unique token with timestamp
    random_string = secrets.token_urlsafe(32)
    
    payload = {
        "sub": user_id,
        "email": email,
        "type": "password_reset",
        "iat": now,
        "exp": expire,
        "jti": random_string  # Unique token ID
    }
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_password_reset_token(token: str) -> Optional[Tuple[str, str]]:
    payload = decode_token(token)
    if payload and payload.get("type") == "password_reset":
        return payload.get("sub"), payload.get("email")
    return None


# Email verification token
def create_email_verification_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=24)
    
    payload = {
        "sub": user_id,
        "email": email,
        "type": "email_verification",
        "iat": now,
        "exp": expire
    }
    
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_email_verification_token(token: str) -> Optional[Tuple[str, str]]:
    payload = decode_token(token)
    if payload and payload.get("type") == "email_verification":
        return payload.get("sub"), payload.get("email")
    return None


# API Key generation for future use
def generate_api_key() -> str:
    return f"ldd_{secrets.token_urlsafe(32)}"


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()
