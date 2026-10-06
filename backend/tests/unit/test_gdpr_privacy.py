import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from backend.app.db.models import (
    AuditLog,
    AuthSession,
    Evaluation,
    Message,
    Scenario,
    SimulationSession,
    User,
)
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.services.access_service import AccessService


@pytest.mark.asyncio
async def test_gdpr_data_export_and_erasure_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Setup cohort and login user
        async with async_session_factory() as db:
            cohort, plain_code = await AccessService.create_cohort(
                db=db, name="Privacy Test Cohort", duration_days=30, track_access="sales"
            )

        login_res = await client.post(
            "/api/auth/login", json={"passcode": plain_code, "display_name": "GDPR Subject"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        user_id = login_res.json()["user"]["id"]
        auth_header = {"Authorization": f"Bearer {token}"}

        # 2. Add sample session, messages, and evaluation for this user
        async with async_session_factory() as db:
            from backend.app.db.models import Track
            track = Track(key="gdpr_track", name="GDPR Track")
            db.add(track)
            await db.flush()

            scenario = Scenario(
                track_id=track.id,
                slug="gdpr-test-scenario",
                title="GDPR Scenario",
                topic="Compliance",
                status="published",
                difficulty=1,
                duration_limit_seconds=600,
                turn_limit=5,
                brief="Brief overview of privacy rights.",
                persona={
                    "name": "Marcus Vance",
                    "role": "VP",
                    "personality": ["Cautious"],
                    "communication_style": "Direct",
                    "emotional_baseline": "neutral",
                },
                hidden_motivations=["Ensure strict compliance"],
                objections=["Data privacy concerns"],
                success_criteria=["Protect user PII"],
                skills_assessed=[{"skill": "compliance", "weight": 1.0}],
                opening_line="Hello, let's talk.",
            )
            db.add(scenario)
            await db.flush()

            sim_session = SimulationSession(
                scenario_id=scenario.id,
                user_id=user_id,
                mode="text",
                status="completed",
            )
            db.add(sim_session)
            await db.flush()

            msg1 = Message(
                session_id=sim_session.id,
                seq=1,
                role="trainee",
                content="Hello Marcus, let's discuss privacy rights.",
            )
            msg2 = Message(
                session_id=sim_session.id,
                seq=2,
                role="counterpart",
                content="Sure, I take privacy very seriously.",
            )
            db.add_all([msg1, msg2])

            eval_rec = Evaluation(
                session_id=sim_session.id,
                overall_score=88,
                summary="Exemplary demonstration of privacy considerations.",
                strengths=[{"point": "Respectful"}],
                weaknesses=[{"point": "None"}],
            )
            db.add(eval_rec)
            await db.commit()

        # 3. Test GDPR Article 20: Right to Data Portability (Export)
        export_res = await client.get("/api/auth/me/export", headers=auth_header)
        assert export_res.status_code == 200
        export_data = export_res.json()

        assert "user_profile" in export_data
        assert export_data["user_profile"]["id"] == user_id
        assert export_data["user_profile"]["display_name"] == "GDPR Subject"

        assert "simulation_history" in export_data
        assert len(export_data["simulation_history"]) == 1
        history_entry = export_data["simulation_history"][0]
        assert history_entry["session_id"] == sim_session.id
        assert history_entry["status"] == "completed"
        assert history_entry["messages_count"] == 2
        assert history_entry["evaluation"]["overall_score"] == 88
        assert history_entry["evaluation"]["summary"] == "Exemplary demonstration of privacy considerations."
        assert "exported_at" in export_data

        # 4. Test GDPR Article 17: Right to Erasure (Delete/Anonymize Account)
        delete_res = await client.delete("/api/auth/me", headers=auth_header)
        assert delete_res.status_code == 200
        assert "successfully anonymized" in delete_res.json()["message"]

        # 5. Verify database state after erasure
        async with async_session_factory() as db:
            # User profile is anonymized
            user_stmt = select(User).where(User.id == user_id)
            user_db = (await db.execute(user_stmt)).scalar_one()
            assert user_db.display_name == "Anonymized Trainee"
            assert user_db.email is None
            assert user_db.is_active is False

            # Session token is revoked
            session_stmt = select(AuthSession).where(AuthSession.user_id == user_id)
            active_sessions = (await db.execute(session_stmt)).scalars().all()
            assert len(active_sessions) == 0

            # Audit log records the erasure
            audit_stmt = select(AuditLog).where(
                AuditLog.actor_id == user_id, AuditLog.action == "USER_DATA_ERASURE"
            )
            audit_entry = (await db.execute(audit_stmt)).scalar_one_or_none()
            assert audit_entry is not None
            assert audit_entry.entity == "User"

        # 6. Verify subsequent requests using the deleted session token return 401 Unauthorized
        subsequent_res = await client.get("/api/auth/me", headers=auth_header)
        assert subsequent_res.status_code == 401
