from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import Track, User
from backend.app.db.session import get_db
from backend.app.schemas.scenarios import PublicScenarioDetail, PublicScenarioListItem
from backend.app.security.deps import get_current_user
from backend.app.services.scenario_service import ScenarioService

router = APIRouter(tags=["Scenarios"])


@router.get("/api/tracks")
async def list_tracks(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    stmt = select(Track).order_by(Track.name.asc())
    tracks = (await db.execute(stmt)).scalars().all()
    return [
        {"id": t.id, "key": t.key, "name": t.name, "description": t.description} for t in tracks
    ]


@router.get("/api/scenarios", response_model=List[PublicScenarioListItem])
async def list_scenarios(
    track: Optional[str] = Query(None, description="Filter by track key (sales, leadership)"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    difficulty: Optional[int] = Query(None, ge=1, le=5, description="Filter by difficulty"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ScenarioService.list_public_scenarios(
        db=db, track_key=track, topic=topic, difficulty=difficulty
    )


@router.get("/api/scenarios/{id_or_slug}", response_model=PublicScenarioDetail)
async def get_scenario(
    id_or_slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ScenarioService.get_public_scenario_detail(db=db, scenario_id_or_slug=id_or_slug)


@router.get("/api/capabilities")
@router.get("/api/skills")
async def list_capabilities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all executive capabilities from Uzair's curriculum with mapped practice scenarios."""
    from fastapi.responses import JSONResponse
    try:
        caps = await ScenarioService.list_all_capabilities(db=db)
        if caps and len(caps) > 0:
            return JSONResponse(content=caps)
    except Exception as exc:
        import logging
        logging.getLogger("uvicorn.error").warning(f"Error loading capabilities from YAML: {exc}")

    # Resilient fallback: build capability list directly from published scenarios
    try:
        scenarios = await ScenarioService.list_public_scenarios(db=db)
        fallback_caps = []
        for idx, sc in enumerate(scenarios, 1):
            diff_level = getattr(sc, "difficulty_level", None) or ("Normal" if getattr(sc, "difficulty", 2) <= 1 else ("Challenging" if getattr(sc, "difficulty", 2) <= 3 else "Crisis"))
            target_caps = getattr(sc, "target_capabilities", []) or []
            primary_cap = target_caps[0] if (target_caps and len(target_caps) > 0) else (sc.topic.replace("_", " ").title() if getattr(sc, "topic", None) else sc.title)
            track_val = getattr(sc, "track", "leadership")
            pillar = "Strategic & Market Leadership" if track_val == "sales" else "People Leadership & Culture"
            fallback_caps.append({
                "number": idx,
                "key": getattr(sc, "topic", f"cap_{idx}"),
                "name": primary_cap,
                "pillar": pillar,
                "description": getattr(sc, "tactical_coaching_clue", None) or sc.title,
                "rubric": {},
                "matching_scenario_id": sc.id,
                "matching_scenario_slug": sc.slug,
                "matching_scenario_title": sc.title,
                "matching_scenario_difficulty": getattr(sc, "difficulty", 2),
                "matching_scenario_difficulty_level": diff_level,
            })
        return fallback_caps
    except Exception as exc2:
        import logging
        return []


