"""Add sort_order column to exercises table

Revision ID: h9i0j1k2l3m4
Revises: g8h9i0j1k2l3
Create Date: 2026-03-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "h9i0j1k2l3m4"
down_revision: str | Sequence[str] | None = "g8h9i0j1k2l3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("exercises", "sort_order")
