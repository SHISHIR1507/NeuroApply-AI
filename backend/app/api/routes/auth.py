"""
NeuroApply AI — Auth Routes
Register, login, and token refresh endpoints.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.schemas import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import ConflictException, CredentialsException
from app.models import UserProfile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account."""
    # Check for existing email
    existing = await db.execute(
        select(UserProfile).where(UserProfile.email == request.email)
    )
    if existing.scalar_one_or_none():
        raise ConflictException("An account with this email already exists")

    # Create user
    user = UserProfile(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
    )
    db.add(user)
    await db.flush()

    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate and receive access + refresh tokens."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.email == request.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise CredentialsException("Invalid email or password")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest):
    """Exchange a refresh token for new access + refresh tokens."""
    try:
        payload = decode_token(request.refresh_token)
    except Exception:
        raise CredentialsException("Invalid or expired refresh token")

    if payload.get("type") != "refresh":
        raise CredentialsException("Invalid token type")

    from uuid import UUID
    user_id = UUID(payload["sub"])

    access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )
