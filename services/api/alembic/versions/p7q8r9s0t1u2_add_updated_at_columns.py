"""add updated_at columns to exercises, workout_sessions, body_measurements

Revision ID: p7q8r9s0t1u2
Revises: o6p7q8r9s0t1
Create Date: 2026-08-10 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "p7q8r9s0t1u2"
down_revision = "o6p7q8r9s0t1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "exercises", sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now())
    )
    op.add_column(
        "workout_sessions", sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now())
    )
    op.add_column(
        "body_measurements", sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now())
    )


def downgrade():
    op.drop_column("body_measurements", "updated_at")
    op.drop_column("workout_sessions", "updated_at")
    op.drop_column("exercises", "updated_at")
