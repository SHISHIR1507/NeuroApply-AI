"""
NeuroApply AI — Resume Parser
Offline preprocessing pipeline: extract text → structured parse via OpenAI → embed chunks.
This is NOT on the hot path — runs asynchronously after resume upload.
"""

import hashlib
import json
import re
from io import BytesIO
from typing import Optional, Dict, Any
from uuid import UUID

from pdfminer.high_level import extract_text as pdf_extract_text
from docx import Document as DocxDocument
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import ResumeData, UserProfile
from app.services.openai_client import openai_client
from app.services.vector_store import store_embeddings


# ==================================================================
# Text extraction
# ==================================================================

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from a PDF file."""
    return pdf_extract_text(BytesIO(file_bytes))


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract raw text from a DOCX file."""
    doc = DocxDocument(BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Route to the correct extractor based on file extension."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return extract_text_from_docx(file_bytes)
    elif ext == "txt":
        return file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError(f"Unsupported file type: .{ext}")


# ==================================================================
# Chunking for RAG embeddings
# ==================================================================

def chunk_text(
    text: str,
    chunk_size: int = None,
    overlap: int = None,
) -> list[str]:
    """
    Split text into overlapping chunks for embedding.
    Uses word-boundary splitting to avoid breaking mid-word.
    """
    chunk_size = chunk_size or settings.resume_chunk_size
    overlap = overlap or settings.resume_chunk_overlap

    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk.strip())
        start += chunk_size - overlap

    return chunks if chunks else [text.strip()] if text.strip() else []


# ==================================================================
# Structured extraction via OpenAI (gpt-4o-mini)
# ==================================================================

RESUME_EXTRACTION_PROMPT = """You are a precise resume parser. Extract structured data from the following resume text.

Return a valid JSON object with these fields (use null for missing data):
{
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "current_title": "string",
    "current_company": "string",
    "years_of_experience": number,
    "linkedin_url": "string",
    "github_url": "string",
    "portfolio_url": "string",
    "skills": ["string"],
    "education": [
        {
            "degree": "string",
            "university": "string",
            "graduation_year": "string",
            "gpa": "string"
        }
    ],
    "certifications": ["string"],
    "languages": ["string"],
    "work_experience": [
        {
            "title": "string",
            "company": "string",
            "duration": "string",
            "description": "string"
        }
    ],
    "projects": [
        {
            "name": "string",
            "description": "string",
            "technologies": ["string"]
        }
    ],
    "summary": "string"
}

IMPORTANT:
- Return ONLY valid JSON, no markdown, no explanations
- Extract real data from the resume, do not fabricate
- For years_of_experience, calculate from work history if not explicitly stated
- Normalize phone numbers to include country code if possible
- Extract ALL skills mentioned anywhere in the resume"""


async def parse_resume_with_llm(raw_text: str) -> Dict[str, Any]:
    """
    Send resume text to OpenAI for structured extraction.
    Uses gpt-4o-mini with low temperature for deterministic output.
    """
    response = await openai_client.chat_completion(
        system_prompt=RESUME_EXTRACTION_PROMPT,
        user_prompt=f"Resume text:\n\n{raw_text[:8000]}",  # Cap at 8K chars to stay within context
        temperature=0.05,
        max_tokens=4096,
    )

    # Clean response — sometimes LLMs wrap JSON in markdown code blocks
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: return raw text as a minimal structure
        return {"raw_text": raw_text, "parse_error": "Failed to parse LLM response"}


# ==================================================================
# Profile backfill — auto-populate empty profile fields from resume
# ==================================================================

RESUME_TO_PROFILE_MAPPING = {
    "full_name": "full_name",
    "phone": "phone",
    "location": "location",
    "current_title": "current_title",
    "current_company": "current_company",
    "years_of_experience": "years_of_experience",
    "linkedin_url": "linkedin_url",
    "github_url": "github_url",
    "portfolio_url": "portfolio_url",
    "skills": "skills",
    "education": "education",
    "certifications": "certifications",
    "languages": "languages",
}


async def backfill_profile_from_resume(
    db: AsyncSession,
    user_id: UUID,
    parsed_data: Dict[str, Any],
):
    """
    Auto-populate empty profile fields from parsed resume data.
    Only fills fields that are currently None — never overwrites user-set values.
    """
    result = await db.execute(
        select(UserProfile).where(UserProfile.id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return

    # List fields accumulate (merge + dedupe); scalar fields only fill when empty.
    LIST_FIELDS = {"skills", "certifications", "languages"}

    updated = False
    for resume_key, profile_key in RESUME_TO_PROFILE_MAPPING.items():
        resume_value = parsed_data.get(resume_key)
        if resume_value is None:
            continue

        if profile_key in LIST_FIELDS and isinstance(resume_value, list):
            existing = list(getattr(profile, profile_key, None) or [])
            lowered = {str(s).lower() for s in existing}
            for s in resume_value:
                if s and str(s).lower() not in lowered:
                    existing.append(s)
                    lowered.add(str(s).lower())
            if existing != (getattr(profile, profile_key, None) or []):
                setattr(profile, profile_key, existing)
                updated = True
        elif getattr(profile, profile_key, None) is None:
            setattr(profile, profile_key, resume_value)
            updated = True

    if updated:
        db.add(profile)
        await db.flush()


# ==================================================================
# Full pipeline — orchestrates the entire resume processing flow
# ==================================================================

async def process_resume(
    db: AsyncSession,
    user_id: UUID,
    file_bytes: bytes,
    filename: str,
) -> Dict[str, Any]:
    """
    Complete resume processing pipeline:
    1. Extract raw text
    2. Check for duplicate (hash-based)
    3. Structured extraction via OpenAI
    4. Backfill profile
    5. Generate embeddings via OpenAI
    6. Store everything
    """
    # 1. Extract raw text
    raw_text = extract_text(file_bytes, filename)
    if not raw_text.strip():
        return {"status": "error", "message": "Could not extract text from file"}

    # 2. Duplicate check
    file_hash = hashlib.sha256(raw_text.encode()).hexdigest()
    existing = await db.execute(
        select(ResumeData).where(
            ResumeData.user_id == user_id,
            ResumeData.file_hash == file_hash,
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "duplicate", "message": "This resume has already been processed"}

    # 3. Create record (status: processing)
    resume_record = ResumeData(
        user_id=user_id,
        raw_text=raw_text,
        parsed_json={},
        file_name=filename,
        file_hash=file_hash,
        status="processing",
    )
    db.add(resume_record)
    await db.flush()

    try:
        # 4. Structured extraction via OpenAI
        parsed_data = await parse_resume_with_llm(raw_text)
        resume_record.parsed_json = parsed_data
        resume_record.status = "completed"

        # 5. Backfill profile (only empty fields)
        await backfill_profile_from_resume(db, user_id, parsed_data)

        # 6. Generate embeddings + store
        chunks = chunk_text(raw_text)
        if chunks:
            embeddings = await openai_client.generate_embeddings(chunks)
            await store_embeddings(db, user_id, resume_record.id, chunks, embeddings)

        from datetime import datetime
        resume_record.parsed_at = datetime.utcnow()
        db.add(resume_record)
        await db.flush()

        return {
            "status": "completed",
            "resume_id": str(resume_record.id),
            "fields_extracted": len([v for v in parsed_data.values() if v is not None]),
            "chunks_embedded": len(chunks),
        }

    except Exception as e:
        resume_record.status = "failed"
        resume_record.parsed_json = {"error": str(e)}
        db.add(resume_record)
        await db.flush()
        return {"status": "failed", "message": str(e)}
