"""Add archived column to exercises table

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-03-19 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e6f7a8b9c0d1"
down_revision: str | Sequence[str] | None = "d5e6f7a8b9c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add archived column to exercises table."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [c["name"] for c in inspector.get_columns("exercises")]
    existing_indexes = [idx["name"] for idx in inspector.get_indexes("exercises")]

    if "archived" not in existing_columns:
        op.add_column(
            "exercises",
            sa.Column("archived", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )
        if "ix_exercises_archived" not in existing_indexes:
            op.create_index("ix_exercises_archived", "exercises", ["archived"])


def downgrade() -> None:
    """Drop archived column from exercises table."""
    op.drop_index("ix_exercises_archived", table_name="exercises")
    op.drop_column("exercises", "archived")
