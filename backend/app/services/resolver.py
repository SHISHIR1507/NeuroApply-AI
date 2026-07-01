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

import asyncio
import json
import random
import re as _re
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

# Matches "... experience in/with/working with <topic>" so a named skill can be
# checked against the profile instead of blindly reusing total years worked.
_EXPERIENCE_TOPIC_RE = _re.compile(
    r"experience\s+(?:do you have\s+)?(?:in|with|working with|working in|of)\s+"
    r"([A-Za-z0-9\.\+\#/&\- ]{2,60}?)(?=\s*[\?\.]|\s*\(|\s*$)",
    _re.IGNORECASE,
)


def _extract_experience_topic(label: str) -> Optional[str]:
    """
    Pull the named skill/technology out of a question like "How many years of
    experience do you have in Blockchain Development?". Returns None for a
    generic question with no named topic ("How many years of experience do
    you have?").
    """
    m = _EXPERIENCE_TOPIC_RE.search(label)
    return m.group(1).strip() if m else None


def _topic_matches_profile(topic: str, profile: Optional[dict]) -> bool:
    """Cheap substring check: is this named skill actually one the user has?"""
    if not profile:
        return False
    skills = profile.get("skills") if isinstance(profile, dict) else getattr(profile, "skills", None)
    title = profile.get("current_title") if isinstance(profile, dict) else getattr(profile, "current_title", None)
    topic_lower = topic.lower()
    for skill in (skills or []):
        s = str(skill).lower()
        if topic_lower in s or s in topic_lower:
            return True
    if title and (topic_lower in title.lower() or title.lower() in topic_lower):
        return True
    return False


