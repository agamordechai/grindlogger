"""add per_side column to exercises

Revision ID: n5o6p7q8r9s0
Revises: m4n5o6p7q8r9
Create Date: 2026-05-07 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = 'n5o6p7q8r9s0'
down_revision = 'm4n5o6p7q8r9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('exercises', sa.Column('per_side', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('exercises', 'per_side')
