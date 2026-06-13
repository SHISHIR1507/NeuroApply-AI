"""
NeuroApply AI — SQLModel Data Models
All database tables for user profiles, field mappings, answer history,
resume data, and resume embeddings (pgvector).
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector

from app.config import settings


# ------------------------------------------------------------------
# Helper: generate timestamped UUIDs
# ------------------------------------------------------------------
def _utcnow() -> datetime:
    return datetime.utcnow()


def _new_uuid() -> uuid.UUID:
    return uuid.uuid4()


# ==================================================================
# UserProfile — Core structured data (source of truth)
# ==================================================================
class UserProfile(SQLModel, table=True):
    __tablename__ = "user_profiles"

    id: uuid.UUID = Field(default_factory=_new_uuid, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    full_name: str = Field(max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)

    # --- Structured fields (high-priority answer source) ---
    years_of_experience: Optional[int] = Field(default=None)
    current_title: Optional[str] = Field(default=None, max_length=255)
    current_company: Optional[str] = Field(default=None, max_length=255)
    current_salary: Optional[str] = Field(default=None, max_length=100)
    expected_salary: Optional[str] = Field(default=None, max_length=100)
    notice_period: Optional[str] = Field(default=None, max_length=100)
    location: Optional[str] = Field(default=None, max_length=255)
    work_authorization: Optional[str] = Field(default=None, max_length=100)
    willing_to_relocate: Optional[bool] = Field(default=None)
    requires_sponsorship: Optional[bool] = Field(default=None)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    github_url: Optional[str] = Field(default=None, max_length=500)
    portfolio_url: Optional[str] = Field(default=None, max_length=500)

    # --- Skills & Education (structured arrays stored as JSONB) ---
    skills: Optional[List[str]] = Field(default=None, sa_column=Column(JSONB))
    education: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSONB))
    certifications: Optional[List[str]] = Field(default=None, sa_column=Column(JSONB))
    languages: Optional[List[str]] = Field(default=None, sa_column=Column(JSONB))

    # --- Metadata ---
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


# ==================================================================
# FieldMapping — Maps canonical keys to label variations per platform
# ==================================================================
class FieldMapping(SQLModel, table=True):
    __tablename__ = "field_mappings"

    id: uuid.UUID = Field(default_factory=_new_uuid, primary_key=True)
    canonical_key: str = Field(index=True, max_length=100)
    label_pattern: str = Field(max_length=500)  # the label text variation
    platform: str = Field(default="generic", max_length=50)
    field_type: str = Field(default="text", max_length=50)  # text, number, select, etc.

    __table_args__ = (
        UniqueConstraint("canonical_key", "label_pattern", "platform", name="uq_field_mapping"),
    )


# ==================================================================
# AnswerHistory — Previously provided answers for reuse
# ==================================================================
class AnswerHistory(SQLModel, table=True):
    __tablename__ = "answer_history"

    id: uuid.UUID = Field(default_factory=_new_uuid, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user_profiles.id", index=True)
    question_text: str = Field(sa_column=Column(Text))  # original label
    canonical_key: Optional[str] = Field(default=None, max_length=100)
    answer_value: str = Field(sa_column=Column(Text))
    platform: str = Field(default="generic", max_length=50)
    confidence: float = Field(default=1.0)
    times_used: int = Field(default=1)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    __table_args__ = (
        Index("ix_answer_history_user_question", "user_id", "canonical_key"),
    )


# ==================================================================
# ResumeData — Parsed and structured resume content
# ==================================================================
class ResumeData(SQLModel, table=True):
    __tablename__ = "resume_data"

    id: uuid.UUID = Field(default_factory=_new_uuid, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user_profiles.id", index=True)
    raw_text: str = Field(sa_column=Column(Text))
    parsed_json: Dict[str, Any] = Field(sa_column=Column(JSONB))
    file_name: str = Field(max_length=255)
    file_hash: str = Field(max_length=64, index=True)
    status: str = Field(default="processing", max_length=20)  # processing, completed, failed
    parsed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)


# ==================================================================
# ResumeEmbedding — pgvector chunk embeddings for RAG fallback
# ==================================================================
class ResumeEmbedding(SQLModel, table=True):
    __tablename__ = "resume_embeddings"

    id: uuid.UUID = Field(default_factory=_new_uuid, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user_profiles.id", index=True)
    resume_id: uuid.UUID = Field(foreign_key="resume_data.id", index=True)
    chunk_index: int = Field(default=0)
    chunk_text: str = Field(sa_column=Column(Text))
    embedding: List[float] = Field(
        sa_column=Column(Vector(settings.embedding_dimensions))
    )
    created_at: datetime = Field(default_factory=_utcnow)

    __table_args__ = (
        Index("ix_resume_embedding_user", "user_id"),
    )
