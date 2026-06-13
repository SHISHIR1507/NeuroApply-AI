"""
NeuroApply AI — Database Engine & Session Factory
Async SQLAlchemy engine with pgvector support.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.config import settings


# ------------------------------------------------------------------
# Async engine — connection pool reused across the application lifetime
# ------------------------------------------------------------------
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

# ------------------------------------------------------------------
# Session factory — yields AsyncSession instances for dependency injection
# ------------------------------------------------------------------
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async DB session and ensures cleanup."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    Called once during application startup.
    Enables the pgvector extension and creates all tables.
    """
    from app.models import SQLModel  # noqa: F811 — deferred import to avoid circular deps

    async with engine.begin() as conn:
        # Enable pgvector extension (idempotent)
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Create all tables defined by SQLModel metadata
        await conn.run_sync(SQLModel.metadata.create_all)
