"""
NeuroApply AI — Dependency Injection
FastAPI dependencies for DB sessions, Redis, and current user extraction.
"""

from uuid import UUID
from typing import AsyncGenerator

from fastapi import Depends, Header
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.core.security import decode_token
from app.core.exceptions import CredentialsException


# ------------------------------------------------------------------
# Database session
# ------------------------------------------------------------------

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async DB session for the request lifecycle."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# ------------------------------------------------------------------
# Current user extraction from JWT
# ------------------------------------------------------------------

async def get_current_user_id(
    authorization: str = Header(..., description="Bearer <token>"),
) -> UUID:
    """
    Extract and validate the current user ID from the Authorization header.
    Expected format: "Bearer <jwt_token>"
    """
    if not authorization.startswith("Bearer "):
        raise CredentialsException("Invalid authorization header format")

    token = authorization[7:]  # Strip "Bearer "

    try:
        payload = decode_token(token)
    except JWTError:
        raise CredentialsException("Invalid or expired token")

    user_id_str = payload.get("sub")
    token_type = payload.get("type")

    if not user_id_str or token_type != "access":
        raise CredentialsException("Invalid token payload")

    try:
        return UUID(user_id_str)
    except ValueError:
        raise CredentialsException("Invalid user ID in token")
