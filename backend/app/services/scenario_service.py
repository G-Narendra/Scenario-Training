from typing import List, Optional

import yaml
from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import Scenario, ScenarioVersion, Track
from backend.app.schemas.scenarios import (
    ConclusionSignalsSchema,
    CurveballSchema,
    PersonaPreview,
    PersonaSchema,
    PublicScenarioDetail,
    PublicScenarioListItem,
    PublicSkillPreview,
    ScenarioConfigSchema,
    SkillAssessedSchema,
)


class ScenarioService:
    @staticmethod
    def parse_and_validate_yaml(yaml_content: str) -> ScenarioConfigSchema:
        """Parse raw YAML string and validate against strict ScenarioConfigSchema."""
        try:
            raw_data = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"YAML parsing error: {str(e)}"
            )

        if not isinstance(raw_data, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scenario YAML must define a mapping/dictionary object.",
            )

        try:
            validated = ScenarioConfigSchema(**raw_data)
            return validated
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Scenario schema validation failure: {str(e)}",
            )

    @staticmethod
    async def get_or_create_track(db: AsyncSession, track_key: str) -> Track:
        """Ensure track exists in database."""
        stmt = select(Track).where(Track.key == track_key.lower())
        track = (await db.execute(stmt)).scalar_one_or_none()
        if not track:
            name = "Sales Mastery" if track_key.lower() == "sales" else "Leadership & Communication"
            track = Track(
                key=track_key.lower(), name=name, description=f"{name} track scenarios and skills."
            )
            db.add(track)
            await db.flush()
        return track

    @classmethod
    async def save_scenario_from_config(
        cls,
        db: AsyncSession,
        config: ScenarioConfigSchema,
        status_val: str = "published",
        changed_by: Optional[str] = None,
        change_note: Optional[str] = None,
    ) -> Scenario:
        """Save new scenario or update existing with version snapshotting."""
        track = await cls.get_or_create_track(db, config.track)

        stmt = select(Scenario).where(Scenario.slug == config.slug)
        scenario = (await db.execute(stmt)).scalar_one_or_none()

        snapshot_data = config.model_dump()
        snapshot_data["status"] = status_val

        if scenario:
            scenario.version += 1
            scenario.title = config.title
            scenario.topic = config.topic
            scenario.difficulty = config.difficulty
            scenario.status = status_val
            scenario.duration_limit_seconds = config.duration_limit_seconds
            scenario.turn_limit = config.turn_limit
            scenario.brief = config.brief
            scenario.persona = config.persona.model_dump()
            scenario.hidden_motivations = config.hidden_motivations
            scenario.objections = config.objections
            scenario.curveballs = [cb.model_dump() for cb in config.curveballs]
            scenario.success_criteria = config.success_criteria
            scenario.skills_assessed = [s.model_dump() for s in config.skills_assessed]
            scenario.opening_line = config.opening_line
            scenario.tags = config.tags
            scenario.conclusion_signals = (
                config.conclusion_signals.model_dump() if config.conclusion_signals else {}
            )
        else:
            scenario = Scenario(
                track_id=track.id,
                slug=config.slug,
                title=config.title,
                status=status_val,
                difficulty=config.difficulty,
                topic=config.topic,
                version=1,
                duration_limit_seconds=config.duration_limit_seconds,
                turn_limit=config.turn_limit,
                brief=config.brief,
                persona=config.persona.model_dump(),
                hidden_motivations=config.hidden_motivations,
                objections=config.objections,
                curveballs=[cb.model_dump() for cb in config.curveballs],
                success_criteria=config.success_criteria,
                skills_assessed=[s.model_dump() for s in config.skills_assessed],
                opening_line=config.opening_line,
                tags=config.tags,
                conclusion_signals=(
                    config.conclusion_signals.model_dump() if config.conclusion_signals else {}
                ),
            )
            db.add(scenario)
            await db.flush()

        # Create immutable version record
        version_record = ScenarioVersion(
            scenario_id=scenario.id,
            version=scenario.version,
            snapshot=snapshot_data,
            changed_by=changed_by,
            change_note=change_note or f"Version {scenario.version}",
        )
        db.add(version_record)
        await db.commit()
        await db.refresh(scenario)
        return scenario

    @staticmethod
    async def list_public_scenarios(
        db: AsyncSession,
        track_key: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[int] = None,
    ) -> List[PublicScenarioListItem]:
        """List published scenarios for trainees with zero hidden field leakage."""
        stmt = (
            select(Scenario, Track)
            .join(Track, Scenario.track_id == Track.id)
            .where(Scenario.status == "published")
        )

        if track_key:
            stmt = stmt.where(Track.key == track_key.lower())
        if topic:
            stmt = stmt.where(Scenario.topic == topic)
        if difficulty:
            stmt = stmt.where(Scenario.difficulty == difficulty)

        stmt = stmt.order_by(Scenario.difficulty.asc(), Scenario.title.asc())
        results = (await db.execute(stmt)).all()

        items = []
        for scen, trk in results:
            skills_preview = [
                PublicSkillPreview(skill=s["skill"], weight=s["weight"])
                for s in scen.skills_assessed
            ]
            items.append(
                PublicScenarioListItem(
                    id=scen.id,
                    slug=scen.slug,
                    track=trk.key,
                    title=scen.title,
                    topic=scen.topic,
                    difficulty=scen.difficulty,
                    duration_limit_seconds=scen.duration_limit_seconds,
                    skills_assessed=skills_preview,
                    tags=scen.tags,
                )
            )
        return items

    @staticmethod
    async def get_public_scenario_detail(
        db: AsyncSession, scenario_id_or_slug: str
    ) -> PublicScenarioDetail:
        """Get scenario detail for trainee briefing. Strips all hidden data."""
        stmt = (
            select(Scenario, Track)
            .join(Track, Scenario.track_id == Track.id)
            .where(
                and_(
                    Scenario.status == "published",
                    (Scenario.id == scenario_id_or_slug) | (Scenario.slug == scenario_id_or_slug),
                )
            )
        )
        result = (await db.execute(stmt)).first()
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

        scen, trk = result
        skills_preview = [
            PublicSkillPreview(skill=s["skill"], weight=s["weight"]) for s in scen.skills_assessed
        ]
        persona_dict = scen.persona
        persona_preview = PersonaPreview(
            name=persona_dict.get("name", "Counterpart"),
            role=persona_dict.get("role", "Colleague"),
            communication_style=persona_dict.get("communication_style"),
        )

        return PublicScenarioDetail(
            id=scen.id,
            slug=scen.slug,
            track=trk.key,
            title=scen.title,
            topic=scen.topic,
            difficulty=scen.difficulty,
            duration_limit_seconds=scen.duration_limit_seconds,
            turn_limit=scen.turn_limit,
            brief=scen.brief,
            persona=persona_preview,
            opening_line=scen.opening_line,
            skills_assessed=skills_preview,
            tags=scen.tags,
        )

    @staticmethod
    async def admin_restore_version(
        db: AsyncSession, scenario_id: str, target_version: int, admin_id: str
    ) -> Scenario:
        """Restore a scenario to a previous version snapshot."""
        scenario = await db.get(Scenario, scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")

        stmt = select(ScenarioVersion).where(
            and_(
                ScenarioVersion.scenario_id == scenario_id,
                ScenarioVersion.version == target_version,
            )
        )
        version_rec = (await db.execute(stmt)).scalar_one_or_none()
        if not version_rec:
            raise HTTPException(status_code=404, detail=f"Version {target_version} not found")

        snapshot = version_rec.snapshot
        cfg = ScenarioConfigSchema(**snapshot)
        return await ScenarioService.save_scenario_from_config(
            db=db,
            config=cfg,
            status_val=scenario.status,
            changed_by=admin_id,
            change_note=f"Restored to version {target_version}",
        )

    @staticmethod
    def generate_ai_draft(topic: str, track: str = "sales") -> ScenarioConfigSchema:
        """Generate a structured draft scenario template for admin review."""
        slug_topic = topic.lower().replace(" ", "-")[:40]
        return ScenarioConfigSchema(
            slug=f"draft-{track}-{slug_topic}",
            track=track,
            title=f"Scenario: {topic.title()}",
            topic="objection_handling" if track == "sales" else "conflict_resolution",
            difficulty=3,
            duration_limit_seconds=600,
            turn_limit=25,
            brief=f"You are engaging in a simulation focusing on {topic}. Handle client pushback with curiosity.",
            persona=PersonaSchema(
                name="Jordan Hayes",
                role="VP Operations",
                personality=["pragmatic", "skeptical", "busy"],
                communication_style="Concise, data-driven, presses on value.",
                emotional_baseline="neutral",
            ),
            hidden_motivations=[
                "Looking for a risk-free partnership but holds strict budget approval hurdles."
            ],
            objections=["We have internal alternatives.", "The timeline is too tight."],
            curveballs=[
                CurveballSchema(
                    trigger="after turn 5 if no value metrics given",
                    event="Mentions competing vendor proposal.",
                )
            ],
            success_criteria=[
                "Clarify key priorities",
                "Address operational hesitation",
                "Set mutual next steps",
            ],
            skills_assessed=[
                SkillAssessedSchema(skill="objection_handling", weight=0.4),
                SkillAssessedSchema(skill="value_articulation", weight=0.3),
                SkillAssessedSchema(skill="discovery_questions", weight=0.3),
            ],
            opening_line="Let's get right to it. Why should we prioritize this now?",
            tags=["ai-draft", track, "review-required"],
            conclusion_signals=ConclusionSignalsSchema(
                positive=["Agrees to evaluation milestone"],
                negative=["Rejects proposal outright"],
            ),
        )
