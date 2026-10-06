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


@pytest.mark.asyncio
async def test_trainee_progress_empty():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a trainee
        async with async_session_factory() as db:
            trainee = User(display_name="New Trainee", role="trainee", is_active=True)
            db.add(trainee)
            await db.commit()
            await db.refresh(trainee)

            token, _, _ = create_access_token(trainee.id, "trainee")
            exp = datetime.now(timezone.utc) + timedelta(hours=1)
            db.add(
                AuthSession(
                    user_id=trainee.id,
                    token_hash=hash_token(token),
                    expires_at=exp,
                )
            )
            await db.commit()

        res = await client.get(
            "/api/progress/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_sessions_completed"] == 0
        assert data["total_time_seconds"] == 0
        assert data["current_streak_days"] == 0
        assert data["overall_average_score"] == 0.0
        assert data["skill_averages"] == []
        assert data["recent_sessions"] == []
        assert isinstance(data["recommended_scenarios"], list)


@pytest.mark.asyncio
async def test_trainee_progress_with_completed_session():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with async_session_factory() as db:
            # Create track & scenario
            track = Track(key="sales", name="Sales Mastery")
            db.add(track)
            await db.commit()
            await db.refresh(track)

            scen = Scenario(
                track_id=track.id,
                slug="negotiation-drill",
                title="Contract Renewal",
                topic="Procurement",
                status="published",
                difficulty=2,
                brief="Negotiate renewal terms",
                opening_line="Hello, let's talk about the contract.",
                persona={"name": "Alex", "role": "VP Procurement"},
                hidden_motivations=["Budget capped at $50k"],
            )
            db.add(scen)

            trainee = User(display_name="Alice Trainee", role="trainee", is_active=True)
            db.add(trainee)
            await db.commit()
            await db.refresh(scen)
            await db.refresh(trainee)

            token, _, _ = create_access_token(trainee.id, "trainee")
            exp = datetime.now(timezone.utc) + timedelta(hours=1)
            db.add(
                AuthSession(
                    user_id=trainee.id,
                    token_hash=hash_token(token),
                    expires_at=exp,
                )
            )

            # Create completed session & evaluation
            now = datetime.now(timezone.utc)
            start_time = now - timedelta(minutes=10)
            end_time = now - timedelta(minutes=2)
            session = SimulationSession(
                user_id=trainee.id,
                scenario_id=scen.id,
                mode="text",
                status="completed",
                started_at=start_time,
                ended_at=end_time,
                end_reason="natural",
                token_usage=450,
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)

            eval_record = Evaluation(
                session_id=session.id,
                overall_score=82,
                skill_scores=[
                    {
                        "skill_key": "active_listening",
                        "skill_name": "Active Listening",
                        "score": 80,
                    },
                    {
                        "skill_key": "objection_handling",
                        "skill_name": "Objection Handling",
                        "score": 84,
                    },
                ],
                strengths=[],
                weaknesses=[],
                key_moments=[],
                improvement_steps=[],
                summary="Solid performance.",
            )
            db.add(eval_record)
            await db.commit()

        # Query progress/me
        res = await client.get(
            "/api/progress/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_sessions_completed"] == 1
        assert data["total_time_seconds"] == 480  # 8 minutes
        assert data["current_streak_days"] == 1
        assert data["overall_average_score"] == 82.0
        assert len(data["skill_averages"]) == 2
        assert len(data["recent_sessions"]) == 1
        assert data["recent_sessions"][0]["score"] == 82
        assert len(data["score_trends"]) == 1
        assert data["score_trends"][0]["score"] == 82


@pytest.mark.asyncio
async def test_cohort_progress_and_multi_tenant_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async with async_session_factory() as db:
            # Create two cohorts
            now = datetime.now(timezone.utc)
            cohort_a = Cohort(
                name="Cohort Alpha",
                starts_at=now,
                expires_at=now + timedelta(days=30),
                is_active=True,
            )
            cohort_b = Cohort(
                name="Cohort Beta",
                starts_at=now,
                expires_at=now + timedelta(days=30),
                is_active=True,
            )
            db.add_all([cohort_a, cohort_b])
            await db.commit()
            await db.refresh(cohort_a)
            await db.refresh(cohort_b)

            # Users
            admin_a = User(
                display_name="Admin Alpha",
                role="group_admin",
                cohort_id=cohort_a.id,
                is_active=True,
            )
            trainee_a = User(
                display_name="Trainee Alpha",
                role="trainee",
                cohort_id=cohort_a.id,
                is_active=True,
            )
            db.add_all([admin_a, trainee_a])
            await db.commit()
            await db.refresh(admin_a)
            await db.refresh(trainee_a)

            # Tokens
            token_admin_a, _, _ = create_access_token(admin_a.id, "group_admin")
            token_trainee_a, _, _ = create_access_token(trainee_a.id, "trainee")

            exp = now + timedelta(hours=1)
            db.add(
                AuthSession(
                    user_id=admin_a.id,
                    token_hash=hash_token(token_admin_a),
                    expires_at=exp,
                )
            )
            db.add(
                AuthSession(
                    user_id=trainee_a.id,
                    token_hash=hash_token(token_trainee_a),
                    expires_at=exp,
                )
            )
            await db.commit()

        # 1. Trainee cannot access cohort progress -> 403 Forbidden
        res = await client.get(
            f"/api/admin/cohorts/{cohort_a.id}/progress",
            headers={"Authorization": f"Bearer {token_trainee_a}"},
        )
        assert res.status_code == 403

        # 2. Trainee cannot export cohort CSV -> 403 Forbidden
        res = await client.get(
            f"/api/admin/cohorts/{cohort_a.id}/export.csv",
            headers={"Authorization": f"Bearer {token_trainee_a}"},
        )
        assert res.status_code == 403

        # 3. Admin A cannot access Cohort B progress -> 403 Forbidden
        res = await client.get(
            f"/api/admin/cohorts/{cohort_b.id}/progress",
            headers={"Authorization": f"Bearer {token_admin_a}"},
        )
        assert res.status_code == 403

        # 4. Admin A cannot export Cohort B CSV -> 403 Forbidden
        res = await client.get(
            f"/api/admin/cohorts/{cohort_b.id}/export.csv",
            headers={"Authorization": f"Bearer {token_admin_a}"},
        )
        assert res.status_code == 403

        # 5. Admin A can access Cohort A progress -> 200 OK
        res = await client.get(
            f"/api/admin/cohorts/{cohort_a.id}/progress",
            headers={"Authorization": f"Bearer {token_admin_a}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["cohort_id"] == cohort_a.id
        assert data["cohort_name"] == "Cohort Alpha"
        assert data["total_members"] == 2
        assert data["active_members"] == 0
        assert len(data["members"]) == 2

        # 6. Admin A can export Cohort A CSV -> 200 OK
        res = await client.get(
            f"/api/admin/cohorts/{cohort_a.id}/export.csv",
            headers={"Authorization": f"Bearer {token_admin_a}"},
        )
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/csv")
        csv_text = res.text
        assert "User ID" in csv_text
        assert "Scenario Title" in csv_text
        assert "Overall Score" in csv_text
