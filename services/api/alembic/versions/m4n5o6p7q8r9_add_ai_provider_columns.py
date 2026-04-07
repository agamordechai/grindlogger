"""Add AI provider credential columns to users table

Revision ID: m4n5o6p7q8r9
Revises: l3m4n5o6p7q8
Create Date: 2026-04-07 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "m4n5o6p7q8r9"
down_revision: str | None = "l3m4n5o6p7q8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_cols = [c["name"] for c in inspector.get_columns("users")]

    if "ai_api_key_encrypted" not in existing_cols:
        op.add_column("users", sa.Column("ai_api_key_encrypted", sa.String(2048), nullable=True))
    if "ai_base_url" not in existing_cols:
        op.add_column("users", sa.Column("ai_base_url", sa.String(1024), nullable=True))
    if "ai_model" not in existing_cols:
        op.add_column("users", sa.Column("ai_model", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "ai_model")
    op.drop_column("users", "ai_base_url")
    op.drop_column("users", "ai_api_key_encrypted")
