"""Async database connection pool using asyncpg and Cloud SQL unix sockets."""

import logging
from typing import Optional

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def create_pool() -> asyncpg.Pool:
    """Create the asyncpg connection pool.

    Uses a Cloud SQL unix socket path for production, or a standard
    TCP connection string for local development.
    """
    global _pool

    dsn = settings.DATABASE_URL
    logger.info("Creating database connection pool")

    _pool = await asyncpg.create_pool(
        dsn=dsn,
        min_size=2,
        max_size=10,
    )

    logger.info("Database connection pool created successfully")
    return _pool


async def close_pool() -> None:
    """Close the asyncpg connection pool."""
    global _pool

    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")


def get_pool() -> asyncpg.Pool:
    """Return the current connection pool.

    Raises RuntimeError if the pool has not been created yet.
    """
    if _pool is None:
        raise RuntimeError(
            "Database pool is not initialized. "
            "Ensure create_pool() is called during app startup."
        )
    return _pool
