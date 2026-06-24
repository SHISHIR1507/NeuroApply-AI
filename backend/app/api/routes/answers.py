"""
NeuroApply AI — Answer Library Routes
Lets users view, edit, and delete the answers NeuroApply has learned
(the answer_history table) — transparency + control over autofill.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.models import AnswerHistory
from app.services.field_mapper import generate_field_hash
from app.services.cache import cache_service

router = APIRouter(prefix="/answers", tags=["answers"])


class AnswerItem(BaseModel):
    id: UUID
    question_text: str
    answer_value: str
    canonical_key: Optional[str]
    platform: str
    times_used: int
    updated_at: datetime


class UpdateAnswerRequest(BaseModel):
    answer_value: str


async def _invalidate(user_id: UUID, question_text: str):
    """Drop the cached resolution so the new value is used next time."""
    try:
        field_hash = generate_field_hash(question_text)
        await cache_service.delete(f"answer:{user_id}:{field_hash}")
    except Exception:
        pass


@router.get("", response_model=list[AnswerItem])
async def list_answers(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """All learned answers for the current user, most recently used first."""
    result = await db.execute(
        select(AnswerHistory)
        .where(AnswerHistory.user_id == user_id)
        .order_by(AnswerHistory.updated_at.desc())
    )
    return list(result.scalars().all())


@router.put("/{answer_id}", response_model=AnswerItem)
async def update_answer(
    answer_id: UUID,
    body: UpdateAnswerRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Edit a learned answer's value."""
    result = await db.execute(
        select(AnswerHistory).where(
            AnswerHistory.id == answer_id, AnswerHistory.user_id == user_id
        )
    )
    answer = result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")

    answer.answer_value = body.answer_value.strip()
    answer.updated_at = datetime.utcnow()
    db.add(answer)
    await db.commit()
    await db.refresh(answer)
    await _invalidate(user_id, answer.question_text)
    return answer


@router.delete("/{answer_id}", status_code=204)
async def delete_answer(
    answer_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Forget a learned answer."""
    result = await db.execute(
        select(AnswerHistory).where(
            AnswerHistory.id == answer_id, AnswerHistory.user_id == user_id
        )
    )
    answer = result.scalar_one_or_none()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")

    question = answer.question_text
    await db.delete(answer)
    await db.commit()
    await _invalidate(user_id, question)
    return None
