"""Add Google Calendar sync columns to users and workout_sessions

Revision ID: l3m4n5o6p7q8
Revises: k2l3m4n5o6p7
Create Date: 2026-04-06 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "l3m4n5o6p7q8"
down_revision: str | None = "k2l3m4n5o6p7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Add calendar columns to users table
    existing_user_cols = [c["name"] for c in inspector.get_columns("users")]

    if "google_calendar_refresh_token" not in existing_user_cols:
        op.add_column("users", sa.Column("google_calendar_refresh_token", sa.String(2048), nullable=True))
    if "google_calendar_id" not in existing_user_cols:
        op.add_column("users", sa.Column("google_calendar_id", sa.String(255), nullable=True))
    if "google_calendar_enabled" not in existing_user_cols:
        op.add_column(
            "users", sa.Column("google_calendar_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false"))
        )

    # Add event ID column to workout_sessions table
    existing_session_cols = [c["name"] for c in inspector.get_columns("workout_sessions")]

    if "google_calendar_event_id" not in existing_session_cols:
        op.add_column("workout_sessions", sa.Column("google_calendar_event_id", sa.String(1024), nullable=True))


def downgrade() -> None:
    op.drop_column("workout_sessions", "google_calendar_event_id")
    op.drop_column("users", "google_calendar_enabled")
    op.drop_column("users", "google_calendar_id")
    op.drop_column("users", "google_calendar_refresh_token")
