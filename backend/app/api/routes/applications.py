"""
NeuroApply AI — Job Application Tracking Routes
Logs each submitted application (from the extension) and powers dashboard stats.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.models import JobApplication

router = APIRouter(prefix="/applications", tags=["applications"])

# Estimated minutes saved per auto-filled application (used for "time saved").
MINUTES_SAVED_PER_APP = 4


class LogApplicationRequest(BaseModel):
    company: Optional[str] = None
    job_title: Optional[str] = None
    platform: str = "linkedin"
    job_url: Optional[str] = None
    fields_filled: int = 0


class ApplicationItem(BaseModel):
    id: UUID
    company: Optional[str]
    job_title: Optional[str]
    platform: str
    job_url: Optional[str]
    fields_filled: int
    applied_at: datetime


class ApplicationStats(BaseModel):
    total_applied: int
    this_week: int
    time_saved_minutes: int
    fields_filled: int


@router.post("", response_model=ApplicationItem, status_code=201)
async def log_application(
    body: LogApplicationRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Record a submitted application. Called by the extension on submit."""
    app = JobApplication(
        user_id=user_id,
        company=body.company,
        job_title=body.job_title,
        platform=body.platform,
        job_url=body.job_url,
        fields_filled=body.fields_filled,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.get("", response_model=list[ApplicationItem])
async def list_applications(
    limit: int = 10,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Most recent applications for the current user."""
    result = await db.execute(
        select(JobApplication)
        .where(JobApplication.user_id == user_id)
        .order_by(JobApplication.applied_at.desc())
        .limit(min(limit, 50))
    )
    return list(result.scalars().all())


@router.get("/stats", response_model=ApplicationStats)
async def application_stats(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate stats for the dashboard."""
    week_ago = datetime.utcnow() - timedelta(days=7)

    total = await db.scalar(
        select(func.count()).select_from(JobApplication).where(JobApplication.user_id == user_id)
    ) or 0
    this_week = await db.scalar(
        select(func.count()).select_from(JobApplication)
        .where(JobApplication.user_id == user_id, JobApplication.applied_at >= week_ago)
    ) or 0
    fields = await db.scalar(
        select(func.coalesce(func.sum(JobApplication.fields_filled), 0))
        .where(JobApplication.user_id == user_id)
    ) or 0

    return ApplicationStats(
        total_applied=int(total),
        this_week=int(this_week),
        time_saved_minutes=int(total) * MINUTES_SAVED_PER_APP,
        fields_filled=int(fields),
    )
