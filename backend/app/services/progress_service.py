import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.models import Cohort, Scenario, SimulationSession, User
from backend.app.schemas.progress import (
    CohortMemberProgress,
    CohortProgressResponse,
    MostFailedScenario,
    RecentSessionSummary,
    RecommendedScenario,
    ScoreTrendPoint,
    SkillAverage,
    TraineeProgressResponse,
)


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class ProgressService:
    @staticmethod
    async def get_trainee_progress(db: AsyncSession, user: User) -> TraineeProgressResponse:
        # Fetch all sessions for user with scenario and evaluation
        stmt = (
            select(SimulationSession)
            .where(SimulationSession.user_id == user.id)
            .options(
                selectinload(SimulationSession.scenario).selectinload(Scenario.track),
                selectinload(SimulationSession.evaluation),
            )
            .order_by(SimulationSession.started_at.desc())
        )
        sessions = (await db.execute(stmt)).scalars().all()

        completed_sessions = [s for s in sessions if s.status == "completed"]
        total_sessions_completed = len(completed_sessions)

        # Total practice time
        total_time_seconds = 0
        for s in completed_sessions:
            if s.ended_at and s.started_at:
                dur = int((s.ended_at - s.started_at).total_seconds())
                total_time_seconds += max(0, dur)
            elif s.audio_seconds > 0:
                total_time_seconds += int(s.audio_seconds)
            else:
                total_time_seconds += 180

        # Streak calculation (consecutive days with completed sessions)
        completed_dates = set()
        for s in completed_sessions:
            dt = s.ended_at or s.started_at
            if dt:
                u_dt = _ensure_utc(dt)
                if u_dt:
                    completed_dates.add(u_dt.date())

        current_streak = 0
        today = datetime.now(timezone.utc).date()
        yesterday = today - timedelta(days=1)

        check_date = None
        if today in completed_dates:
            check_date = today
        elif yesterday in completed_dates:
            check_date = yesterday

        if check_date:
            while check_date in completed_dates:
                current_streak += 1
                check_date = check_date - timedelta(days=1)

        # Overall average score
        evaluated_sessions = [s for s in completed_sessions if s.evaluation is not None]
        if evaluated_sessions:
            score_list = [int(s.evaluation.overall_score) for s in evaluated_sessions if s.evaluation is not None]
            overall_avg = round(sum(score_list) / len(score_list), 1) if score_list else 0.0
        else:
            overall_avg = 0.0

        # Skill averages calculation
        skill_stats: Dict[str, Dict[str, Any]] = {}
        for s in evaluated_sessions:
            ev = s.evaluation
            if not ev or not ev.skill_scores:
                continue
            for item in ev.skill_scores:
                k = item.get("skill_key") or item.get("skill_name") or "general"
                name = item.get("skill_name") or k.replace("_", " ").title()
                score = float(item.get("score", 0))
                if k not in skill_stats:
                    skill_stats[k] = {"name": name, "total": 0.0, "count": 0}
                skill_stats[k]["total"] += score
                skill_stats[k]["count"] += 1

        skill_averages: List[SkillAverage] = []
        for k, data in skill_stats.items():
            avg_val = round(data["total"] / data["count"], 1)
            skill_averages.append(
                SkillAverage(
                    skill_key=k,
                    skill_name=data["name"],
                    average_score=avg_val,
                    session_count=data["count"],
                )
            )
        # Sort by average score ascending (so weakest skills appear clearly)
        skill_averages.sort(key=lambda x: x.average_score)

        # Recent sessions
        recent_summaries: List[RecentSessionSummary] = []
        for s in sessions[:10]:
            scen_title = s.scenario.title if s.scenario else "Untitled Scenario"
            trk_key = s.scenario.track.key if s.scenario and s.scenario.track else "general"
            score_val = s.evaluation.overall_score if s.evaluation else None
            dur = 0
            if s.ended_at and s.started_at:
                dur = max(0, int((s.ended_at - s.started_at).total_seconds()))

            recent_summaries.append(
                RecentSessionSummary(
                    session_id=s.id,
                    scenario_id=s.scenario_id,
                    scenario_title=scen_title,
                    track_key=trk_key,
                    mode=s.mode,
                    status=s.status,
                    score=score_val,
                    completed_at=s.ended_at or s.started_at,
                    duration_seconds=dur,
                )
            )

        # Score trends (sorted chronologically)
        trends: List[ScoreTrendPoint] = []
        sorted_for_trend = sorted(
            [s for s in evaluated_sessions if s.ended_at or s.started_at],
            key=lambda x: _ensure_utc(x.ended_at or x.started_at) or datetime.min.replace(tzinfo=timezone.utc),
        )
        for s in sorted_for_trend:
            trend_dt = _ensure_utc(s.ended_at or s.started_at)
            date_str = trend_dt.strftime("%Y-%m-%d") if trend_dt else ""
            scen_title = s.scenario.title if s.scenario else "Scenario"
            trends.append(
                ScoreTrendPoint(
                    date=date_str,
                    score=s.evaluation.overall_score if s.evaluation else 0,
                    scenario_title=scen_title,
                    session_id=s.id,
                )
            )

        # Recommended scenarios:
        # Fetch published scenarios
        scen_stmt = (
            select(Scenario)
            .where(Scenario.status == "published")
            .options(selectinload(Scenario.track))
        )
        published_scenarios = (await db.execute(scen_stmt)).scalars().all()

        completed_scenario_ids = {s.scenario_id for s in completed_sessions}

        recommended: List[RecommendedScenario] = []
        # If user has a weakest skill (< 75), look for scenarios testing that skill
        weakest_skill = skill_averages[0] if skill_averages else None

        for sc in published_scenarios:
            if len(recommended) >= 3:
                break
            if sc.id in completed_scenario_ids:
                continue

            reason = "Recommended scenario to build core competence"
            if weakest_skill:
                reason = f"Targeted drill to improve {weakest_skill.skill_name} (your score: {weakest_skill.average_score}%)"
            elif sc.difficulty <= 2:
                reason = "Introductory scenario recommended for foundational practice"

            recommended.append(
                RecommendedScenario(
                    scenario_id=sc.id,
                    title=sc.title,
                    track_key=sc.track.key if sc.track else "general",
                    difficulty=sc.difficulty,
                    topic=sc.topic,
                    reason=reason,
                )
            )

        # Fallback if all published were completed
        if len(recommended) < 3:
            for sc in published_scenarios:
                if len(recommended) >= 3:
                    break
                if any(r.scenario_id == sc.id for r in recommended):
                    continue
                recommended.append(
                    RecommendedScenario(
                        scenario_id=sc.id,
                        title=sc.title,
                        track_key=sc.track.key if sc.track else "general",
                        difficulty=sc.difficulty,
                        topic=sc.topic,
                        reason="Repeat practice to sharpen mastery",
                    )
                )

        return TraineeProgressResponse(
            total_sessions_completed=total_sessions_completed,
            total_time_seconds=total_time_seconds,
            current_streak_days=current_streak,
            overall_average_score=overall_avg,
            skill_averages=skill_averages,
            recent_sessions=recent_summaries,
            recommended_scenarios=recommended,
            score_trends=trends,
        )

    @staticmethod
    async def get_cohort_progress(db: AsyncSession, cohort_id: str) -> CohortProgressResponse:
        cohort = await db.get(Cohort, cohort_id)
        if not cohort:
            raise ValueError(f"Cohort {cohort_id} not found")

        # Fetch all members of this cohort
        users_stmt = select(User).where(User.cohort_id == cohort_id).order_by(User.created_at.asc())
        members = (await db.execute(users_stmt)).scalars().all()
        member_ids = [m.id for m in members]

        # Fetch all sessions in cohort
        sessions_stmt = (
            select(SimulationSession)
            .where(SimulationSession.user_id.in_(member_ids))
            .options(
                selectinload(SimulationSession.scenario).selectinload(Scenario.track),
                selectinload(SimulationSession.evaluation),
            )
        )
        sessions = (await db.execute(sessions_stmt)).scalars().all() if member_ids else []

        completed_sessions = [s for s in sessions if s.status == "completed"]
        active_user_ids = {s.user_id for s in completed_sessions}

        # Cohort average score
        evals = [s.evaluation for s in completed_sessions if s.evaluation is not None]
        cohort_avg = round(sum(e.overall_score for e in evals) / len(evals), 1) if evals else 0.0

        # Skill score distribution
        skill_stats: Dict[str, Dict[str, Any]] = {}
        for ev in evals:
            if not ev.skill_scores:
                continue
            for item in ev.skill_scores:
                k = item.get("skill_key") or item.get("skill_name") or "general"
                name = item.get("skill_name") or k.replace("_", " ").title()
                score = float(item.get("score", 0))
                if k not in skill_stats:
                    skill_stats[k] = {"name": name, "total": 0.0, "count": 0}
                skill_stats[k]["total"] += score
                skill_stats[k]["count"] += 1

        skill_distribution: List[SkillAverage] = []
        for k, data in skill_stats.items():
            avg_val = round(data["total"] / data["count"], 1)
            skill_distribution.append(
                SkillAverage(
                    skill_key=k,
                    skill_name=data["name"],
                    average_score=avg_val,
                    session_count=data["count"],
                )
            )
        skill_distribution.sort(key=lambda x: x.average_score)

        # Most failed / challenging scenarios
        scenario_groups: Dict[str, List[SimulationSession]] = {}
        for s in sessions:
            scenario_groups.setdefault(s.scenario_id, []).append(s)

        most_failed: List[MostFailedScenario] = []
        for sc_id, sc_sessions in scenario_groups.items():
            first_s = sc_sessions[0]
            sc_title = first_s.scenario.title if first_s.scenario else "Scenario"
            trk_key = (
                first_s.scenario.track.key
                if first_s.scenario and first_s.scenario.track
                else "general"
            )
            sc_diff = first_s.scenario.difficulty if first_s.scenario else 3

            attempts = len(sc_sessions)
            comp = [s for s in sc_sessions if s.status == "completed"]
            comp_rate = round(len(comp) / attempts, 2) if attempts else 0.0
            sc_evals = [s.evaluation for s in comp if s.evaluation]
            sc_avg = (
                round(sum(e.overall_score for e in sc_evals) / len(sc_evals), 1)
                if sc_evals
                else 0.0
            )

            most_failed.append(
                MostFailedScenario(
                    scenario_id=sc_id,
                    title=sc_title,
                    track_key=trk_key,
                    difficulty=sc_diff,
                    average_score=sc_avg,
                    attempts_count=attempts,
                    completion_rate=comp_rate,
                )
            )
        # Sort by average score ascending (most difficult first)
        most_failed.sort(key=lambda x: (x.average_score, x.completion_rate))

        # Member progress items
        member_progress_list: List[CohortMemberProgress] = []
        for m in members:
            m_sessions = [s for s in sessions if s.user_id == m.id]
            m_completed = [s for s in m_sessions if s.status == "completed"]
            m_evals = [s.evaluation for s in m_completed if s.evaluation]

            m_avg = (
                round(sum(e.overall_score for e in m_evals) / len(m_evals), 1) if m_evals else None
            )

            last_active: Optional[datetime] = None
            if m_sessions:
                valid_starts: List[datetime] = [
                    u_dt
                    for s in m_sessions
                    if (u_dt := _ensure_utc(s.started_at)) is not None
                ]
                if valid_starts:
                    last_active = max(valid_starts)

            # Compute user top and needs work skills
            m_skills: Dict[str, List[float]] = {}
            for e in m_evals:
                if not e.skill_scores:
                    continue
                for sk in e.skill_scores:
                    nm = sk.get("skill_name") or sk.get("skill_key") or ""
                    if nm:
                        m_skills.setdefault(nm, []).append(float(sk.get("score", 0)))

            top_skill = None
            needs_work = None
            if m_skills:
                sorted_sk = sorted(
                    [(k, sum(v) / len(v)) for k, v in m_skills.items()],
                    key=lambda x: x[1],
                )
                needs_work = sorted_sk[0][0]
                top_skill = sorted_sk[-1][0]

            member_progress_list.append(
                CohortMemberProgress(
                    user_id=m.id,
                    display_name=m.display_name,
                    role=m.role,
                    sessions_completed=len(m_completed),
                    average_score=m_avg,
                    last_active_at=last_active,
                    top_skill=top_skill,
                    needs_work_skill=needs_work,
                )
            )

        return CohortProgressResponse(
            cohort_id=cohort.id,
            cohort_name=cohort.name,
            total_members=len(members),
            active_members=len(active_user_ids),
            total_sessions_completed=len(completed_sessions),
            cohort_average_score=cohort_avg,
            skill_score_distribution=skill_distribution,
            most_failed_scenarios=most_failed[:5],
            members=member_progress_list,
        )

    @staticmethod
    async def export_cohort_csv(db: AsyncSession, cohort_id: str) -> str:
        cohort = await db.get(Cohort, cohort_id)
        if not cohort:
            raise ValueError(f"Cohort {cohort_id} not found")

        users_stmt = select(User).where(User.cohort_id == cohort_id)
        users = (await db.execute(users_stmt)).scalars().all()
        users_by_id = {u.id: u for u in users}

        if not users:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(
                [
                    "User ID",
                    "Display Name",
                    "Session ID",
                    "Scenario Title",
                    "Track",
                    "Mode",
                    "Status",
                    "Started At",
                    "Ended At",
                    "Duration (Seconds)",
                    "Overall Score",
                    "End Reason",
                ]
            )
            return output.getvalue()

        sessions_stmt = (
            select(SimulationSession)
            .where(SimulationSession.user_id.in_(list(users_by_id.keys())))
            .options(
                selectinload(SimulationSession.scenario).selectinload(Scenario.track),
                selectinload(SimulationSession.evaluation),
            )
            .order_by(SimulationSession.started_at.desc())
        )
        sessions = (await db.execute(sessions_stmt)).scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "User ID",
                "Display Name",
                "Session ID",
                "Scenario Title",
                "Track",
                "Mode",
                "Status",
                "Started At",
                "Ended At",
                "Duration (Seconds)",
                "Overall Score",
                "End Reason",
            ]
        )

        for s in sessions:
            u = users_by_id.get(s.user_id)
            d_name = u.display_name if u else "Unknown"
            sc_title = s.scenario.title if s.scenario else "Unknown"
            trk = s.scenario.track.name if s.scenario and s.scenario.track else "Unknown"
            score = s.evaluation.overall_score if s.evaluation else ""
            dur = 0
            if s.ended_at and s.started_at:
                dur = max(0, int((s.ended_at - s.started_at).total_seconds()))

            started_dt = _ensure_utc(s.started_at)
            ended_dt = _ensure_utc(s.ended_at)
            started_str = started_dt.isoformat() if started_dt else ""
            ended_str = ended_dt.isoformat() if ended_dt else ""

            writer.writerow(
                [
                    s.user_id,
                    d_name,
                    s.id,
                    sc_title,
                    trk,
                    s.mode,
                    s.status,
                    started_str,
                    ended_str,
                    dur,
                    score,
                    s.end_reason or "",
                ]
            )

        return output.getvalue()
