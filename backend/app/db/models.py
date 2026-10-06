import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base, TimestampMixin, utc_now


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Cohort(Base, TimestampMixin):
    __tablename__ = "cohorts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    max_members: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    budget_cap_usd: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    track_access: Mapped[str] = mapped_column(
        String(50), default="both", nullable=False
    )  # sales, leadership, both

    # Relationships
    passcodes: Mapped[List["Passcode"]] = relationship(
        "Passcode", back_populates="cohort", cascade="all, delete-orphan"
    )
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="cohort", cascade="all, delete-orphan"
    )


class Passcode(Base, TimestampMixin):
    __tablename__ = "passcodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    cohort_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    valid_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    max_uses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    uses_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rotated_from_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    cohort: Mapped["Cohort"] = relationship("Cohort", back_populates="passcodes")


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    cohort_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("cohorts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    role: Mapped[str] = mapped_column(
        String(50), default="trainee", nullable=False
    )  # trainee, group_admin, super_admin
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    cohort: Mapped[Optional["Cohort"]] = relationship("Cohort", back_populates="users")
    sessions: Mapped[List["AuthSession"]] = relationship(
        "AuthSession", back_populates="user", cascade="all, delete-orphan"
    )


class AuthSession(Base, TimestampMixin):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions")


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class LoginAttempt(Base, TimestampMixin):
    __tablename__ = "login_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ip: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    passcode_prefix: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Track(Base, TimestampMixin):
    __tablename__ = "tracks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    key: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True
    )  # sales, leadership
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    skills: Mapped[List["Skill"]] = relationship(
        "Skill", back_populates="track", cascade="all, delete-orphan"
    )
    scenarios: Mapped[List["Scenario"]] = relationship(
        "Scenario", back_populates="track", cascade="all, delete-orphan"
    )


class Skill(Base, TimestampMixin):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    track_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rubric: Mapped[Dict[str, Any]] = mapped_column(
        JSON, default=dict, nullable=False
    )  # 1 to 5 levels

    track: Mapped["Track"] = relationship("Track", back_populates="skills")


class Scenario(Base, TimestampMixin):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    track_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tracks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="draft", nullable=False, index=True
    )  # draft, published, archived
    difficulty: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1 to 5
    topic: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    duration_limit_seconds: Mapped[int] = mapped_column(Integer, default=600, nullable=False)
    turn_limit: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    brief: Mapped[str] = mapped_column(Text, nullable=False)
    persona: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    hidden_motivations: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    objections: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    curveballs: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    success_criteria: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    skills_assessed: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    opening_line: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    conclusion_signals: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    track: Mapped["Track"] = relationship("Track", back_populates="scenarios")
    versions: Mapped[List["ScenarioVersion"]] = relationship(
        "ScenarioVersion", back_populates="scenario", cascade="all, delete-orphan"
    )


class ScenarioVersion(Base, TimestampMixin):
    __tablename__ = "scenario_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    scenario_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    changed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    change_note: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="versions")
