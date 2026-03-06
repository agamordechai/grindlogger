"""Add GitHub and Discord OAuth columns

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-03-06 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: str | Sequence[str] | None = "b3c4d5e6f7a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add github_id and discord_id columns to users table."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [c["name"] for c in inspector.get_columns("users")]
    existing_indexes = [idx["name"] for idx in inspector.get_indexes("users")]

    if "github_id" not in existing_columns:
        op.add_column(
            "users",
            sa.Column(
                "github_id",
                sqlmodel.sql.sqltypes.AutoString(length=255),
                nullable=True,
            ),
        )
        if "ix_users_github_id" not in existing_indexes:
            op.create_index("ix_users_github_id", "users", ["github_id"], unique=True)

    if "discord_id" not in existing_columns:
        op.add_column(
            "users",
            sa.Column(
                "discord_id",
                sqlmodel.sql.sqltypes.AutoString(length=255),
                nullable=True,
            ),
        )
        if "ix_users_discord_id" not in existing_indexes:
            op.create_index("ix_users_discord_id", "users", ["discord_id"], unique=True)


def downgrade() -> None:
    """Drop github_id and discord_id columns."""
    op.drop_index("ix_users_discord_id", table_name="users")
    op.drop_column("users", "discord_id")
    op.drop_index("ix_users_github_id", table_name="users")
    op.drop_column("users", "github_id")
