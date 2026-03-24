"""add body measurements table

Revision ID: g8h9i0j1k2l3
Revises: f7a8b9c0d1e2
Create Date: 2026-03-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "g8h9i0j1k2l3"
down_revision: str | None = "a8b9c0d1e2f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "body_measurements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("measurement_date", sa.Date(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("body_fat_pct", sa.Float(), nullable=True),
        sa.Column("chest_cm", sa.Float(), nullable=True),
        sa.Column("waist_cm", sa.Float(), nullable=True),
        sa.Column("hips_cm", sa.Float(), nullable=True),
        sa.Column("bicep_left_cm", sa.Float(), nullable=True),
        sa.Column("bicep_right_cm", sa.Float(), nullable=True),
        sa.Column("thigh_left_cm", sa.Float(), nullable=True),
        sa.Column("thigh_right_cm", sa.Float(), nullable=True),
        sa.Column("neck_cm", sa.Float(), nullable=True),
        sa.Column("shoulders_cm", sa.Float(), nullable=True),
        sa.Column("forearm_cm", sa.Float(), nullable=True),
        sa.Column("calf_cm", sa.Float(), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_body_measurements_user_id", "body_measurements", ["user_id"])
    op.create_index("ix_body_measurements_measurement_date", "body_measurements", ["measurement_date"])


def downgrade() -> None:
    op.drop_index("ix_body_measurements_measurement_date", table_name="body_measurements")
    op.drop_index("ix_body_measurements_user_id", table_name="body_measurements")
    op.drop_table("body_measurements")
