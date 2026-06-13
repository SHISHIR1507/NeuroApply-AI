"""
NeuroApply AI — Vector Store (pgvector)
Stores and retrieves resume chunk embeddings for RAG fallback.

Instrumented with OpenTelemetry spans and structured logging.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import ResumeEmbedding
from app.services.openai_client import openai_client
from app.core.logging import get_logger, LatencyTimer
from app.core.tracing import traced_span


logger = get_logger("rag")


async def store_embeddings(
    db: AsyncSession,
    user_id: UUID,
    resume_id: UUID,
    chunks: list[str],
    embeddings: list[list[float]],
):
    """
    Store resume chunk embeddings in pgvector.
    Each chunk gets its own row with the embedding vector.
    """
    with traced_span("store_embeddings", chunk_count=len(chunks), user_id=str(user_id)):
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            record = ResumeEmbedding(
                user_id=user_id,
                resume_id=resume_id,
                chunk_index=i,
                chunk_text=chunk,
                embedding=embedding,
            )
            db.add(record)
        await db.flush()

    logger.info(
        f"Stored {len(chunks)} embeddings for user {user_id}",
        extra={"phase": "embedding_store", "field_count": len(chunks)},
    )


async def query_similar_chunks(
    db: AsyncSession,
    user_id: UUID,
    query_text: str,
    top_k: int = None,
    similarity_threshold: float = None,
) -> list[dict]:
    """
    Find the most similar resume chunks for a given query.
    
    Uses cosine distance with pgvector's <=> operator.
    Filters by user_id to keep search space small (~50-200 vectors per user).
    
    Enforced limits from config:
      - top_k capped at settings.rag_max_top_k (default: 3)
      - similarity_threshold from settings.rag_similarity_threshold (default: 0.55)
    
    Returns list of {chunk_text, similarity_score}.
    """
    # Enforce config limits
    top_k = min(top_k or settings.rag_max_top_k, settings.rag_max_top_k)
    similarity_threshold = similarity_threshold or settings.rag_similarity_threshold

    with traced_span("rag_embedding_generation", query_length=len(query_text)) as span:
        with LatencyTimer("rag_embed_query", logger) as embed_timer:
            query_embedding = await openai_client.generate_single_embedding(query_text)
        span.set_attribute("embed_latency_ms", embed_timer.elapsed_ms)

    with traced_span("rag_pgvector_query", top_k=top_k, threshold=similarity_threshold) as span:
        with LatencyTimer("rag_pgvector_search", logger) as search_timer:
            # pgvector cosine distance query
            result = await db.execute(
                text("""
                    SELECT 
                        chunk_text,
                        1 - (embedding <=> :query_vec::vector) AS similarity
                    FROM resume_embeddings
                    WHERE user_id = :user_id
                      AND 1 - (embedding <=> :query_vec::vector) >= :threshold
                    ORDER BY embedding <=> :query_vec::vector
                    LIMIT :top_k
                """),
                {
                    "query_vec": str(query_embedding),
                    "user_id": str(user_id),
                    "threshold": similarity_threshold,
                    "top_k": top_k,
                },
            )
            rows = result.fetchall()
        span.set_attribute("results_count", len(rows))
        span.set_attribute("search_latency_ms", search_timer.elapsed_ms)

    results = [
        {"chunk_text": row[0], "similarity": float(row[1])}
        for row in rows
    ]

    logger.info(
        f"RAG query returned {len(results)} chunks (top_k={top_k}, threshold={similarity_threshold})",
        extra={
            "phase": "rag_query",
            "field_count": len(results),
            "latency_ms": embed_timer.elapsed_ms + search_timer.elapsed_ms,
        },
    )

    return results


async def delete_user_embeddings(db: AsyncSession, user_id: UUID):
    """Delete all embeddings for a user (e.g., on resume re-upload)."""
    with traced_span("delete_user_embeddings", user_id=str(user_id)):
        await db.execute(
            text("DELETE FROM resume_embeddings WHERE user_id = :user_id"),
            {"user_id": str(user_id)},
        )
        await db.flush()
    logger.info(f"Deleted embeddings for user {user_id}")
