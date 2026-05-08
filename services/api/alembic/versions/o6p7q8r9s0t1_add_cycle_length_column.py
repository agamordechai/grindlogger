"""add cycle_length column to users table

Revision ID: o6p7q8r9s0t1
Revises: n5o6p7q8r9s0
Create Date: 2026-05-07 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "o6p7q8r9s0t1"
down_revision = "n5o6p7q8r9s0"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("cycle_length", sa.Integer(), nullable=False, server_default="7"))


def downgrade():
    op.drop_column("users", "cycle_length")
