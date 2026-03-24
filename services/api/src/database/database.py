"""SQLModel database engine and session management.

This module provides database connection handling using SQLModel.
Supports both PostgreSQL and SQLite based on configuration.
"""

import logging
from collections.abc import Generator

from sqlmodel import Session, SQLModel, create_engine

from services.api.src.database.config import get_settings

# Get settings
settings = get_settings()

# Create database URL
if settings.db.is_postgres:
    # PostgreSQL URL
    database_url = settings.db.url
    connect_args = {}
else:
    # SQLite URL
    database_url = f"sqlite:///{settings.db.path}"
    # SQLite-specific settings
    connect_args = {"check_same_thread": False}

# Create SQLModel engine
engine = create_engine(
    database_url,
    echo=settings.db.echo_sql,
    connect_args=connect_args,
)


def init_db() -> None:
    """Initialize database tables.

    Creates all tables defined in SQLModel metadata if they don't exist.
    This is safe to call multiple times - it only creates missing tables.

    NOTE: For production, database schema should be managed by Alembic migrations.
    To run migrations manually: cd services/api && alembic upgrade head
    """
    import time

    # Import all models to ensure they're registered with SQLModel metadata
    from services.api.src.database.db_models import (  # noqa: F401
        ExerciseTable,
        SessionExerciseTable,
        UserTable,
        WorkoutSessionTable,
    )

    # Retry loop to handle Postgres being slow to accept connections after pg_isready
    last_exc: Exception | None = None
    for attempt in range(1, 6):
        try:
            SQLModel.metadata.create_all(engine)
            return
        except Exception as exc:
            last_exc = exc
            wait = 2**attempt  # 2, 4, 8, 16, 32s
            logging.getLogger(__name__).warning("DB not ready (attempt %d/5), retrying in %ds: %s", attempt, wait, exc)
            time.sleep(wait)
    raise RuntimeError("Database unavailable after 5 attempts") from last_exc


def get_session() -> Generator[Session, None, None]:
    """Provide a database session for dependency injection.

    Yields:
        Session: SQLModel session for database operations
    """
    with Session(engine) as session:
        yield session
