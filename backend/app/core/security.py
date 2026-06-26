"""
NeuroApply AI — JWT Security & Password Hashing
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import settings

# ------------------------------------------------------------------
# Password hashing (bcrypt)
# ------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def hash_password(password: str) -> str:
    return await asyncio.to_thread(pwd_context.hash, password)


async def verify_password(plain_password: str, hashed_password: str) -> bool:
    return await asyncio.to_thread(pwd_context.verify, plain_password, hashed_password)


# ------------------------------------------------------------------
# JWT token creation & validation
# ------------------------------------------------------------------
def create_access_token(user_id: UUID, expires_delta: Optional[timedelta] = None) -> str:
    """Create a short-lived access token."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: UUID) -> str:
    """Create a long-lived refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    Raises JWTError on invalid/expired tokens.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError:
        raise
