"""
NeuroApply AI — Field Resolution Engine
The core intelligence: resolves form field labels to answers via a priority chain.

Resolution Priority:
  1. Redis Cache (sub-ms)       → exact match on (user_id, field_hash)
  2. Structured Profile (1-5ms) → direct column lookup on UserProfile
  3. Answer History (5-10ms)    → fuzzy match on previously answered questions
  4. RAG Cache (~0ms)           → cached RAG output from prior identical query
  5. Resume RAG (50-200ms)      → vector similarity search (ONLY as fallback)
  6. Unknown                    → return null, flag for user input

Observability:
  - Every phase is timed with LatencyTimer (structured JSON log)
  - Every phase gets an OpenTelemetry span for distributed trace view
  - Per-request summary log with latency breakdown
"""

import json
import random
import time
from typing import Optional, Union
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import UserProfile, AnswerHistory
from app.services.cache import cache_service
from app.services.field_mapper import map_to_canonical, generate_field_hash
from app.services.vector_store import query_similar_chunks
from app.services.openai_client import openai_client
from app.core.logging import get_logger, LatencyTimer
from app.core.tracing import traced_span


logger = get_logger("resolver")

_EXPERIENCE_KEYWORDS = [
    "years of experience", "year of experience", "years experience",
    "how many years", "experience in", "experience with",
    "years working", "yoe", "total experience", "years in",
]

_PROFICIENCY_KEYWORDS = [
    "proficiency", "rate your", "rate yourself", "skill level",
    "how good are you", "how would you rate", "expertise in",
    "knowledge of", "familiarity with", "level of expertise",
]

_ACADEMIC_KEYWORDS = [
    "score in", "how much did you score", "grade 10", "grade 12", "10th", "12th",
    "marks in", "percentage in",
]


def _apply_default_rules(label: str, profile: Optional[dict] = None) -> Optional[str]:
    """Return a fast default answer for well-known numeric question patterns."""
    lowered = label.lower()

    if any(kw in lowered for kw in _EXPERIENCE_KEYWORDS):
        if profile:
            yoe = profile.get("years_of_experience") if isinstance(profile, dict) else getattr(profile, "years_of_experience", None)
            if yoe is not None:
                return str(yoe)
        return "3"

    if any(kw in lowered for kw in _PROFICIENCY_KEYWORDS):
        return str(random.randint(8, 10))

    if any(kw in lowered for kw in _ACADEMIC_KEYWORDS):
        return "1"

    return None


_LLM_SYSTEM_PROMPT = (
    "You fill job application form fields. Reply with ONLY the answer — no explanation, no units.\n"
    "- Skill/proficiency rating (any scale): reply 8\n"
    "- Yes/No: answer based on profile\n"
    "- Dropdown: pick the best matching option exactly as written\n"
    "- Number field: plain digits only, no commas or text\n"
    "- If truly no relevant info exists: reply null"
)


async def _llm_infer_answer(
    label: str,
    field_type: str,
    options: list,
    profile: dict,
) -> Optional[str]:
    """Ask the LLM to infer an answer from the user's profile for custom questions."""
    profile_clean = {
        k: v for k, v in profile.items()
        if v is not None and k not in ("hashed_password", "id", "created_at", "updated_at")
    }

    options_line = f"\nAvailable options: {', '.join(str(o) for o in options)}" if options else ""

    number_hint = " (return a plain number only, no units)" if field_type == "number" else ""
    user_prompt = (
        f"Form field: {label}\n"
        f"Field type: {field_type}{number_hint}{options_line}\n\n"
        f"User profile:\n{json.dumps(profile_clean, default=str, indent=2)}"
    )

    try:
        result = await openai_client.chat_completion(
            system_prompt=_LLM_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            max_tokens=60,
            temperature=0,
        )
        answer = result.strip()
        if answer.lower() in ("null", "none", "n/a", ""):
            return None
        return answer
    except Exception as e:
        logger.warning(f"LLM inference failed for '{label}': {e}")
        return None


