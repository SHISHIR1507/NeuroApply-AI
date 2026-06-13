"""
NeuroApply AI — Profile Routes
GET and PUT endpoints for user profile management.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.api.schemas import ProfileResponse, ProfileUpdateRequest
from app.core.exceptions import NotFoundException
from app.models import UserProfile
from app.services.cache import cache_service

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileResponse)
async def get_profile(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's profile."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundException("Profile")
    return profile


@router.put("", response_model=ProfileResponse)
async def update_profile(
    update: ProfileUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile. Only non-null fields are updated."""
    result = await db.execute(
        select(UserProfile).where(UserProfile.id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundException("Profile")

    # Apply updates (only for fields that are explicitly set)
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    profile.updated_at = datetime.utcnow()
    db.add(profile)
    await db.commit()

    # Invalidate cached profile
    await cache_service.invalidate_profile(str(user_id))

    return profile
