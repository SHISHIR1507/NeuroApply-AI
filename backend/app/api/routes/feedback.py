"""
NeuroApply AI — Feedback Routes
Stores user corrections to autofilled answers for the learning loop.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.api.schemas import FeedbackRequest, FeedbackResponse
from app.models import AnswerHistory
from app.services.field_mapper import map_to_canonical, generate_field_hash
from app.services.cache import cache_service

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Store a user correction for an autofilled field.
    
    Learning loop:
    1. Map the field label to a canonical key (if possible)
    2. Check if this question was answered before → update it
    3. Otherwise, create a new answer history entry
    4. Update Redis cache immediately for instant future lookups
    """
    # Map label to canonical key
    canonical_key = request.canonical_key
    if not canonical_key:
        mapped_key, confidence = map_to_canonical(request.field_label)
        canonical_key = mapped_key

    question_text = request.field_label.lower().strip()

    # Check for existing answer
    result = await db.execute(
        select(AnswerHistory).where(
            AnswerHistory.user_id == user_id,
            AnswerHistory.question_text == question_text,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Update existing answer
        existing.answer_value = request.corrected_value
        existing.canonical_key = canonical_key
        existing.confidence = 1.0  # User-corrected = max confidence
        existing.times_used += 1
        existing.updated_at = datetime.utcnow()
        db.add(existing)
    else:
        # Create new answer
        answer = AnswerHistory(
            user_id=user_id,
            question_text=question_text,
            canonical_key=canonical_key,
            answer_value=request.corrected_value,
            platform=request.platform,
            confidence=1.0,
            times_used=1,
        )
        db.add(answer)

    await db.commit()

    # Update Redis cache immediately
    field_hash = generate_field_hash(request.field_label)
    await cache_service.cache_answer(str(user_id), field_hash, request.corrected_value)

    return FeedbackResponse(
        status="saved",
        message=f"Answer stored for '{request.field_label}'" + (
            f" (mapped to: {canonical_key})" if canonical_key else ""
        ),
    )
