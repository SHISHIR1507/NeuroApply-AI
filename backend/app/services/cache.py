"""
NeuroApply AI — Redis Cache Operations
Provides async get/set/delete operations with connection pooling.
"""

import json
from typing import Optional, Any

import redis.asyncio as aioredis

from app.config import settings


class CacheService:
    """Async Redis cache wrapper with connection pooling."""

    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self):
        """Initialize the Redis connection pool."""
        self._redis = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )

    async def disconnect(self):
        """Close the Redis connection pool."""
        if self._redis:
            await self._redis.close()

    @property
    def redis(self) -> aioredis.Redis:
        if self._redis is None:
            raise RuntimeError("Redis not connected. Call connect() first.")
        return self._redis

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    async def get(self, key: str) -> Optional[str]:
        """Get a string value by key."""
        return await self.redis.get(key)

    async def set(self, key: str, value: str, ttl_seconds: Optional[int] = None):
        """Set a string value with optional TTL."""
        if ttl_seconds:
            await self.redis.setex(key, ttl_seconds, value)
        else:
            await self.redis.set(key, value)

    async def delete(self, key: str):
        """Delete a key."""
        await self.redis.delete(key)

    async def mget(self, keys: list[str]) -> list[Optional[str]]:
        """Batch get multiple keys (single round-trip)."""
        if not keys:
            return []
        return await self.redis.mget(keys)

    # ------------------------------------------------------------------
    # JSON operations (for structured data like profiles)
    # ------------------------------------------------------------------

    async def get_json(self, key: str) -> Optional[dict]:
        """Get and deserialize a JSON value."""
        raw = await self.redis.get(key)
        if raw:
            return json.loads(raw)
        return None

    async def set_json(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        """Serialize and set a JSON value."""
        raw = json.dumps(value, default=str)
        await self.set(key, raw, ttl_seconds)

    # ------------------------------------------------------------------
    # Answer caching (hot path for field resolution)
    # ------------------------------------------------------------------

    async def cache_answer(self, user_id: str, field_hash: str, value: str, ttl: int = 86400):
        """Cache a resolved answer for 24h (default)."""
        key = f"answer:{user_id}:{field_hash}"
        await self.set(key, value, ttl)

    async def get_cached_answers(self, user_id: str, field_hashes: list[str]) -> list[Optional[str]]:
        """Batch-retrieve cached answers for multiple fields."""
        keys = [f"answer:{user_id}:{fh}" for fh in field_hashes]
        return await self.mget(keys)

    # ------------------------------------------------------------------
    # Profile caching
    # ------------------------------------------------------------------

    async def cache_profile(self, user_id: str, profile_data: dict, ttl: int = 3600):
        """Cache a user profile for 1h (default)."""
        key = f"profile:{user_id}"
        await self.set_json(key, profile_data, ttl)

    async def get_cached_profile(self, user_id: str) -> Optional[dict]:
        """Retrieve a cached user profile."""
        key = f"profile:{user_id}"
        return await self.get_json(key)

    async def invalidate_profile(self, user_id: str):
        """Invalidate cached profile (e.g., on profile update)."""
        key = f"profile:{user_id}"
        await self.delete(key)

    # ------------------------------------------------------------------
    # RAG output caching (eliminates 50-200ms repeat queries)
    # ------------------------------------------------------------------

    async def cache_rag_result(
        self, user_id: str, question_hash: str, value: str, ttl: int = None
    ):
        """
        Cache a RAG result so the same question resolves in ~0ms next time.
        Key pattern: rag:{user_id}:{question_hash}
        """
        from app.config import settings
        ttl = ttl or settings.rag_cache_ttl_seconds
        key = f"rag:{user_id}:{question_hash}"
        await self.set(key, value, ttl)

    async def get_cached_rag_result(
        self, user_id: str, question_hash: str
    ) -> Optional[str]:
        """Retrieve a cached RAG result (returns None on miss)."""
        key = f"rag:{user_id}:{question_hash}"
        return await self.get(key)


# Global singleton — initialized in app lifespan
cache_service = CacheService()
