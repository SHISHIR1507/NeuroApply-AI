"""
NeuroApply AI — Configuration
Centralizes all environment-driven settings using pydantic-settings.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "NeuroApply AI"
    debug: bool = False

    # --- PostgreSQL (with pgvector) ---
    database_url: str = "postgresql+asyncpg://neuroapply:neuroapply_dev@localhost:5432/neuroapply"
    database_url_sync: str = "postgresql://neuroapply:neuroapply_dev@localhost:5432/neuroapply"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- JWT Auth ---
    jwt_secret_key: str = "change-me-to-a-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    # --- OpenAI API ---
    openai_api_key: str = "sk-placeholder"
    openai_llm_model: str = "gpt-4o-mini"
    openai_embed_model: str = "text-embedding-3-small"

    # --- CORS ---
    # Published extension + Vercel marketing site + local dev.
    # NOTE: on Render this is overridden by the CORS_ORIGINS env var — keep them in sync.
    cors_origins: List[str] = [
        "chrome-extension://nglhmaeijiphnabgdeeimepoophpffpd",
        "https://neuro-apply-ai.vercel.app",
        "http://localhost:3000",
    ]

    # --- Embedding dimensions (text-embedding-3-small outputs 1536-dim) ---
    embedding_dimensions: int = 1536

    # --- Resume parsing ---
    max_resume_size_mb: int = 10
    resume_chunk_size: int = 512
    resume_chunk_overlap: int = 50

    # --- RAG Latency Optimizations ---
    rag_cache_ttl_seconds: int = 86400          # Cache RAG results for 24h
    rag_max_top_k: int = 3                      # Hard cap on vector search results
    rag_similarity_threshold: float = 0.55      # Minimum cosine similarity
    rag_max_chunk_chars: int = 400              # Cap returned chunk text length

    # --- Observability ---
    log_level: str = "INFO"
    enable_tracing: bool = True
    otel_service_name: str = "neuroapply-backend"


settings = Settings()
