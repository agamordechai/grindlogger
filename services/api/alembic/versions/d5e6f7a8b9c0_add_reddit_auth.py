"""Add Reddit OAuth column

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-03-06 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: str | Sequence[str] | None = "c4d5e6f7a8b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add reddit_id column to users table."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [c["name"] for c in inspector.get_columns("users")]
    existing_indexes = [idx["name"] for idx in inspector.get_indexes("users")]

    if "reddit_id" not in existing_columns:
        op.add_column(
            "users",
            sa.Column(
                "reddit_id",
                sqlmodel.sql.sqltypes.AutoString(length=255),
                nullable=True,
            ),
        )
        if "ix_users_reddit_id" not in existing_indexes:
            op.create_index("ix_users_reddit_id", "users", ["reddit_id"], unique=True)


def downgrade() -> None:
    """Drop reddit_id column."""
    op.drop_index("ix_users_reddit_id", table_name="users")
    op.drop_column("users", "reddit_id")
