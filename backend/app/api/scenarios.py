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
