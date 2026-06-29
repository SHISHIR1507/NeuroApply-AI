"""
NeuroApply AI — ATS Score Routes
Scores how well the user's resume matches a job description, with matched /
missing keywords and concrete suggestions. JD is supplied by the extension
(scraped from the LinkedIn page) — no copy-paste needed.
"""

import json
import re
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.models import ResumeData, UserProfile
from app.services.openai_client import openai_client
from app.core.logging import get_logger

router = APIRouter(prefix="/ats", tags=["ats"])
logger = get_logger("ats")


class ATSRequest(BaseModel):
    job_description: str
    job_title: Optional[str] = None


class ATSResponse(BaseModel):
    score: int
    matched: list[str]
    missing: list[str]
    suggestions: list[str]
    summary: str


_SYSTEM = """You are an expert ATS (Applicant Tracking System) and technical recruiter.
Given a JOB DESCRIPTION and a CANDIDATE (their resume text + structured profile), evaluate how
well the candidate matches, the way a real ATS + recruiter would.

Return ONLY a JSON object (no markdown, no prose) with exactly these keys:
{
  "score": <integer 0-100, where 75+ means likely to pass screening>,
  "matched": [<up to 12 important skills/keywords from the JD that ARE present in the candidate>],
  "missing": [<up to 10 important skills/keywords required by the JD that are MISSING or weak>],
  "suggestions": [<2-4 short, specific, actionable tips to raise the score — e.g. "Add 'Kubernetes' to your skills if you have it">],
  "summary": "<one encouraging sentence summarizing the fit>"
}
Weigh hard skills, tools, years of experience, and role-specific keywords most. Consider semantic
matches (e.g. 'revenue growth' ≈ 'ARR expansion'). Be honest but constructive."""


@router.post("/score", response_model=ATSResponse)
async def score_resume_against_jd(
    body: ATSRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    jd = (body.job_description or "").strip()
    if len(jd) < 40:
        raise HTTPException(status_code=400, detail="Job description is too short to analyze.")

    # Candidate context: latest resume text + structured profile.
    resume_text = ""
    res = await db.execute(
        select(ResumeData).where(ResumeData.user_id == user_id).order_by(ResumeData.created_at.desc()).limit(1)
    )
    resume = res.scalar_one_or_none()
    if resume and resume.raw_text:
        resume_text = resume.raw_text[:6000]

    prof_res = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    profile = prof_res.scalar_one_or_none()
    profile_bits = {}
    if profile:
        profile_bits = {
            "current_title": profile.current_title,
            "years_of_experience": profile.years_of_experience,
            "skills": profile.skills,
            "current_company": profile.current_company,
        }

    if not resume_text and not (profile and profile.skills):
        raise HTTPException(status_code=400, detail="Upload your resume or add skills first so we can score the match.")

    user_prompt = (
        f"JOB TITLE: {body.job_title or 'N/A'}\n\n"
        f"JOB DESCRIPTION:\n{jd[:6000]}\n\n"
        f"CANDIDATE PROFILE:\n{json.dumps(profile_bits, default=str)}\n\n"
        f"CANDIDATE RESUME TEXT:\n{resume_text or '(no resume uploaded)'}"
    )

    try:
        raw = await openai_client.chat_completion(
            system_prompt=_SYSTEM, user_prompt=user_prompt, temperature=0, max_tokens=600,
        )
    except Exception as e:
        logger.error(f"ATS scoring failed: {e}")
        raise HTTPException(status_code=502, detail="Scoring service is busy — try again in a moment.")

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    try:
        data = json.loads(cleaned)
    except Exception:
        logger.warning(f"ATS bad JSON: {cleaned[:200]}")
        raise HTTPException(status_code=502, detail="Couldn't parse the score — try again.")

    score = max(0, min(100, int(data.get("score", 0))))
    return ATSResponse(
        score=score,
        matched=[str(s) for s in (data.get("matched") or [])][:12],
        missing=[str(s) for s in (data.get("missing") or [])][:10],
        suggestions=[str(s) for s in (data.get("suggestions") or [])][:4],
        summary=str(data.get("summary", "")),
    )