# ------------------------------------------------------------------
# Profile field → canonical key mapping
# (which canonical keys correspond to direct UserProfile columns)
# ------------------------------------------------------------------
PROFILE_DIRECT_FIELDS = {
    "full_name", "email", "phone", "location",
    "years_of_experience", "current_title", "current_company",
    "current_salary", "expected_salary", "notice_period", "work_authorization",
    "willing_to_relocate", "requires_sponsorship",
    "linkedin_url", "github_url", "portfolio_url",
}


import re as _re

def _clean_profile_value(canonical_key: str, raw_value) -> str:
    """Post-process profile values before returning them as form answers."""
    value = str(raw_value).strip()
    if canonical_key in ("expected_salary", "current_salary"):
        # Convert "6 LPA" → "600000", "12.5 LPA" → "1250000"
        m = _re.search(r'(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l\b)', value, _re.IGNORECASE)
        if m:
            return str(int(float(m.group(1)) * 100000))
        # Already a plain number
        m = _re.search(r'(\d+(?:\.\d+)?)', value)
        if m:
            return m.group(1)
    return value


async def _get_profile(db: AsyncSession, user_id: UUID) -> Optional[UserProfile]:
    """Fetch user profile, using Redis cache when available."""
    with traced_span("profile_cache_check", user_id=str(user_id)) as span:
        cached = await cache_service.get_cached_profile(str(user_id))
        if cached:
            span.set_attribute("cache.hit", True)
            return cached

    with traced_span("profile_db_lookup", user_id=str(user_id)) as span:
        result = await db.execute(
            select(UserProfile).where(UserProfile.id == user_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            profile_dict = {
                k: v for k, v in profile.model_dump().items()
                if k not in ("hashed_password",)
            }
            await cache_service.cache_profile(str(user_id), profile_dict)
            span.set_attribute("cache.hit", False)
            return profile_dict

    return None


async def _find_historical_answer(
    db: AsyncSession,
    user_id: UUID,
    canonical_key: Optional[str],
    question_text: str,
) -> Optional[dict]:
    """
    Find a previously answered question.
    First tries exact canonical_key match, then falls back to text similarity.
    """
    with traced_span("history_lookup", canonical_key=canonical_key or "none") as span:
        # Try canonical key match first (fast)
        if canonical_key:
            result = await db.execute(
                select(AnswerHistory)
                .where(
                    AnswerHistory.user_id == user_id,
                    AnswerHistory.canonical_key == canonical_key,
                )
                .order_by(AnswerHistory.updated_at.desc())
                .limit(1)
            )
            answer = result.scalar_one_or_none()
            if answer:
                span.set_attribute("match_type", "canonical_key")
                return {
                    "value": answer.answer_value,
                    "confidence": answer.confidence,
                    "source": "history",
                }

        # Fallback: exact question text match
        result = await db.execute(
            select(AnswerHistory)
            .where(
                AnswerHistory.user_id == user_id,
                AnswerHistory.question_text == question_text.lower().strip(),
            )
            .order_by(AnswerHistory.updated_at.desc())
            .limit(1)
        )
        answer = result.scalar_one_or_none()
        if answer:
            span.set_attribute("match_type", "exact_text")
            return {
                "value": answer.answer_value,
                "confidence": answer.confidence,
                "source": "history",
            }

        span.set_attribute("match_type", "miss")
        return None


async def resolve_single_field(
    db: AsyncSession,
    user_id: UUID,
    label: str,
    field_type: str = "text",
    options: Optional[list] = None,
) -> dict:
    """
    Resolve a single form field to an answer.

    Resolution chain:
      1. Redis cache          — sub-ms, free
      2. Structured profile   — direct DB column for known field types
      3. Answer history       — previously corrected/answered questions
      4. LLM inference        — semantic understanding using full profile context
      5. Unknown              — needs manual input
    """
    field_hash = generate_field_hash(label)
    t_start = time.perf_counter()

    logger.info(f"[RESOLVE] START '{label}' (type={field_type})")

    # ----- Step 1: Redis cache -----
    cached_value = await cache_service.get(f"answer:{user_id}:{field_hash}")
    if cached_value is not None:
        logger.info(f"[RESOLVE] STEP1 cache HIT '{label}' → '{cached_value}'")
        return {"value": cached_value, "source": "cache", "confidence": 1.0, "canonical_key": None}
    logger.info(f"[RESOLVE] STEP1 cache miss '{label}'")

    # ----- Step 2: Map to canonical key -----
    canonical_key, mapping_confidence = map_to_canonical(label)
    logger.info(f"[RESOLVE] STEP2 canonical='{canonical_key}' confidence={mapping_confidence:.2f} for '{label}'")

    # ----- Step 3: Structured profile — only for high-confidence direct field matches -----
    profile: Optional[dict] = None
    if canonical_key and canonical_key in PROFILE_DIRECT_FIELDS and mapping_confidence >= 0.75:
        logger.info(f"[RESOLVE] STEP3 profile lookup for canonical='{canonical_key}'")
        try:
            profile = await _get_profile(db, user_id)
        except Exception as e:
            logger.warning(f"[RESOLVE] STEP3 profile lookup FAILED: {e}")
            await db.rollback()

        if profile:
            value = profile.get(canonical_key) if isinstance(profile, dict) else getattr(profile, canonical_key, None)
            logger.info(f"[RESOLVE] STEP3 profile value for '{canonical_key}' = {repr(value)}")
            if value is not None:
                str_value = _clean_profile_value(canonical_key, value)
                await cache_service.cache_answer(str(user_id), field_hash, str_value)
                logger.info(f"[RESOLVE] STEP3 RESOLVED '{label}' → '{str_value}' (profile)")
                return {"value": str_value, "source": "profile", "confidence": mapping_confidence, "canonical_key": canonical_key}
        else:
            logger.info(f"[RESOLVE] STEP3 no profile found for user")
    else:
        logger.info(f"[RESOLVE] STEP3 skipped (canonical='{canonical_key}', in_direct={canonical_key in PROFILE_DIRECT_FIELDS if canonical_key else False}, conf={mapping_confidence:.2f})")

    # ----- Step 4: Answer history -----
    logger.info(f"[RESOLVE] STEP4 history lookup for '{label}'")
    try:
        historical = await _find_historical_answer(db, user_id, canonical_key, label)
    except Exception as e:
        logger.warning(f"[RESOLVE] STEP4 history lookup FAILED: {e}")
        await db.rollback()
        historical = None

    if historical and historical["confidence"] >= 0.75:
        await cache_service.cache_answer(str(user_id), field_hash, historical["value"])
        logger.info(f"[RESOLVE] STEP4 RESOLVED '{label}' → '{historical['value']}' (history conf={historical['confidence']:.2f})")
        return {"value": historical["value"], "source": "history", "confidence": historical["confidence"], "canonical_key": canonical_key}
    logger.info(f"[RESOLVE] STEP4 history miss (found={historical is not None})")

    # ----- Step 5: LLM inference — semantic catch-all -----
    if profile is None:
        logger.info(f"[RESOLVE] STEP5 fetching profile for LLM")
        try:
            profile = await _get_profile(db, user_id)
        except Exception as e:
            logger.warning(f"[RESOLVE] STEP5 profile fetch FAILED: {e}")
            await db.rollback()

    if profile:
        logger.info(f"[RESOLVE] STEP5 calling LLM for '{label}' options={options}")
        with LatencyTimer("llm_inference", logger, field_label=label) as t:
            llm_value = await _llm_infer_answer(
                label=label,
                field_type=field_type,
                options=options or [],
                profile=profile if isinstance(profile, dict) else {},
            )
        logger.info(f"[RESOLVE] STEP5 LLM returned '{llm_value}' in {t.elapsed_ms:.0f}ms for '{label}'")
        if llm_value is not None:
            await cache_service.cache_answer(str(user_id), field_hash, llm_value)
            logger.info(f"[RESOLVE] STEP5 RESOLVED '{label}' → '{llm_value}' (llm)")
            return {"value": llm_value, "source": "llm_infer", "confidence": 0.8, "canonical_key": canonical_key}
    else:
        logger.warning(f"[RESOLVE] STEP5 skipped — no profile available for LLM")

    # ----- Step 6: Unknown -----
    total_ms = (time.perf_counter() - t_start) * 1000
    logger.info(f"[RESOLVE] UNRESOLVED '{label}' after {total_ms:.0f}ms")
    return {"value": None, "source": "unknown", "confidence": 0.0, "canonical_key": canonical_key}


async def resolve_fields_batch(
    db: AsyncSession,
    user_id: UUID,
    fields: list[dict],
) -> list[dict]:
    """
    Batch resolve multiple fields.
    Optimized: batch-checks Redis cache first, then resolves misses individually.
    
    Fully instrumented with per-batch summary logging.
    
    Args:
        fields: list of {id, label, type, required, options, currentValue}
        
    Returns:
        list of {field_id, value, source, confidence, canonical_key}
    """
    if not fields:
        return []

    batch_start = time.perf_counter()
    results = []
    cache_miss_indices = []
    source_counts = {"cache": 0, "profile": 0, "history": 0, "rag_cache": 0, "resume_rag": 0, "default_rule": 0, "llm_infer": 0, "unknown": 0}

    # ----- Batch cache check (single Redis round-trip) -----
    with LatencyTimer("batch_cache_check", logger, field_count=len(fields)) as t:
        with traced_span("batch_cache_check", field_count=len(fields)) as span:
            field_hashes = [generate_field_hash(f["label"]) for f in fields]
            cached_values = await cache_service.get_cached_answers(str(user_id), field_hashes)
            cache_hits = sum(1 for v in cached_values if v is not None)
            span.set_attribute("cache.hits", cache_hits)
            span.set_attribute("cache.misses", len(fields) - cache_hits)

    for i, (field, cached_value) in enumerate(zip(fields, cached_values)):
        if cached_value is not None:
            results.append({
                "field_id": field.get("id", str(i)),
                "label": field["label"],
                "value": cached_value,
                "source": "cache",
                "confidence": 1.0,
                "canonical_key": None,
            })
            source_counts["cache"] += 1
        else:
            cache_miss_indices.append(i)
            results.append(None)  # Placeholder

    # ----- Resolve cache misses -----
    with traced_span("resolve_cache_misses", miss_count=len(cache_miss_indices)):
        for i in cache_miss_indices:
            field = fields[i]
            resolved = await resolve_single_field(
                db=db,
                user_id=user_id,
                label=field["label"],
                field_type=field.get("type", "text"),
                options=field.get("options") or [],
            )
            results[i] = {
                "field_id": field.get("id", str(i)),
                "label": field["label"],
                **resolved,
            }
            source = resolved.get("source", "unknown")
            if source in source_counts:
                source_counts[source] += 1

    # ----- Summary log -----
    batch_ms = (time.perf_counter() - batch_start) * 1000
    resolved_count = sum(1 for r in results if r and r.get("value") is not None)

    logger.info(
        f"Batch resolution complete: {resolved_count}/{len(fields)} fields resolved in {batch_ms:.1f}ms",
        extra={
            "phase": "batch_complete",
            "latency_ms": round(batch_ms, 2),
            "resolved_count": resolved_count,
            "total_count": len(fields),
            "cache_hits": source_counts["cache"],
            "cache_misses": len(cache_miss_indices),
            **{f"source_{k}": v for k, v in source_counts.items()},
        },
    )

    return results
