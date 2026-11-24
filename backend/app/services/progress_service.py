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

        headers = [
            "Participant Name",
            "Scenario Title",
            "Track",
            "Practice Mode",
            "Overall Score (%)",
            "Benchmark Status",
            "Key Strengths (Goods)",
            "Critical Gaps / Deflections (Bads)",
            "Priority Coaching Adjustments (Improvements)",
            "Duration",
            "Date & Time",
            "Session Status",
        ]

        if not users:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)
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
        writer.writerow(headers)

        for s in sessions:
            u = users_by_id.get(s.user_id)
            d_name = u.display_name if u else "Unknown"
            sc_title = s.scenario.title if s.scenario else "Unknown"
            trk = s.scenario.track.name if s.scenario and s.scenario.track else "Unknown"
            score = s.evaluation.overall_score if s.evaluation else ""
            dur = 0
            if s.ended_at and s.started_at:
                dur = max(0, int((s.ended_at - s.started_at).total_seconds()))

            dur_str = f"{dur // 60}m {dur % 60}s" if dur > 0 else f"{dur}s"
            mode_str = "Voice Call" if s.mode == "voice" else "Written Dialogue"

            started_dt = _ensure_utc(s.started_at)
            date_str = started_dt.strftime("%Y-%m-%d %H:%M UTC") if started_dt else ""

            if score != "" and score is not None:
                numeric_score = int(score)
                if numeric_score >= 85:
                    status_tier = "Mastered (85-100%)"
                elif numeric_score >= 70:
                    status_tier = "Proficient (70-84%)"
                elif numeric_score >= 50:
                    status_tier = "Developing (50-69%)"
                else:
                    status_tier = "Needs Coaching (<50%)"
            else:
                status_tier = "Not Evaluated"

            goods = ""
            bads = ""
            improvements = ""
            if s.evaluation:
                goods_list = [w.get("why_it_worked", "") or w.get("quote", "") for w in (s.evaluation.strengths or []) if w.get("why_it_worked") or w.get("quote")]
                goods = "; ".join(goods_list)

                bads_list = [w.get("why_it_missed", "") or w.get("quote", "") for w in (s.evaluation.weaknesses or []) if w.get("why_it_missed") or w.get("quote")]
                bads = "; ".join(bads_list)

                imp_list = [f"{imp.get('step', '')}: {imp.get('practice_drill') or imp.get('why', '')}" for imp in (s.evaluation.improvement_steps or []) if imp.get("step")]
                improvements = "; ".join(imp_list)

            writer.writerow(
                [
                    d_name,
                    sc_title,
                    trk,
                    mode_str,
                    score,
                    status_tier,
                    goods,
                    bads,
                    improvements,
                    dur_str,
                    date_str,
                    s.status,
                ]
            )

        return output.getvalue()

    @classmethod
    def _generate_standalone_report_html(
        cls,
        participant_name: str,
        scenario_title: str,
        track_name: str,
        mode_str: str,
        score: Any,
        evaluation: Any,
        session: Any,
    ) -> str:
        """Generate high-density, printable 1-page HTML standalone debrief report."""
        import html

        p_name = html.escape(participant_name)
        s_title = html.escape(scenario_title)
        t_name = html.escape(track_name)
        m_str = html.escape(mode_str)
        num_score = int(score) if score is not None and score != "" else 0

        if num_score >= 85:
            tier_label = "Mastered (85-100%)"
            tier_color = "#047857"
            tier_bg = "#ecfdf5"
        elif num_score >= 70:
            tier_label = "Proficient (70-84%)"
            tier_color = "#1d4ed8"
            tier_bg = "#eff6ff"
        elif num_score >= 50:
            tier_label = "Developing (50-69%)"
            tier_color = "#b45309"
            tier_bg = "#fffbeb"
        else:
            tier_label = "Needs Coaching (<50%)"
            tier_color = "#b91c1c"
            tier_bg = "#fef2f2"

        eval_summary = (getattr(evaluation, "summary", "") or getattr(evaluation, "overall_summary", "")) if evaluation else ""
        summary_text = html.escape(eval_summary) if eval_summary else (
            "This practice session concluded early with preliminary dialogue. Practice engaging with deeper discovery questions to uncover your counterpart's underlying priorities."
            if num_score == 0
            else "Executive practice session concluded. Review prioritized coaching adjustments and practice drills below."
        )

        strengths_html = ""
        if evaluation and evaluation.strengths:
            for item in evaluation.strengths:
                q = html.escape(item.get("quote", "") or "")
                w = html.escape(item.get("why_it_worked", "") or "")
                quote_part = f'<strong style="color: #065f46; font-style: italic;">"{q}": </strong>' if q and q != "[No dialogue submitted]" else ""
                strengths_html += f'<li style="margin-bottom: 6px; line-height: 1.5;">{quote_part}<span>{w}</span></li>'
        else:
            strengths_html = '<li style="margin-bottom: 6px; line-height: 1.5;">Maintained conversational composure and active listening.</li>'

        weaknesses_html = ""
        if evaluation and evaluation.weaknesses:
            for item in evaluation.weaknesses:
                q = html.escape(item.get("quote", "") or "")
                w = html.escape(item.get("why_it_missed", "") or "")
                quote_part = f'<strong style="color: #991b1b; font-style: italic;">"{q}": </strong>' if q and q != "[No dialogue submitted]" else ""
                weaknesses_html += f'<li style="margin-bottom: 6px; line-height: 1.5;">{quote_part}<span>{w}</span></li>'
        else:
            weaknesses_html = '<li style="margin-bottom: 6px; line-height: 1.5;">Clarify counterpart constraints before proposing commitments.</li>'

        improvements_html = ""
        if evaluation and evaluation.improvement_steps:
            for idx, item in enumerate(evaluation.improvement_steps):
                step = html.escape(item.get("step", "") or "")
                drill = html.escape(item.get("practice_drill", "") or item.get("why", "") or "")
                improvements_html += f'<li style="margin-bottom: 6px; line-height: 1.5;"><strong>{step}: </strong><span>{drill}</span></li>'
        else:
            improvements_html = '<li style="margin-bottom: 6px; line-height: 1.5;">Execute a 14-day discovery drill focusing on objection reframing.</li>'

        started_dt = _ensure_utc(session.started_at) if session and session.started_at else None
        date_str = started_dt.strftime("%Y-%m-%d %H:%M UTC") if started_dt else "Recent Session"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>3H Solutions - Executive Performance Report - {p_name}</title>
  <style>
    @page {{ size: A4 portrait; margin: 10mm 12mm; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.4;
      font-size: 13px;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #b91c1c;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }}
    .brand {{
      font-size: 18px;
      font-weight: 900;
      color: #0b192c;
      letter-spacing: -0.5px;
    }}
    .brand span {{ color: #b91c1c; }}
    .badge {{
      display: inline-block;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      background: #f1f5f9;
      color: #334155;
    }}
    .meta-grid {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 16px;
    }}
    .meta-item {{ font-size: 11px; }}
    .meta-label {{ color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 9px; margin-bottom: 2px; }}
    .meta-value {{ font-weight: 700; color: #0f172a; font-size: 12px; }}
    .score-card {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      background: #fdfdfd;
    }}
    .score-gauge {{
      text-align: right;
    }}
    .score-number {{
      font-size: 32px;
      font-weight: 900;
      color: {tier_color};
    }}
    .section {{
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }}
    .section-title {{
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }}
    .section-strengths {{ border-color: #a7f3d0; background: #f0fdf4; }}
    .section-strengths .section-title {{ color: #047857; }}
    .section-weaknesses {{ border-color: #fecaca; background: #fff1f2; }}
    .section-weaknesses .section-title {{ color: #b91c1c; }}
    .section-improvements {{ border-color: #cbd5e1; background: #f8fafc; }}
    .section-improvements .section-title {{ color: #0b192c; }}
    ul, ol {{ margin: 0; padding-left: 18px; }}
    .footer {{
      margin-top: 18px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 10px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }}
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">3H <span>SOLUTIONS GROUP</span></div>
    <div class="badge">Executive Performance Debrief · 1-Page Summary</div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <div class="meta-label">Participant</div>
      <div class="meta-value">{p_name}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Scenario Title</div>
      <div class="meta-value">{s_title}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Curriculum Track</div>
      <div class="meta-value">{t_name}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Practice Mode & Date</div>
      <div class="meta-value">{m_str} · {date_str}</div>
    </div>
  </div>

  <div class="score-card">
    <div style="max-width: 70%;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Executive Diagnostic Summary</div>
      <div style="font-size: 12px; margin-top: 4px; color: #334155; line-height: 1.4;">{summary_text}</div>
    </div>
    <div class="score-gauge">
      <div class="score-number">{num_score}<span style="font-size: 14px; color: #64748b;">/100</span></div>
      <div style="font-size: 10px; font-weight: 700; color: {tier_color}; background: {tier_bg}; padding: 2px 8px; border-radius: 9999px; display: inline-block;">{tier_label}</div>
    </div>
  </div>

  <div class="section section-strengths">
    <div class="section-title">Key Strengths Demonstrated (Goods)</div>
    <ul>{strengths_html}</ul>
  </div>

  <div class="section section-weaknesses">
    <div class="section-title">Priority Coaching Adjustments (Bads & Deflections)</div>
    <ul>{weaknesses_html}</ul>
  </div>

  <div class="section section-improvements">
    <div class="section-title">Targeted Action Plan & Practice Drills (Improvements)</div>
    <ol>{improvements_html}</ol>
  </div>

  <div class="footer">
    <div>Confidential Executive Coaching Assessment · Uzair Hassan · 3H Solutions Group</div>
    <div>Dubai, United Arab Emirates · Enterprise Grade Architecture</div>
  </div>
</body>
</html>"""

    @classmethod
    async def export_cohort_archive_zip(cls, db: AsyncSession, cohort_id: str) -> bytes:
        """Export all session results, evaluations, and standalone individual reports as a ZIP archive."""
        import json
        import re
        import zipfile

        cohort = await db.get(Cohort, cohort_id)
        cohort_name = cohort.name if cohort else "3H_Cohort"

        # 1. Master CSV
        csv_data = await cls.export_cohort_csv(db=db, cohort_id=cohort_id)

        # 2. Fetch users and sessions
        users_stmt = select(User).where(User.cohort_id == cohort_id)
        users = (await db.execute(users_stmt)).scalars().all()
        users_by_id = {u.id: u for u in users}

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

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            cohort_clean = re.sub(r"[^a-zA-Z0-9_-]", "_", cohort_name)
            zf.writestr(f"{cohort_clean}_facilitator_scores.csv", csv_data)

            scores = [s.evaluation.overall_score for s in sessions if s.evaluation and s.evaluation.overall_score is not None]
            avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

            summary_info = {
                "cohort_id": cohort_id,
                "cohort_name": cohort_name,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "total_enrolled_members": len(users),
                "total_reports_archived": len(sessions),
                "average_score": avg_score,
                "format_version": "1.0.0",
                "storage_safeguard_threshold": 100,
            }
            zf.writestr("archive_summary.json", json.dumps(summary_info, indent=2))

            for idx, s in enumerate(sessions):
                u = users_by_id.get(s.user_id)
                d_name = u.display_name if u else "Participant"
                sc_title = s.scenario.title if s.scenario else "Executive Scenario"
                score = s.evaluation.overall_score if s.evaluation else 0
                track_name = s.scenario.track.name if s.scenario and s.scenario.track else "Executive Training"
                mode_str = "Voice Call" if s.mode == "voice" else "Written Dialogue"

                safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", d_name)
                safe_title = re.sub(r"[^a-zA-Z0-9_-]", "_", sc_title)[:30]
                filename = f"individual_reports/{idx+1:02d}_{safe_name}_{safe_title}_Report.html"

                html_report = cls._generate_standalone_report_html(
                    participant_name=d_name,
                    scenario_title=sc_title,
                    track_name=track_name,
                    mode_str=mode_str,
                    score=score,
                    evaluation=s.evaluation,
                    session=s,
                )
                zf.writestr(filename, html_report)

        return zip_buffer.getvalue()
