from datetime import datetime, timedelta, timezone

import pytest

from backend.app.db.models import (
    Cohort,
    Evaluation,
    Scenario,
    SimulationSession,
    Track,
    User,
)
from backend.app.db.session import async_session_factory
from backend.app.services.progress_service import ProgressService


@pytest.mark.asyncio
async def test_cohort_progress_full_aggregation_and_csv():
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)
        cohort = Cohort(
            name="Executive Leadership Cohort",
            starts_at=now - timedelta(days=10),
            expires_at=now + timedelta(days=20),
            is_active=True,
        )
        db.add(cohort)

        track = Track(key="exec", name="Executive Track")
        db.add(track)
        await db.commit()
        await db.refresh(cohort)
        await db.refresh(track)

        scen1 = Scenario(
            track_id=track.id,
            slug="boardroom-clash",
            title="Boardroom Clash",
            topic="Governance",
            status="published",
            difficulty=5,
            brief="Navigate contentious vote",
            opening_line="The board has serious doubts.",
            persona={"name": "Chairman Vance", "role": "Board Chair"},
            hidden_motivations=[],
        )
        scen2 = Scenario(
            track_id=track.id,
            slug="crisis-comms",
            title="Crisis Communications",
            topic="PR",
            status="published",
            difficulty=4,
            brief="Manage press leak",
            opening_line="The press is outside.",
            persona={"name": "Reporter Diaz", "role": "Journalist"},
            hidden_motivations=[],
        )
        db.add_all([scen1, scen2])

        user1 = User(
            display_name="CEO Trainee",
            role="trainee",
            cohort_id=cohort.id,
            is_active=True,
        )
        user2 = User(
            display_name="COO Trainee",
            role="trainee",
            cohort_id=cohort.id,
            is_active=True,
        )
        db.add_all([user1, user2])
        await db.commit()
        await db.refresh(scen1)
        await db.refresh(scen2)
        await db.refresh(user1)
        await db.refresh(user2)

        # User 1 completed sessions for scen1 and scen2
        s1 = SimulationSession(
            user_id=user1.id,
            scenario_id=scen1.id,
            mode="text",
            status="completed",
            started_at=now - timedelta(days=2, hours=1),
            ended_at=now - timedelta(days=2),
            token_usage=200,
        )
        s2 = SimulationSession(
            user_id=user1.id,
            scenario_id=scen2.id,
            mode="voice",
            status="completed",
            started_at=now - timedelta(days=1, hours=1),
            ended_at=now - timedelta(days=1),
            audio_seconds=120.0,
            token_usage=300,
        )

        # User 2 has 1 completed session and 1 abandoned session
        s3 = SimulationSession(
            user_id=user2.id,
            scenario_id=scen1.id,
            mode="text",
            status="completed",
            started_at=now - timedelta(hours=5),
            ended_at=now - timedelta(hours=4),
            token_usage=150,
        )
        s4 = SimulationSession(
            user_id=user2.id,
            scenario_id=scen1.id,
            mode="text",
            status="abandoned",
            started_at=now - timedelta(hours=2),
            token_usage=50,
        )
        db.add_all([s1, s2, s3, s4])
        await db.commit()
        await db.refresh(s1)
        await db.refresh(s2)
        await db.refresh(s3)

        # Evaluations
        ev1 = Evaluation(
            session_id=s1.id,
            overall_score=88,
            skill_scores=[
                {"skill_key": "negotiation", "skill_name": "Negotiation", "score": 90},
                {"skill_key": "composure", "skill_name": "Composure", "score": 85},
            ],
            strengths=[],
            weaknesses=[],
            key_moments=[],
            improvement_steps=[],
            summary="Great leadership under pressure.",
        )
        ev2 = Evaluation(
            session_id=s2.id,
            overall_score=78,
            skill_scores=[
                {"skill_key": "negotiation", "skill_name": "Negotiation", "score": 75},
                {"skill_key": "composure", "skill_name": "Composure", "score": 80},
            ],
            strengths=[],
            weaknesses=[],
            key_moments=[],
            improvement_steps=[],
            summary="Good crisis handling.",
        )
        ev3 = Evaluation(
            session_id=s3.id,
            overall_score=60,
            skill_scores=[
                {"skill_key": "negotiation", "skill_name": "Negotiation", "score": 55},
                {"skill_key": "composure", "skill_name": "Composure", "score": 65},
            ],
            strengths=[],
            weaknesses=[],
            key_moments=[],
            improvement_steps=[],
            summary="Needs improvement.",
        )
        db.add_all([ev1, ev2, ev3])
        await db.commit()

        # Run get_cohort_progress
        progress = await ProgressService.get_cohort_progress(db, cohort.id)
        assert progress.total_members == 2
        assert progress.active_members == 2
        assert progress.total_sessions_completed == 3
        assert progress.cohort_average_score == 75.3  # (88 + 78 + 60) / 3 = 75.3
        assert len(progress.skill_score_distribution) == 2
        assert len(progress.most_failed_scenarios) > 0
        assert len(progress.members) == 2

        # Check member skills
        ceo_member = next(m for m in progress.members if m.user_id == user1.id)
        assert ceo_member.sessions_completed == 2
        assert ceo_member.average_score == 83.0  # (88 + 78) / 2
        assert ceo_member.top_skill is not None
        assert ceo_member.needs_work_skill is not None

        # Run export_cohort_csv
        csv_str = await ProgressService.export_cohort_csv(db, cohort.id)
        assert "CEO Trainee" in csv_str
        assert "COO Trainee" in csv_str
        assert "Boardroom Clash" in csv_str
        assert "Crisis Communications" in csv_str
        assert "abandoned" in csv_str
        assert "completed" in csv_str

        # Also test get_trainee_progress fallback when user1 has completed all published scenarios
        trainee_prog = await ProgressService.get_trainee_progress(db, user1)
        assert trainee_prog.total_sessions_completed == 2
        assert len(trainee_prog.recommended_scenarios) > 0
        assert any("Repeat" in r.reason for r in trainee_prog.recommended_scenarios)
