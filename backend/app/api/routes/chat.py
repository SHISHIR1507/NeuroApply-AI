"""
NeuroApply AI — Chat Route
Two modes:
  POST /chat/field — normalize & save a single profile field from a raw natural-language answer
  POST /chat       — free-form conversation for updates after onboarding
"""

import json
import re
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.api.schemas import (
    ChatRequest, ChatResponse,
    FieldAnswerRequest, FieldAnswerResponse,
)
from app.models import UserProfile
from app.services.openai_client import openai_client
from app.services.cache import cache_service
from app.core.logging import get_logger

logger = get_logger("api.chat")
router = APIRouter(prefix="/chat", tags=["chat"])


# ==================================================================
# Per-field normalization instructions for the LLM
# ==================================================================

_FIELD_RULES: dict[str, str] = {
    "full_name": (
        "Extract and return the person's full name, properly capitalized. "
        "If they write 'shishir singh', return 'Shishir Singh'. "
        "If no valid name, set valid=false."
    ),
    "current_title": (
        "Extract the job title. Standardize abbreviations: "
        "'SDE' → 'Software Development Engineer', 'dev' → 'Developer', 'eng' → 'Engineer'. "
        "Return a clean, properly capitalized title."
    ),
    "current_company": (
        "Extract the company name. If they say 'fresher', 'no job', 'between jobs', "
        "'not working', 'student', return 'Fresher'. Return just the company name."
    ),
    "years_of_experience": (
        "Extract years of experience as an integer. "
        "'two years' → 2, 'around 1.5 years' → 1, '6 months' → 0, 'fresher' → 0, "
        "'just started' → 0. Return ONLY a number in normalized_value."
    ),
    "location": (
        "Extract city/location. Return a clean 'City' or 'City, Country' format. "
        "'hyd' → 'Hyderabad', 'blr' → 'Bangalore', 'mum' → 'Mumbai'."
    ),
    "current_salary": (
        "Normalize salary to 'X LPA' format for Indian context. "
        "'4 lakhs' → '4 LPA', '4L' → '4 LPA', '4 lakh per annum' → '4 LPA', "
        "'40k/month' → '4.8 LPA', '400000' → '4 LPA', '4 LPA' → '4 LPA'. "
        "For non-Indian (USD/GBP), keep as stated like '$80,000'. "
        "If unclear (no number given), set valid=false and ask for a number."
    ),
    "expected_salary": (
        "Same normalization as current_salary. "
        "'6 lakhs' → '6 LPA', '6L' → '6 LPA', '60k per month' → '7.2 LPA'. "
        "If unclear, set valid=false."
    ),
    "notice_period": (
        "Normalize notice period. "
        "'one month' → '1 month', 'two weeks' → '2 weeks', "
        "'immediate' / 'no notice' / 'right away' → 'Immediate', "
        "'serving notice' → 'Serving notice', '15 days' → '15 days'. "
        "Return a clean short string."
    ),
    "willing_to_relocate": (
        "Return true or false. "
        "'yes', 'yeah', 'sure', 'open to it', 'definitely', 'absolutely' → true. "
        "'no', 'nope', 'not really', 'prefer not' → false. "
        "'depends', 'maybe' → set valid=false, clarification='Are you open to relocation? Please answer yes or no.'"
    ),
    "requires_sponsorship": (
        "Return true or false. "
        "'yes I need sponsorship', 'need visa' → true. "
        "'no', 'not required', 'I am authorized' → false. "
        "Return ONLY true or false in normalized_value."
    ),
    "skills": (
        "Extract a list of technical skills. Return as a JSON array. "
        "'I know Python, react and a bit of SQL' → ['Python', 'React', 'SQL']. "
        "Properly capitalize known tech names: 'javascript' → 'JavaScript', 'nodejs' → 'Node.js'. "
        "Return ONLY the JSON array in normalized_value."
    ),
    "linkedin_url": (
        "Extract a LinkedIn profile URL. If user says 'skip', 'no', 'don't have one', return null and valid=false with no error. "
        "If a URL is provided, ensure it starts with https://linkedin.com/ or https://www.linkedin.com/."
    ),
    "github_url": (
        "Extract a GitHub profile URL. If user says 'skip', return null and valid=false with no error. "
        "Ensure it starts with https://github.com/ if provided."
    ),
    "phone": (
        "Extract a phone number. Include country code if mentioned. "
        "Format: '+91-XXXXXXXXXX' for Indian numbers. Return just the number."
    ),
}

