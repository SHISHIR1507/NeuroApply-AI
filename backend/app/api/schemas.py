"""
NeuroApply AI — Pydantic Schemas
Request/Response models for all API endpoints.
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, EmailStr, Field


# ==================================================================
# Auth Schemas
# ==================================================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ==================================================================
# Profile Schemas
# ==================================================================

class ProfileResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    years_of_experience: Optional[int] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    notice_period: Optional[str] = None
    location: Optional[str] = None
    work_authorization: Optional[str] = None
    willing_to_relocate: Optional[bool] = None
    requires_sponsorship: Optional[bool] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: Optional[List[str]] = None
    education: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    years_of_experience: Optional[int] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    current_salary: Optional[str] = None
    expected_salary: Optional[str] = None
    notice_period: Optional[str] = None
    location: Optional[str] = None
    work_authorization: Optional[str] = None
    willing_to_relocate: Optional[bool] = None
    requires_sponsorship: Optional[bool] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: Optional[List[str]] = None
    education: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[str]] = None
    languages: Optional[List[str]] = None


# ==================================================================
# Field Resolution Schemas
# ==================================================================

class FieldRequest(BaseModel):
    """A single form field extracted from a job application."""
    id: str
    label: str
    type: str = "text"  # text, number, select, radio, textarea, checkbox
    required: bool = False
    options: Optional[List[str]] = None  # for select/radio fields
    current_value: Optional[str] = None  # pre-filled value


class ResolveFieldsRequest(BaseModel):
    """Batch field resolution request from the extension."""
    fields: List[FieldRequest]
    platform: str = "linkedin"
    job_url: Optional[str] = None
    job_title: Optional[str] = None


class FieldResponse(BaseModel):
    """Resolved answer for a single form field."""
    field_id: str
    label: str
    value: Optional[str] = None
    source: str  # cache, profile, history, resume_rag, unknown
    confidence: float = 0.0
    canonical_key: Optional[str] = None


class ResolveFieldsResponse(BaseModel):
    """Batch field resolution response."""
    fields: List[FieldResponse]
    resolved_count: int
    total_count: int
    latency_ms: float


# ==================================================================
# Feedback Schemas
# ==================================================================

class FeedbackRequest(BaseModel):
    """User correction for an autofilled field."""
    field_label: str
    corrected_value: str
    original_value: Optional[str] = None
    platform: str = "linkedin"
    canonical_key: Optional[str] = None


class FeedbackResponse(BaseModel):
    status: str
    message: str


# ==================================================================
# Resume Schemas
# ==================================================================

class ResumeStatusResponse(BaseModel):
    resume_id: uuid.UUID
    status: str  # processing, completed, failed
    file_name: str
    fields_extracted: Optional[int] = None
    chunks_embedded: Optional[int] = None
    created_at: datetime
    parsed_at: Optional[datetime] = None


class ResumeUploadResponse(BaseModel):
    status: str
    message: str
    resume_id: Optional[str] = None
    fields_extracted: Optional[int] = None
    chunks_embedded: Optional[int] = None
