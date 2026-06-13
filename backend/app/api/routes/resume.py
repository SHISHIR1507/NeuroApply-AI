"""
NeuroApply AI — Resume Routes
Upload and status-check endpoints for resume processing.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.api.schemas import ResumeUploadResponse, ResumeStatusResponse
from app.core.exceptions import BadRequestException
from app.config import settings
from app.models import ResumeData, ResumeEmbedding
from app.services.resume_parser import process_resume

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/upload", response_model=ResumeUploadResponse, status_code=202)
async def upload_resume(
    file: UploadFile = File(..., description="PDF, DOCX, or TXT resume"),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a resume for processing.
    
    The pipeline:
    1. Extracts text from PDF/DOCX/TXT
    2. Sends to OpenAI (gpt-4o-mini) for structured extraction
    3. Auto-fills empty profile fields from resume data
    4. Generates embeddings (text-embedding-3-small) for RAG
    5. Stores everything in PostgreSQL + pgvector

    Note: This is an offline operation. For production, this should be
    moved to a background task queue (e.g., Celery/ARQ). For MVP,
    we process synchronously.
    """
    # Validate file type
    if not file.filename:
        raise BadRequestException("File name is required")

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ("pdf", "docx", "doc", "txt"):
        raise BadRequestException(f"Unsupported file type: .{ext}. Use PDF, DOCX, or TXT.")

    # Validate file size
    file_bytes = await file.read()
    max_bytes = settings.max_resume_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise BadRequestException(f"File too large. Max size: {settings.max_resume_size_mb}MB")

    # Process
    result = await process_resume(db, user_id, file_bytes, file.filename)
    await db.commit()

    return ResumeUploadResponse(
        status=result["status"],
        message=result.get("message", "Resume processed successfully"),
        resume_id=result.get("resume_id"),
        fields_extracted=result.get("fields_extracted"),
        chunks_embedded=result.get("chunks_embedded"),
    )


@router.get("/status", response_model=list[ResumeStatusResponse])
async def get_resume_status(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get status of all uploaded resumes for the current user."""
    result = await db.execute(
        select(ResumeData)
        .where(ResumeData.user_id == user_id)
        .order_by(ResumeData.created_at.desc())
    )
    resumes = result.scalars().all()

    if not resumes:
        return []

    # Count embeddings per resume in one query
    resume_ids = [r.id for r in resumes]
    counts_result = await db.execute(
        select(ResumeEmbedding.resume_id, func.count(ResumeEmbedding.id))
        .where(ResumeEmbedding.resume_id.in_(resume_ids))
        .group_by(ResumeEmbedding.resume_id)
    )
    chunk_counts = {row[0]: row[1] for row in counts_result.fetchall()}

    return [
        ResumeStatusResponse(
            resume_id=r.id,
            status=r.status,
            file_name=r.file_name,
            fields_extracted=(
                len([v for v in r.parsed_json.values() if v is not None])
                if r.parsed_json and isinstance(r.parsed_json, dict)
                else None
            ),
            chunks_embedded=chunk_counts.get(r.id, 0),
            created_at=r.created_at,
            parsed_at=r.parsed_at,
        )
        for r in resumes
    ]
