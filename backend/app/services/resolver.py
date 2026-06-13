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
        return "8"

    if any(kw in lowered for kw in _ACADEMIC_KEYWORDS):
        return "1"

    return None


_LLM_SYSTEM_PROMPT = (
    "You are filling a job application form field on behalf of the user. "
    "Reply with ONLY the answer value — no explanation, no extra text. "
    "Keep answers concise: numbers for numeric fields, Yes/No for boolean, "
    "short phrases for text. "
    "If the profile does not contain enough information to answer, reply exactly: null"
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

    user_prompt = (
        f"Form field: {label}\n"
        f"Field type: {field_type}{options_line}\n\n"
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
    "expected_salary", "notice_period", "work_authorization",
    "willing_to_relocate", "requires_sponsorship",
    "linkedin_url", "github_url", "portfolio_url",
}


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
    Returns {value, source, confidence, canonical_key}.
    """
    field_hash = generate_field_hash(label)
    latency_breakdown = {}
    _cached_profile: Optional[dict] = None  # shared across steps that need it

    # ----- Step 1: Redis Cache (sub-ms) -----
    with LatencyTimer("cache_lookup", logger, field_label=label) as t:
        with traced_span("cache_lookup", field_label=label) as span:
            cached_value = await cache_service.get(f"answer:{user_id}:{field_hash}")
            span.set_attribute("cache.hit", cached_value is not None)
    latency_breakdown["cache_ms"] = t.elapsed_ms

    if cached_value is not None:
        logger.info(
            f"Cache hit for '{label}'",
            extra={"source": "cache", "latency_ms": t.elapsed_ms, "phase": "resolved"},
        )
        return {
            "value": cached_value,
            "source": "cache",
            "confidence": 1.0,
            "canonical_key": None,
        }

    # ----- Step 2: Map label to canonical key -----
    with LatencyTimer("field_mapping", logger, field_label=label) as t:
        canonical_key, mapping_confidence = map_to_canonical(label)
    latency_breakdown["mapping_ms"] = t.elapsed_ms

    # ----- Step 3: Structured Profile (1-5ms) -----
    if canonical_key and canonical_key in PROFILE_DIRECT_FIELDS:
        with LatencyTimer("profile_lookup", logger, canonical_key=canonical_key) as t:
            _cached_profile = await _get_profile(db, user_id)
        latency_breakdown["profile_ms"] = t.elapsed_ms

        if _cached_profile:
            value = _cached_profile.get(canonical_key) if isinstance(_cached_profile, dict) else getattr(_cached_profile, canonical_key, None)
            if value is not None:
                str_value = str(value)
                await cache_service.cache_answer(str(user_id), field_hash, str_value)
                logger.info(
                    f"Profile hit for '{label}' → {canonical_key}",
                    extra={"source": "profile", "latency_ms": sum(latency_breakdown.values()), "phase": "resolved"},
                )
                return {
                    "value": str_value,
                    "source": "profile",
                    "confidence": mapping_confidence,
                    "canonical_key": canonical_key,
                }

    # ----- Step 4: Answer History (5-10ms) -----
    with LatencyTimer("history_lookup", logger, field_label=label) as t:
        historical = await _find_historical_answer(db, user_id, canonical_key, label)
    latency_breakdown["history_ms"] = t.elapsed_ms

    if historical and historical["confidence"] >= 0.75:
        await cache_service.cache_answer(str(user_id), field_hash, historical["value"])
        logger.info(
            f"History hit for '{label}'",
            extra={"source": "history", "latency_ms": sum(latency_breakdown.values()), "phase": "resolved"},
        )
        return {
            "value": historical["value"],
            "source": "history",
            "confidence": historical["confidence"],
            "canonical_key": canonical_key,
        }

    # ----- Step 5: RAG Cache Check (~0ms) -----
    # Check if we've already answered this exact question via RAG before
    if field_type in ("text", "textarea"):
        with LatencyTimer("rag_cache_check", logger, field_label=label) as t:
            with traced_span("rag_cache_check", field_label=label) as span:
                rag_cached = await cache_service.get_cached_rag_result(str(user_id), field_hash)
                span.set_attribute("rag_cache.hit", rag_cached is not None)
        latency_breakdown["rag_cache_ms"] = t.elapsed_ms

        if rag_cached is not None:
            # Also promote to answer cache for even faster next hit
            await cache_service.cache_answer(str(user_id), field_hash, rag_cached)
            logger.info(
                f"RAG cache hit for '{label}'",
                extra={"source": "rag_cache", "latency_ms": sum(latency_breakdown.values()), "phase": "resolved", "rag_cached": True},
            )
            return {
                "value": rag_cached,
                "source": "rag_cache",
                "confidence": 0.75,
                "canonical_key": canonical_key,
            }

    # ----- Step 6: Resume RAG fallback (50-200ms) -----
    if field_type in ("text", "textarea"):
        with LatencyTimer("rag_vector_query", logger, field_label=label) as t:
            with traced_span("rag_vector_query", field_label=label) as span:
                try:
                    similar_chunks = await query_similar_chunks(
                        db, user_id, label,
                        top_k=settings.rag_max_top_k,
                        similarity_threshold=settings.rag_similarity_threshold,
                    )
                    span.set_attribute("rag.chunks_returned", len(similar_chunks))
                except Exception as e:
                    logger.warning(f"RAG query failed for '{label}': {e}")
                    similar_chunks = []
                    span.set_attribute("rag.error", str(e))
        latency_breakdown["rag_query_ms"] = t.elapsed_ms

        if similar_chunks:
            best = similar_chunks[0]
            rag_value = best["chunk_text"][:settings.rag_max_chunk_chars]

            # Cache this RAG output so next identical query is ~0ms
            await cache_service.cache_rag_result(str(user_id), field_hash, rag_value)

            logger.info(
                f"RAG hit for '{label}' (similarity={best['similarity']:.2f})",
                extra={
                    "source": "resume_rag",
                    "latency_ms": sum(latency_breakdown.values()),
                    "phase": "resolved",
                    "similarity": best["similarity"],
                    "rag_cached": False,
                },
            )
            return {
                "value": rag_value,
                "source": "resume_rag",
                "confidence": best["similarity"] * 0.7,
                "canonical_key": canonical_key,
            }

    # ----- Step 7: Rule-based defaults (fast, numeric patterns) -----
    # Fetch profile lazily if not already loaded
    if _cached_profile is None:
        _cached_profile = await _get_profile(db, user_id)

    default_value = _apply_default_rules(label, _cached_profile)
    if default_value is not None:
        await cache_service.cache_answer(str(user_id), field_hash, default_value)
        logger.info(
            f"Default rule hit for '{label}' → '{default_value}'",
            extra={"source": "default_rule", "latency_ms": sum(latency_breakdown.values()), "phase": "resolved"},
        )
        return {
            "value": default_value,
            "source": "default_rule",
            "confidence": 0.6,
            "canonical_key": canonical_key,
        }

    # ----- Step 8: LLM inference (semantic catch-all for custom questions) -----
    if field_type in ("text", "number", "select", "radio") and _cached_profile:
        with LatencyTimer("llm_inference", logger, field_label=label) as t:
            with traced_span("llm_inference", field_label=label) as span:
                llm_value = await _llm_infer_answer(
                    label=label,
                    field_type=field_type,
                    options=options or [],
                    profile=_cached_profile if isinstance(_cached_profile, dict) else {},
                )
                span.set_attribute("llm.resolved", llm_value is not None)
        latency_breakdown["llm_ms"] = t.elapsed_ms

        if llm_value is not None:
            await cache_service.cache_answer(str(user_id), field_hash, llm_value)
            logger.info(
                f"LLM inference hit for '{label}' → '{llm_value}'",
                extra={"source": "llm_infer", "latency_ms": sum(latency_breakdown.values()), "phase": "resolved"},
            )
            return {
                "value": llm_value,
                "source": "llm_infer",
                "confidence": 0.7,
                "canonical_key": canonical_key,
            }

    # ----- Step 9: Unknown -----
    total_ms = sum(latency_breakdown.values())
    logger.info(
        f"Unresolved field: '{label}'",
        extra={"source": "unknown", "latency_ms": total_ms, "phase": "unresolved"},
    )
    return {
        "value": None,
        "source": "unknown",
        "confidence": 0.0,
        "canonical_key": canonical_key,
    }


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