def _apply_default_rules(label: str, profile: Optional[dict] = None) -> Optional[str]:
    """Return a fast default answer for well-known numeric question patterns."""
    lowered = label.lower()

    if any(kw in lowered for kw in _EXPERIENCE_KEYWORDS):
        topic = _extract_experience_topic(label)
        if topic and not _topic_matches_profile(topic, profile):
            # A specific, named skill/technology that doesn't show up anywhere
            # in this profile — reusing the person's total years of experience
            # would be actively misleading (e.g. answering "3" for Blockchain
            # Development when their stack is React/Node). Let the LLM step
            # reason over the full profile instead of guessing here.
            return None
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
    "- Yes/No: answer ONLY from explicit evidence in the profile (education, skills, titles, etc).\n"
    "  Degree-level equivalence: B.Tech, B.E., B.Sc, BCA, BA, BBA, BCom count as a bachelor's degree;\n"
    "  M.Tech, M.E., M.Sc, MCA, MBA, MA count as a master's degree.\n"
    "  NEVER answer 'No' just because the profile is silent on the topic — silence is not evidence of\n"
    "  absence. If the profile has no data bearing on the question either way, reply null instead of\n"
    "  guessing — a wrong 'No' on an eligibility question (degree, sponsorship, authorization, etc.)\n"
    "  can get the application auto-rejected, which is worse than leaving it for the user to answer.\n"
    "- Dropdown: pick the best matching option exactly as written\n"
    "- Number field: plain digits only, no commas or text. If asked about experience in a specific named\n"
    "  skill/technology that does not appear anywhere in the profile's skills, titles, or experience,\n"
    "  reply 0 rather than the person's total years of experience in an unrelated field.\n"
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

    # ----- Step 4.5: Fast default rules (pattern matching, no LLM) -----
    if profile is None:
        try:
            profile = await _get_profile(db, user_id)
        except Exception as e:
            logger.warning(f"[RESOLVE] STEP4.5 profile fetch FAILED: {e}")
            await db.rollback()

    default_value = _apply_default_rules(label, profile)
    if default_value is not None:
        await cache_service.cache_answer(str(user_id), field_hash, default_value)
        logger.info(f"[RESOLVE] STEP4.5 RESOLVED '{label}' → '{default_value}' (default_rule)")
        return {"value": default_value, "source": "default_rule", "confidence": 0.85, "canonical_key": canonical_key}

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

    Pipeline:
      1. Single Redis round-trip for all fields (batch cache check)
      2. Fetch user profile once — shared across all misses
      3. Sequential DB resolution: profile columns → answer history → default rules
      4. Parallel LLM inference for all remaining fields (asyncio.gather)

    This keeps DB operations sequential (safe for a shared AsyncSession) while
    running all LLM calls concurrently — the dominant latency source.
    """
    if not fields:
        return []

    batch_start = time.perf_counter()
    results: list[Optional[dict]] = [None] * len(fields)
    source_counts = {"cache": 0, "profile": 0, "history": 0, "default_rule": 0, "llm_infer": 0, "unknown": 0}

    # ── Phase 1: Batch Redis check (single round-trip) ───────────────────
    with LatencyTimer("batch_cache_check", logger, field_count=len(fields)):
        with traced_span("batch_cache_check", field_count=len(fields)) as span:
            field_hashes = [generate_field_hash(f["label"]) for f in fields]
            cached_values = await cache_service.get_cached_answers(str(user_id), field_hashes)
            cache_hits = sum(1 for v in cached_values if v is not None)
            span.set_attribute("cache.hits", cache_hits)
            span.set_attribute("cache.misses", len(fields) - cache_hits)

    cache_miss_indices = []
    for i, (field, cached_value) in enumerate(zip(fields, cached_values)):
        if cached_value is not None:
            results[i] = {
                "field_id": field.get("id", str(i)),
                "label": field["label"],
                "value": cached_value,
                "source": "cache",
                "confidence": 1.0,
                "canonical_key": None,
            }
            source_counts["cache"] += 1
        else:
            cache_miss_indices.append(i)

    if not cache_miss_indices:
        batch_ms = (time.perf_counter() - batch_start) * 1000
        logger.info(f"Batch resolution complete (full cache): {cache_hits}/{len(fields)} in {batch_ms:.1f}ms")
        return results

    # ── Phase 2: Fetch profile once for all misses ────────────────────────
    profile: Optional[dict] = None
    try:
        profile = await _get_profile(db, user_id)
    except Exception as e:
        logger.warning(f"[BATCH] Profile fetch failed: {e}")
        await db.rollback()

    # ── Phase 3: Sequential DB resolution (profile → history → defaults) ─
    # DB operations share the session — must stay sequential.
    # LLM-needed fields are collected and dispatched in parallel after.
    pending_llm: list[tuple[int, dict, str, Optional[str]]] = []  # (index, field, field_hash, canonical_key)

    for i in cache_miss_indices:
        field = fields[i]
        label = field["label"]
        field_hash = field_hashes[i]

        canonical_key, mapping_confidence = map_to_canonical(label)

        # Structured profile column
        if canonical_key and canonical_key in PROFILE_DIRECT_FIELDS and mapping_confidence >= 0.75 and profile:
            raw = profile.get(canonical_key) if isinstance(profile, dict) else getattr(profile, canonical_key, None)
            if raw is not None:
                val = _clean_profile_value(canonical_key, raw)
                await cache_service.cache_answer(str(user_id), field_hash, val)
                results[i] = {"field_id": field.get("id", str(i)), "label": label, "value": val, "source": "profile", "confidence": mapping_confidence, "canonical_key": canonical_key}
                source_counts["profile"] += 1
                continue

        # Answer history
        try:
            historical = await _find_historical_answer(db, user_id, canonical_key, label)
        except Exception as e:
            logger.warning(f"[BATCH] History lookup failed for '{label}': {e}")
            await db.rollback()
            historical = None

        if historical and historical["confidence"] >= 0.75:
            await cache_service.cache_answer(str(user_id), field_hash, historical["value"])
            results[i] = {"field_id": field.get("id", str(i)), "label": label, "value": historical["value"], "source": "history", "confidence": historical["confidence"], "canonical_key": canonical_key}
            source_counts["history"] += 1
            continue

        # Default rules (pattern matching, no network)
        default_val = _apply_default_rules(label, profile)
        if default_val is not None:
            await cache_service.cache_answer(str(user_id), field_hash, default_val)
            results[i] = {"field_id": field.get("id", str(i)), "label": label, "value": default_val, "source": "default_rule", "confidence": 0.85, "canonical_key": canonical_key}
            source_counts["default_rule"] += 1
            continue

        # Needs LLM — queue for parallel dispatch
        pending_llm.append((i, field, field_hash, canonical_key))

    # ── Phase 4: Parallel LLM inference ──────────────────────────────────
    if pending_llm:
        if profile:
            profile_dict = profile if isinstance(profile, dict) else {}
            with LatencyTimer("parallel_llm_inference", logger, field_count=len(pending_llm)):
                llm_tasks = [
                    _llm_infer_answer(
                        label=field["label"],
                        field_type=field.get("type", "text"),
                        options=field.get("options") or [],
                        profile=profile_dict,
                    )
                    for _, field, _, _ in pending_llm
                ]
                llm_values = await asyncio.gather(*llm_tasks, return_exceptions=True)

            for (i, field, field_hash, canonical_key), llm_val in zip(pending_llm, llm_values):
                label = field["label"]
                if isinstance(llm_val, Exception):
                    logger.warning(f"[BATCH] LLM failed for '{label}': {llm_val}")
                    llm_val = None
                if llm_val is not None:
                    await cache_service.cache_answer(str(user_id), field_hash, llm_val)
                    source_counts["llm_infer"] += 1
                else:
                    source_counts["unknown"] += 1
                results[i] = {
                    "field_id": field.get("id", str(i)),
                    "label": label,
                    "value": llm_val,
                    "source": "llm_infer" if llm_val else "unknown",
                    "confidence": 0.8 if llm_val else 0.0,
                    "canonical_key": canonical_key,
                }
        else:
            for i, field, _, canonical_key in pending_llm:
                results[i] = {"field_id": field.get("id", str(i)), "label": field["label"], "value": None, "source": "unknown", "confidence": 0.0, "canonical_key": canonical_key}
                source_counts["unknown"] += 1

    # ── Summary log ───────────────────────────────────────────────────────
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
            "llm_parallel_count": len(pending_llm),
            **{f"source_{k}": v for k, v in source_counts.items()},
        },
    )

    return results
