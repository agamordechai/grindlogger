"""add variant_group column

Revision ID: j1k2l3m4n5o6
Revises: i0j1k2l3m4n5
Create Date: 2026-03-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'j1k2l3m4n5o6'
down_revision = 'i0j1k2l3m4n5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('exercises', sa.Column('variant_group', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('exercises', 'variant_group')
