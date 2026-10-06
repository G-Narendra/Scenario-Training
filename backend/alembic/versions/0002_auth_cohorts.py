"""Add auth and cohort models

Revision ID: 0002_auth_cohorts
Revises: 0001_initial
Create Date: 2026-10-06 01:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0002_auth_cohorts"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Cohorts
    op.create_table(
        "cohorts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("max_members", sa.Integer(), default=50, nullable=False),
        sa.Column("budget_cap_usd", sa.Float(), default=100.0, nullable=False),
        sa.Column("track_access", sa.String(length=50), default="both", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_cohorts_name", "cohorts", ["name"])
    op.create_index("ix_cohorts_is_active", "cohorts", ["is_active"])

    # Passcodes
    op.create_table(
        "passcodes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "cohort_id",
            sa.String(length=36),
            sa.ForeignKey("cohorts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("uses_count", sa.Integer(), default=0, nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rotated_from_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_passcodes_cohort_id", "passcodes", ["cohort_id"])
    op.create_index("ix_passcodes_code_hash", "passcodes", ["code_hash"], unique=True)

    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "cohort_id",
            sa.String(length=36),
            sa.ForeignKey("cohorts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=50), default="trainee", nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_cohort_id", "users", ["cohort_id"])
    op.create_index("ix_users_email", "users", ["email"])

    # Auth Sessions
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip", sa.String(length=50), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_token_hash", "auth_sessions", ["token_hash"], unique=True)

    # Audit Log
    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("actor_id", sa.String(length=36), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("ip", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_log_actor_id", "audit_log", ["actor_id"])
    op.create_index("ix_audit_log_action", "audit_log", ["action"])

    # Login Attempts
    op.create_table(
        "login_attempts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("ip", sa.String(length=50), nullable=False),
        sa.Column("passcode_prefix", sa.String(length=10), nullable=False),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("success", sa.Boolean(), default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_login_attempts_ip", "login_attempts", ["ip"])
    op.create_index("ix_login_attempts_passcode_prefix", "login_attempts", ["passcode_prefix"])


def downgrade() -> None:
    op.drop_table("login_attempts")
    op.drop_table("audit_log")
    op.drop_table("auth_sessions")
    op.drop_table("users")
    op.drop_table("passcodes")
    op.drop_table("cohorts")