_NORMALIZE_SYSTEM = """You are a data normalizer for a job application profile builder.
The user has just answered a specific profile question. Your job is to:
1. Understand their answer (even if informal, abbreviated, or colloquial)
2. Normalize it to a clean, standard format
3. Return structured JSON

Always return this exact JSON structure:
{{
  "normalized_value": <the clean value — string, number, boolean, or array>,
  "display_value": <human-readable string for showing back to the user>,
  "valid": <true if answer is usable, false if clarification needed>,
  "clarification": <only set if valid=false — a friendly message asking for the right format>
}}

Field being answered: {field_key}
Normalization rule: {rule}

Return ONLY valid JSON, no explanation."""


# ==================================================================
# POST /chat/field — normalize & save a single field answer
# ==================================================================

@router.post("/field", response_model=FieldAnswerResponse)
async def normalize_field_answer(
    request: FieldAnswerRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Normalize a raw user answer for a specific profile field and save it.
    Used by the guided onboarding Q&A flow in the extension popup.
    """
    field_key = request.field_key
    raw = request.raw_answer.strip()

    # Skip/null answers for optional fields
    SKIP_WORDS = {"skip", "no", "none", "n/a", "na", "-", "don't have", "dont have"}
    if raw.lower() in SKIP_WORDS:
        return FieldAnswerResponse(
            field_key=field_key,
            normalized_value=None,
            display_value="Skipped",
            saved=False,
            clarification_needed=False,
        )

    rule = _FIELD_RULES.get(field_key, "Extract and return the value as provided.")
    system_prompt = _NORMALIZE_SYSTEM.format(field_key=field_key, rule=rule)

    raw_llm = await openai_client.chat_completion(
        system_prompt=system_prompt,
        user_prompt=f'User answered: "{raw}"',
        temperature=0,
        max_tokens=150,
    )

    # Parse LLM response
    cleaned = raw_llm.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning(f"Field normalize LLM non-JSON for '{field_key}': {raw_llm[:200]}")
        return FieldAnswerResponse(
            field_key=field_key,
            clarification_needed=True,
            clarification_message="I didn't understand that. Could you rephrase?",
        )

    valid: bool = parsed.get("valid", True)
    normalized = parsed.get("normalized_value")
    display = parsed.get("display_value", str(normalized) if normalized is not None else "")
    clarification = parsed.get("clarification", "")

    if not valid:
        return FieldAnswerResponse(
            field_key=field_key,
            normalized_value=None,
            display_value="",
            saved=False,
            clarification_needed=True,
            clarification_message=clarification or "Could you clarify that?",
        )

    if normalized is None:
        return FieldAnswerResponse(
            field_key=field_key,
            normalized_value=None,
            display_value="Skipped",
            saved=False,
        )

    # Save to profile
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    profile = result.scalar_one_or_none()

    if profile:
        ALLOWED = {
            "full_name", "phone", "location", "years_of_experience",
            "current_title", "current_company", "current_salary", "expected_salary",
            "notice_period", "work_authorization", "willing_to_relocate",
            "requires_sponsorship", "linkedin_url", "github_url", "skills",
        }
        if field_key in ALLOWED:
            setattr(profile, field_key, normalized)
            profile.updated_at = datetime.utcnow()
            db.add(profile)
            await db.commit()
            await cache_service.invalidate_profile(str(user_id))
            logger.info(f"Field saved: {field_key} = {repr(normalized)}")

    return FieldAnswerResponse(
        field_key=field_key,
        normalized_value=normalized,
        display_value=display,
        saved=True,
    )


# ==================================================================
# POST /chat — free-form updates after onboarding
# ==================================================================

_FREE_CHAT_SYSTEM = """You are NeuroApply's profile assistant. The user has finished onboarding and wants to update or query their profile.

When the user provides updates, extract them and return JSON:
- "updates": only fields explicitly mentioned
- "reply": short friendly confirmation or answer (1-2 sentences)

Updatable fields: full_name, phone, location, years_of_experience, current_title, current_company,
current_salary, expected_salary, notice_period, willing_to_relocate, requires_sponsorship,
linkedin_url, github_url, skills.

Normalize values as you extract them:
- Salaries: "6 lakhs" → "6 LPA", "60k/month" → "7.2 LPA"
- Booleans: "yeah" → true, "nope" → false
- Experience: "two years" → 2, "fresher" → 0
- Skills: return as an array

Return ONLY valid JSON: {"updates": {...}, "reply": "..."}"""


@router.post("", response_model=ChatResponse)
async def free_chat(
    request: ChatRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Free-form chat for profile queries and updates after onboarding."""
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    profile = result.scalar_one_or_none()

    profile_context: dict = {}
    if profile:
        profile_context = {
            k: v for k, v in profile.model_dump().items()
            if v is not None and k not in ("hashed_password", "id", "created_at", "updated_at")
        }

    system = _FREE_CHAT_SYSTEM
    if profile_context:
        system += f"\n\nCurrent profile:\n{json.dumps(profile_context, default=str, indent=2)}"

    history_messages = None
    if request.history:
        history_messages = [{"role": t.role, "content": t.content} for t in request.history[-6:]]

    raw = await openai_client.chat_completion(
        system_prompt=system,
        user_prompt=request.message,
        temperature=0.3,
        max_tokens=250,
        messages=history_messages,
    )

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return ChatResponse(reply=raw.strip(), updated_fields={})

    updates: dict = parsed.get("updates", {})
    reply: str = parsed.get("reply", "Got it!")

    if updates and profile:
        ALLOWED = {
            "full_name", "phone", "location", "years_of_experience",
            "current_title", "current_company", "current_salary", "expected_salary",
            "notice_period", "work_authorization", "willing_to_relocate",
            "requires_sponsorship", "linkedin_url", "github_url", "skills",
        }
        applied = {}
        for key, value in updates.items():
            if key in ALLOWED and value is not None:
                setattr(profile, key, value)
                applied[key] = value
        if applied:
            profile.updated_at = datetime.utcnow()
            db.add(profile)
            await db.commit()
            await cache_service.invalidate_profile(str(user_id))
            updates = applied

    return ChatResponse(reply=reply, updated_fields=updates)


# ==================================================================
# POST /chat/stream — SSE streaming for free-form chat
# Reply streams word-by-word; profile updates sent as final event.
# ==================================================================

_REPLY_ONLY_SYSTEM = """You are NeuroApply's profile assistant. Answer the user's question or acknowledge their update naturally.
Be concise — 1 to 3 sentences for simple replies. No JSON. Just a plain, warm reply.
If they're updating something, confirm what you understood (e.g. "Got it, updating your expected salary to 7 LPA!").
If they ask to see their profile, format it as a clean multi-line summary using this structure:
**Name:** ...  **Title:** ... at **Company**
**Experience:** ...  **Location:** ...
**Current CTC:** ...  **Expected CTC:** ...  **Notice:** ...
**Skills:** comma-separated list
**Relocation:** Yes/No  **Sponsorship:** Yes/No
Keep each line short. Never put everything on one line."""

_ONBOARDING_SYSTEM = """You are NeuroApply's onboarding assistant. Your job is to set up the user's job-application profile through a quick, friendly conversation — ONE question at a time.

After each user message: warmly confirm what you captured in a few words, then ask for the NEXT most important detail still missing. Walk through these, skipping anything already in their profile:
1. Current role/title and company
2. Years of experience
3. Location (and whether they're open to relocating)
4. Expected salary
5. Notice period
6. Work authorization / citizenship
7. A few key skills
8. LinkedIn URL

Rules:
- The user's current profile is provided below. NEVER ask about a field that already has a value — only ask about the ones that are still missing or empty.
- Ask only ONE thing at a time. Keep replies to 1–2 short, encouraging sentences.
- Never dump a list of questions. Never output JSON.
- If everything is already filled, don't ask anything — just say their profile looks complete and they're ready.
- When all the essentials are collected, congratulate them warmly and tell them they're all set and can head to their dashboard."""

_EXTRACT_UPDATES_SYSTEM = """Extract any profile updates from this exchange. Return ONLY a JSON object.
Updatable fields: full_name, phone, location, years_of_experience (int), current_title, current_company,
current_salary, expected_salary, notice_period, willing_to_relocate (bool), requires_sponsorship (bool),
linkedin_url, github_url, skills (array).
Normalize: "6 lakhs"→"6 LPA", "yeah"→true, "two years"→2, skills→array. If nothing to update return {}."""

_PROFILE_FIELDS_ALLOWED = {
    "full_name", "phone", "location", "years_of_experience",
    "current_title", "current_company", "current_salary", "expected_salary",
    "notice_period", "work_authorization", "willing_to_relocate",
    "requires_sponsorship", "linkedin_url", "github_url", "skills",
}


@router.post("/stream")
async def stream_free_chat(
    request: ChatRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    SSE streaming endpoint for free-form chat.
    Streams the reply token-by-token, then sends a final 'updates' event
    with any profile fields that were extracted and saved.
    """
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    profile = result.scalar_one_or_none()

    profile_context: dict = {}
    if profile:
        profile_context = {
            k: v for k, v in profile.model_dump().items()
            if v is not None and k not in ("hashed_password", "id", "created_at", "updated_at")
        }

    system = _ONBOARDING_SYSTEM if request.onboarding else _REPLY_ONLY_SYSTEM
    if profile_context:
        system += f"\n\nUser's current profile:\n{json.dumps(profile_context, default=str, indent=2)}"

    history_messages = None
    if request.history:
        history_messages = [{"role": t.role, "content": t.content} for t in request.history[-6:]]

    async def event_generator():
        # Stream the reply
        full_reply = ""
        try:
            async for chunk in openai_client.stream_chat_completion(
                system_prompt=system,
                user_prompt=request.message,
                temperature=0.4,
                max_tokens=200,
                messages=history_messages,
            ):
                full_reply += chunk
                yield f"data: {json.dumps({'type': 'delta', 'content': chunk})}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': 'Something went wrong.'})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Extract and save any profile updates (quick non-streaming call)
        try:
            extract_prompt = (
                f"User said: \"{request.message}\"\n"
                f"Assistant replied: \"{full_reply}\"\n\n"
                "Extract profile updates from the user's message only."
            )
            raw_updates = await openai_client.chat_completion(
                system_prompt=_EXTRACT_UPDATES_SYSTEM,
                user_prompt=extract_prompt,
                temperature=0,
                max_tokens=150,
            )
            cleaned = raw_updates.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)

            updates = json.loads(cleaned) if cleaned else {}
            applied = {}

            if updates and profile:
                for key, value in updates.items():
                    if key in _PROFILE_FIELDS_ALLOWED and value is not None:
                        # Skills accumulate (comma-style) instead of replacing —
                        # adding "JavaScript" must not wipe out "Python".
                        if key == "skills" and isinstance(value, list):
                            existing = list(profile.skills or [])
                            lowered = {s.lower() for s in existing}
                            for s in value:
                                if s and s.lower() not in lowered:
                                    existing.append(s)
                                    lowered.add(s.lower())
                            value = existing
                        setattr(profile, key, value)
                        applied[key] = value
                if applied:
                    profile.updated_at = datetime.utcnow()
                    db.add(profile)
                    await db.commit()
                    await cache_service.invalidate_profile(str(user_id))

            if applied:
                yield f"data: {json.dumps({'type': 'updates', 'fields': applied})}\n\n"
        except Exception as e:
            logger.warning(f"Update extraction failed: {e}")

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
