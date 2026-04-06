"""Add set_details table for per-set tracking

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-04-05 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "k2l3m4n5o6p7"
down_revision: str | Sequence[str] | None = "j1k2l3m4n5o6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create set_details table for individual set tracking."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "set_details" not in existing_tables:
        op.create_table(
            "set_details",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "session_exercise_id",
                sa.Integer(),
                sa.ForeignKey("session_exercises.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("set_number", sa.Integer(), nullable=False),
            sa.Column("reps", sa.Integer(), nullable=False),
            sa.Column("weight", sa.Float(), nullable=True),
            sa.Column("set_type", sa.String(length=20), nullable=False, server_default=sa.text("'normal'")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_set_details_session_exercise_id", "set_details", ["session_exercise_id"])


def downgrade() -> None:
    """Drop set_details table."""
    op.drop_table("set_details")
