"""Add workout_sessions and session_exercises tables

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-03-23 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7a8b9c0d1e2"
down_revision: str | Sequence[str] | None = "e6f7a8b9c0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create workout_sessions and session_exercises tables."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "workout_sessions" not in existing_tables:
        op.create_table(
            "workout_sessions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("workout_date", sa.Date(), nullable=False),
            sa.Column("workout_day", sa.String(length=10), nullable=False),
            sa.Column("notes", sa.String(length=1000), nullable=True),
            sa.Column("duration_minutes", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_workout_sessions_user_id", "workout_sessions", ["user_id"])
        op.create_index("ix_workout_sessions_date", "workout_sessions", ["workout_date"])
        op.create_index(
            "ix_workout_sessions_user_date",
            "workout_sessions",
            ["user_id", "workout_date"],
        )

    if "session_exercises" not in existing_tables:
        op.create_table(
            "session_exercises",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "session_id",
                sa.Integer(),
                sa.ForeignKey("workout_sessions.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("exercise_name", sa.String(length=100), nullable=False),
            sa.Column("sets_completed", sa.Integer(), nullable=False),
            sa.Column("reps_completed", sa.Integer(), nullable=False),
            sa.Column("weight_used", sa.Float(), nullable=True),
            sa.Column("one_rep_max", sa.Float(), nullable=True),
            sa.Column("order", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_session_exercises_session_id", "session_exercises", ["session_id"])


def downgrade() -> None:
    """Drop workout_sessions and session_exercises tables."""
    op.drop_table("session_exercises")
    op.drop_table("workout_sessions")
