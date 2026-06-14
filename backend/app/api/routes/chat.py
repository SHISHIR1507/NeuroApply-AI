"""
NeuroApply AI — Chat Route
Conversational profile builder. Extracts profile fields from natural
language and saves them, returning a friendly reply.
"""

import json
import re
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.api.schemas import ChatRequest, ChatResponse
from app.models import UserProfile
from app.services.openai_client import openai_client
from app.services.cache import cache_service
from app.core.logging import get_logger

logger = get_logger("api.chat")
router = APIRouter(prefix="/chat", tags=["chat"])

_SYSTEM_PROMPT = """You are NeuroApply's profile assistant. Help users build their job application profile through natural conversation.

When the user provides profile information, extract it and return JSON with:
- "updates": object with profile fields extracted (only fields the user explicitly mentioned)
- "reply": a short, friendly confirmation of what was saved, or an answer to their question

Extractable profile fields:
- full_name (string)
- phone (string)
- location (string)
- years_of_experience (integer — digits only, no units)
- current_title (string)
- current_company (string)
- current_salary (string — keep exactly as stated: "4 LPA", "40000", etc.)
- expected_salary (string — keep exactly as stated: "6 LPA", "60000", etc.)
- notice_period (string — e.g. "1 month", "2 weeks", "immediate")
- work_authorization (string — e.g. "Authorized to work", "Need sponsorship")
- willing_to_relocate (boolean)
- requires_sponsorship (boolean)
- linkedin_url (string)
- github_url (string)
- skills (array of strings)

Rules:
- Only put fields in "updates" that the user actually mentioned in this message
- Keep salary values exactly as the user wrote them
- If the user is asking a question about their profile, answer from the "Current profile" context
- Keep "reply" to 1–2 sentences max, be warm and direct
- If nothing is extractable, set "updates" to {}

Return ONLY valid JSON: {"updates": {...}, "reply": "..."}"""


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Conversational profile builder.
    Parses natural language, extracts profile fields, saves them, replies naturally.
    """
    # Fetch current profile for context
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    profile = result.scalar_one_or_none()

    profile_context = {}
    if profile:
        profile_context = {
            k: v for k, v in profile.model_dump().items()
            if v is not None and k not in ("hashed_password", "id", "created_at", "updated_at")
        }

    # Build system prompt with current profile context
    system = _SYSTEM_PROMPT
    if profile_context:
        system += f"\n\nCurrent profile:\n{json.dumps(profile_context, default=str, indent=2)}"

    # Prior conversation turns (last 6 messages for context)
    history_messages = None
    if request.history:
        history_messages = [
            {"role": t.role, "content": t.content}
            for t in request.history[-6:]
        ]

    # Call LLM
    raw = await openai_client.chat_completion(
        system_prompt=system,
        user_prompt=request.message,
        temperature=0.3,
        max_tokens=300,
        messages=history_messages,
    )

    # Parse JSON response
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning(f"Chat LLM returned non-JSON: {raw[:200]}")
        return ChatResponse(reply=raw.strip(), updated_fields={})

    updates: dict = parsed.get("updates", {})
    reply: str = parsed.get("reply", "Got it!")

    # Apply updates to profile
    if updates and profile:
        allowed = {
            "full_name", "phone", "location", "years_of_experience",
            "current_title", "current_company", "current_salary", "expected_salary",
            "notice_period", "work_authorization", "willing_to_relocate",
            "requires_sponsorship", "linkedin_url", "github_url", "skills",
        }
        applied = {}
        for key, value in updates.items():
            if key in allowed and value is not None:
                setattr(profile, key, value)
                applied[key] = value

        if applied:
            profile.updated_at = datetime.utcnow()
            db.add(profile)
            await db.commit()
            await cache_service.invalidate_profile(str(user_id))
            logger.info(f"Chat updated profile fields: {list(applied.keys())}")
            updates = applied

    return ChatResponse(reply=reply, updated_fields=updates)
