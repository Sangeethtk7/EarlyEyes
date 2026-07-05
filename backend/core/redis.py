"""
Redis connection helpers and token blacklist utilities.
"""
import redis.asyncio as aioredis
from fastapi import Depends

from core.config import settings

# ── Connection pool ───────────────────────────────────────────────────────────
_redis_pool: aioredis.Redis | None = None


def get_redis_pool() -> aioredis.Redis:
    """
    Return (and lazily create) a module-level async Redis connection pool.
    Using a pool avoids opening a new connection on every request.
    """
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_pool


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_redis() -> aioredis.Redis:
    """
    FastAPI dependency that yields the shared Redis connection pool.
    No explicit close is needed — the pool manages its own lifecycle.
    """
    return get_redis_pool()


# ── Token blacklist helpers ───────────────────────────────────────────────────
async def blacklist_token(token: str, expire_seconds: int) -> None:
    """
    Add *token* to the Redis blacklist with a TTL of *expire_seconds*.

    The key is prefixed with ``blacklist:`` to avoid collisions with other
    Redis namespaces used by the application.

    Args:
        token: The raw JWT string to invalidate.
        expire_seconds: Number of seconds until the blacklist entry expires.
            This should be set to the remaining lifetime of the token so that
            the entry is cleaned up automatically once the token would have
            expired anyway.
    """
    redis = get_redis_pool()
    key = f"blacklist:{token}"
    await redis.setex(key, expire_seconds, "1")


async def is_token_blacklisted(token: str) -> bool:
    """
    Check whether *token* has been blacklisted (e.g. after logout).

    Args:
        token: The raw JWT string to check.

    Returns:
        ``True`` if the token is on the blacklist, ``False`` otherwise.
    """
    redis = get_redis_pool()
    key = f"blacklist:{token}"
    value = await redis.get(key)
    return value is not None
