"""add units, profile_updated_at, email verification columns and email_tokens table

Revision ID: q8r9s0t1u2v3
Revises: p7q8r9s0t1u2
Create Date: 2026-10-21 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "q8r9s0t1u2v3"
down_revision = "p7q8r9s0t1u2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("units", sa.String(length=10), nullable=True))
    op.add_column("users", sa.Column("profile_updated_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("password_changed_at", sa.DateTime(), nullable=True))
    # Accounts that existed before verification was introduced are grandfathered in.
    op.execute(sa.text("UPDATE users SET email_verified = :verified").bindparams(verified=True))

    op.create_table(
        "email_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("purpose", sa.String(length=20), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_email_tokens_user_id", "email_tokens", ["user_id"])
    op.create_index("ix_email_tokens_token_hash", "email_tokens", ["token_hash"], unique=True)


def downgrade():
    op.drop_index("ix_email_tokens_token_hash", table_name="email_tokens")
    op.drop_index("ix_email_tokens_user_id", table_name="email_tokens")
    op.drop_table("email_tokens")
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "profile_updated_at")
    op.drop_column("users", "units")
