from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.models import (
    AuthSession,
    Cohort,
    Evaluation,
    Scenario,
    SimulationSession,
    Track,
    User,
)
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token
from backend.app.services.progress_service import ProgressService


@pytest.mark.asyncio
async def test_progress_streak_multi_day_and_audio_duration():
    async with async_session_factory() as db:
        track = Track(key="leadership", name="Leadership Mastery")
        db.add(track)
        await db.commit()
        await db.refresh(track)

        scen = Scenario(
            track_id=track.id,
            slug="firing-session",
            title="Termination Conversation",
            topic="Performance",
            status="published",
            difficulty=4,
            brief="Manage difficult separation",
            opening_line="Do you have a moment to talk?",
            persona={"name": "Morgan", "role": "Senior Engineer"},
            hidden_motivations=["Expected a promotion"],
        )
        db.add(scen)

        user = User(display_name="Veteran Trainee", role="trainee", is_active=True)
        db.add(user)
        await db.commit()
        await db.refresh(scen)
        await db.refresh(user)

        now = datetime.now(timezone.utc)
        # Create sessions on 3 consecutive days: today, yesterday, 2 days ago
        for i in range(3):
            sess_time = now - timedelta(days=i)
            sess = SimulationSession(
                user_id=user.id,
                scenario_id=scen.id,
                mode="voice",
                status="completed",
                started_at=sess_time - timedelta(minutes=5),
                ended_at=None,  # tests fallback duration via audio_seconds
                audio_seconds=150.0,
                token_usage=100,
            )
            db.add(sess)
            await db.commit()
            await db.refresh(sess)

            eval_rec = Evaluation(
                session_id=sess.id,
                overall_score=75 + i * 5,
                skill_scores=[
                    {"skill_key": "empathy", "skill_name": "Empathy", "score": 80},
                    {"skill_name": "Firm Boundaries", "score": 70},  # test skill_name fallback
                ],
                strengths=[],
                weaknesses=[],
                key_moments=[],
                improvement_steps=[],
                summary="Multi-day consistency.",
            )
            db.add(eval_rec)
            await db.commit()

        # Call service directly
        res = await ProgressService.get_trainee_progress(db, user)
        assert res.total_sessions_completed == 3
        assert res.current_streak_days == 3
        assert res.total_time_seconds == 450  # 3 * 150 seconds
        assert res.overall_average_score == 80.0
        assert len(res.skill_averages) == 2


@pytest.mark.asyncio
async def test_progress_streak_with_gap():
    async with async_session_factory() as db:
        track = Track(key="leadership-2", name="Leadership Mastery")
        db.add(track)
        await db.commit()
        await db.refresh(track)

        scen = Scenario(
            track_id=track.id,
            slug="gap-scenario",
            title="Feedback Meeting",
            topic="Feedback",
            status="published",
            difficulty=1,
            brief="Quarterly feedback",
            opening_line="How did Q3 go?",
            persona={"name": "Taylor", "role": "Associate"},
            hidden_motivations=[],
        )
        db.add(scen)

        user = User(display_name="Gap Trainee", role="trainee", is_active=True)
        db.add(user)
        await db.commit()
        await db.refresh(scen)
        await db.refresh(user)

        now = datetime.now(timezone.utc)
        # Create 1 session 5 days ago (broken streak)
        sess = SimulationSession(
            user_id=user.id,
            scenario_id=scen.id,
            mode="text",
            status="completed",
            started_at=now - timedelta(days=5),
            ended_at=now - timedelta(days=5) + timedelta(minutes=3),
        )
        db.add(sess)
        await db.commit()

        res = await ProgressService.get_trainee_progress(db, user)
        assert res.total_sessions_completed == 1
        assert res.current_streak_days == 0


@pytest.mark.asyncio
async def test_super_admin_bypasses_cohort_restriction():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with async_session_factory() as db:
            now = datetime.now(timezone.utc)
            cohort = Cohort(
                name="Global Enterprise Cohort",
                starts_at=now,
                expires_at=now + timedelta(days=30),
                is_active=True,
            )
            db.add(cohort)
            await db.commit()
            await db.refresh(cohort)

            # Super admin has no cohort_id (global admin)
            super_admin = User(
                display_name="Root Admin",
                role="super_admin",
                cohort_id=None,
                is_active=True,
            )
            db.add(super_admin)
            await db.commit()
            await db.refresh(super_admin)

            token, _, _ = create_access_token(super_admin.id, "super_admin")
            exp = now + timedelta(hours=1)
            db.add(
                AuthSession(
                    user_id=super_admin.id,
                    token_hash=hash_token(token),
                    expires_at=exp,
                )
            )
            await db.commit()

        # Super admin can view any cohort's progress
        res = await client.get(
            f"/api/admin/cohorts/{cohort.id}/progress",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert res.json()["cohort_id"] == cohort.id

        # Super admin can export any cohort's CSV
        res_csv = await client.get(
            f"/api/admin/cohorts/{cohort.id}/export.csv",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_csv.status_code == 200
        assert res_csv.headers["content-type"].startswith("text/csv")


@pytest.mark.asyncio
async def test_cohort_not_found_errors():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with async_session_factory() as db:
            super_admin = User(
                display_name="Root Admin",
                role="super_admin",
                cohort_id=None,
                is_active=True,
            )
            db.add(super_admin)
            await db.commit()
            await db.refresh(super_admin)

            token, _, _ = create_access_token(super_admin.id, "super_admin")
            exp = datetime.now(timezone.utc) + timedelta(hours=1)
            db.add(
                AuthSession(
                    user_id=super_admin.id,
                    token_hash=hash_token(token),
                    expires_at=exp,
                )
            )
            await db.commit()

        # Progress for nonexistent cohort -> 404
        res = await client.get(
            "/api/admin/cohorts/00000000-0000-0000-0000-000000000000/progress",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 404

        # Export for nonexistent cohort -> 404
        res_csv = await client.get(
            "/api/admin/cohorts/00000000-0000-0000-0000-000000000000/export.csv",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_csv.status_code == 404
