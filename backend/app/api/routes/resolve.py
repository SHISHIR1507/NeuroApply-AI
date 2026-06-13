"""
NeuroApply AI — Resolve Routes
Batch field resolution endpoint — the hot path for form autofill.

Instrumented with:
  - Request-level structured logging (JSON)
  - User context propagation for log correlation
  - Latency tracking with breakdown by source
"""

import time
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.api.schemas import (
    ResolveFieldsRequest,
    ResolveFieldsResponse,
    FieldResponse,
)
from app.services.resolver import resolve_fields_batch
from app.core.logging import get_logger, user_id_ctx
from app.core.tracing import traced_span

logger = get_logger("api.resolve")
router = APIRouter(prefix="/resolve", tags=["resolve"])


@router.post("", response_model=ResolveFieldsResponse)
async def resolve_fields(
    request: ResolveFieldsRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch resolve form fields to answers.
    
    This is the primary endpoint called by the Chrome extension when
    a job application form is detected. It resolves fields via:
    1. Redis cache (sub-ms)
    2. Structured profile lookup
    3. Answer history
    4. RAG cache (~0ms for repeat questions)
    5. Resume RAG fallback (50-200ms, first time only)
    6. Returns unknown for unresolvable fields
    
    Target latency: <100ms (cache hits), <500ms (full chain).
    """
    # Set user context for all downstream logs
    uid_token = user_id_ctx.set(str(user_id))

    try:
        start = time.perf_counter()

        logger.info(
            f"Resolve request: {len(request.fields)} fields from {request.platform}",
            extra={"phase": "request_start", "field_count": len(request.fields)},
        )

        # Convert Pydantic models to dicts for the resolver
        fields_data = [
            {
                "id": f.id,
                "label": f.label,
                "type": f.type,
                "required": f.required,
                "options": f.options,
                "current_value": f.current_value,
            }
            for f in request.fields
        ]

        # Batch resolve (all logging happens inside resolver)
        with traced_span(
            "resolve_fields_batch",
            user_id=str(user_id),
            field_count=len(fields_data),
            platform=request.platform,
        ):
            results = await resolve_fields_batch(db, user_id, fields_data)

        # Build response
        field_responses = [
            FieldResponse(
                field_id=r["field_id"],
                label=r["label"],
                value=r.get("value"),
                source=r["source"],
                confidence=r.get("confidence", 0.0),
                canonical_key=r.get("canonical_key"),
            )
            for r in results
        ]

        elapsed_ms = (time.perf_counter() - start) * 1000
        resolved_count = sum(1 for f in field_responses if f.value is not None)

        # Source breakdown for monitoring
        source_breakdown = {}
        for f in field_responses:
            source_breakdown[f.source] = source_breakdown.get(f.source, 0) + 1

        logger.info(
            f"Resolve response: {resolved_count}/{len(field_responses)} resolved in {elapsed_ms:.1f}ms",
            extra={
                "phase": "request_complete",
                "latency_ms": round(elapsed_ms, 2),
                "resolved_count": resolved_count,
                "total_count": len(field_responses),
                **{f"source_{k}": v for k, v in source_breakdown.items()},
            },
        )

        return ResolveFieldsResponse(
            fields=field_responses,
            resolved_count=resolved_count,
            total_count=len(field_responses),
            latency_ms=round(elapsed_ms, 2),
        )
    finally:
        user_id_ctx.reset(uid_token)
