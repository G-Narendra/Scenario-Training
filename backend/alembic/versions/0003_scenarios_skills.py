"""Add tracks, skills, scenarios, and scenario_versions

Revision ID: 0003_scenarios_skills
Revises: 0002_auth_cohorts
Create Date: 2026-10-06 01:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0003_scenarios_skills"
down_revision: Union[str, None] = "0002_auth_cohorts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tracks
    op.create_table(
        "tracks",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("key", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tracks_key", "tracks", ["key"], unique=True)

    # Skills
    op.create_table(
        "skills",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "track_id",
            sa.String(length=36),
            sa.ForeignKey("tracks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("rubric", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_skills_track_id", "skills", ["track_id"])
    op.create_index("ix_skills_key", "skills", ["key"])

    # Scenarios
    op.create_table(
        "scenarios",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "track_id",
            sa.String(length=36),
            sa.ForeignKey("tracks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=50), default="draft", nullable=False),
        sa.Column("difficulty", sa.Integer(), default=3, nullable=False),
        sa.Column("topic", sa.String(length=100), nullable=False),
        sa.Column("version", sa.Integer(), default=1, nullable=False),
        sa.Column("duration_limit_seconds", sa.Integer(), default=600, nullable=False),
        sa.Column("turn_limit", sa.Integer(), default=30, nullable=False),
        sa.Column("brief", sa.Text(), nullable=False),
        sa.Column("persona", sa.JSON(), nullable=False),
        sa.Column("hidden_motivations", sa.JSON(), nullable=False),
        sa.Column("objections", sa.JSON(), nullable=False),
        sa.Column("curveballs", sa.JSON(), nullable=False),
        sa.Column("success_criteria", sa.JSON(), nullable=False),
        sa.Column("skills_assessed", sa.JSON(), nullable=False),
        sa.Column("opening_line", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("conclusion_signals", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_scenarios_track_id", "scenarios", ["track_id"])
    op.create_index("ix_scenarios_slug", "scenarios", ["slug"], unique=True)
    op.create_index("ix_scenarios_status", "scenarios", ["status"])
    op.create_index("ix_scenarios_topic", "scenarios", ["topic"])

    # Scenario Versions
    op.create_table(
        "scenario_versions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "scenario_id",
            sa.String(length=36),
            sa.ForeignKey("scenarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column("changed_by", sa.String(length=36), nullable=True),
        sa.Column("change_note", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_scenario_versions_scenario_id", "scenario_versions", ["scenario_id"])


def downgrade() -> None:
    op.drop_table("scenario_versions")
    op.drop_table("scenarios")
    op.drop_table("skills")
    op.drop_table("tracks")
