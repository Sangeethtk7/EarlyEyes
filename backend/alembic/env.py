"""
Alembic environment configuration.

Configured for async SQLAlchemy (asyncpg driver) with autogenerate support.
Our ORM models are imported here so that Base.metadata is populated and
Alembic can diff it against the live database schema.
"""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# ── Import application settings and models ────────────────────────────────────
# Settings provides the DATABASE_URL used at runtime.
from core.config import settings

# Import Base so its metadata is populated with all table definitions.
from core.database import Base

# Import all models to register them with Base.metadata before autogenerate.
import db.models  # noqa: F401  — side-effect import registers all ORM models

# ── Alembic config object ─────────────────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override the sqlalchemy.url from alembic.ini with the runtime DATABASE_URL.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Metadata to use for autogenerate (``--autogenerate`` flag in alembic revision).
target_metadata = Base.metadata


# ── Offline migrations (no live DB connection) ────────────────────────────────
def run_migrations_offline() -> None:
    """
    Run migrations in *offline* mode.

    In offline mode, Alembic emits SQL to stdout rather than executing it
    against a live database.  Useful for generating SQL scripts for review
    or for database environments where direct connectivity is unavailable.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (async, live DB connection) ─────────────────────────────
def do_run_migrations(connection: Connection) -> None:
    """
    Execute pending migrations using an existing synchronous *connection*.

    Args:
        connection: An open SQLAlchemy :class:`~sqlalchemy.engine.Connection`.
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Create an async engine and run migrations within a synchronous context.

    The async engine is bridged to the synchronous Alembic migration runner
    via :meth:`~sqlalchemy.ext.asyncio.AsyncConnection.run_sync`.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Run migrations in *online* mode using an async engine.

    Delegates to :func:`run_async_migrations` via ``asyncio.run``.
    """
    asyncio.run(run_async_migrations())


# ── Entry point ───────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
