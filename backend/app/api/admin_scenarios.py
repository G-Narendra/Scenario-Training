import json
import uuid
from typing import List, Optional

import yaml
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import Scenario, ScenarioVersion, User
from backend.app.db.session import get_db
from backend.app.schemas.scenarios import (
    AdminScenarioResponse,
    ScenarioConfigSchema,
    ScenarioVersionResponse,
)
from backend.app.security.deps import require_group_admin
from backend.app.services.scenario_service import ScenarioService

router = APIRouter(prefix="/api/admin/scenarios", tags=["Admin Scenarios"])


@router.get("", response_model=List[AdminScenarioResponse])
async def admin_list_scenarios(
    track: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Scenario).order_by(Scenario.created_at.desc())
    if status_filter:
        stmt = stmt.where(Scenario.status == status_filter)
    scenarios = (await db.execute(stmt)).scalars().all()
    return scenarios


@router.get("/{id}", response_model=AdminScenarioResponse)
async def admin_get_scenario(
    id: str, current_admin: User = Depends(require_group_admin), db: AsyncSession = Depends(get_db)
):
    scen = await db.get(Scenario, id)
    if not scen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    return scen


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_scenario(
    id: str,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    scen = await db.get(Scenario, id)
    if not scen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    await db.delete(scen)
    await db.commit()
    return None


@router.post("", response_model=AdminScenarioResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_scenario(
    payload: ScenarioConfigSchema,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    scen = await ScenarioService.save_scenario_from_config(
        db=db,
        config=payload,
        status_val="published",
        changed_by=current_admin.id,
        change_note="Created via Admin API",
    )
    return scen


@router.post("/validate")
async def admin_validate_scenario(
    request: Request,
    current_admin: User = Depends(require_group_admin),
):
    """Dry-run validation of YAML string."""
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8")

    yaml_content = body_text
    try:
        data = json.loads(body_text)
        if isinstance(data, dict) and "content" in data:
            yaml_content = data["content"]
    except Exception:
        pass

    try:
        validated = ScenarioService.parse_and_validate_yaml(yaml_content)
        return {"valid": True, "slug": validated.slug, "title": validated.title, "errors": []}
    except HTTPException as e:
        return {"valid": False, "errors": [str(e.detail)]}
    except Exception as e:
        return {"valid": False, "errors": [str(e)]}


@router.post("/import", response_model=AdminScenarioResponse)
async def admin_import_scenario(
    yaml_content: str = Body(..., media_type="text/plain"),
    publish: bool = Query(True),
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    validated = ScenarioService.parse_and_validate_yaml(yaml_content)
    scen = await ScenarioService.save_scenario_from_config(
        db=db,
        config=validated,
        status_val="published" if publish else "draft",
        changed_by=current_admin.id,
        change_note="Imported from YAML",
    )
    return scen


@router.get("/{id}/export")
async def admin_export_scenario(
    id: str, current_admin: User = Depends(require_group_admin), db: AsyncSession = Depends(get_db)
):
    scen = await db.get(Scenario, id)
    if not scen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    track = await scen.awaitable_attrs.track if hasattr(scen, "awaitable_attrs") else None
    track_key = track.key if track else "sales"

    data = {
        "slug": scen.slug,
        "track": track_key,
        "title": scen.title,
        "topic": scen.topic,
        "difficulty": scen.difficulty,
        "duration_limit_seconds": scen.duration_limit_seconds,
        "turn_limit": scen.turn_limit,
        "brief": scen.brief,
        "persona": scen.persona,
        "hidden_motivations": scen.hidden_motivations,
        "objections": scen.objections,
        "curveballs": scen.curveballs,
        "success_criteria": scen.success_criteria,
        "skills_assessed": scen.skills_assessed,
        "opening_line": scen.opening_line,
        "tags": scen.tags,
        "conclusion_signals": scen.conclusion_signals,
    }
    yaml_str = yaml.dump(data, sort_keys=False)
    return {"yaml": yaml_str}


@router.post("/{id}/publish")
async def admin_publish_scenario(
    id: str, current_admin: User = Depends(require_group_admin), db: AsyncSession = Depends(get_db)
):
    scen = await db.get(Scenario, id)
    if not scen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    scen.status = "published"
    await db.commit()
    return {"message": "Scenario published successfully", "id": id, "status": "published"}


@router.post("/{id}/archive")
async def admin_archive_scenario(
    id: str, current_admin: User = Depends(require_group_admin), db: AsyncSession = Depends(get_db)
):
    scen = await db.get(Scenario, id)
    if not scen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")
    scen.status = "archived"
    await db.commit()
    return {"message": "Scenario archived successfully", "id": id, "status": "archived"}


@router.post(
    "/{id}/duplicate", status_code=status.HTTP_201_CREATED, response_model=AdminScenarioResponse
)
async def admin_duplicate_scenario(
    id: str,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    scen = await db.get(Scenario, id)
    if not scen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    new_slug = f"{scen.slug}-copy-{uuid.uuid4().hex[:6]}"
    dup_scen = Scenario(
        track_id=scen.track_id,
        slug=new_slug,
        title=f"{scen.title} (Copy)",
        status="draft",
        difficulty=scen.difficulty,
        topic=scen.topic,
        version=1,
        duration_limit_seconds=scen.duration_limit_seconds,
        turn_limit=scen.turn_limit,
        brief=scen.brief,
        persona=scen.persona,
        hidden_motivations=scen.hidden_motivations,
        objections=scen.objections,
        curveballs=scen.curveballs,
        success_criteria=scen.success_criteria,
        skills_assessed=scen.skills_assessed,
        opening_line=scen.opening_line,
        tags=scen.tags,
        conclusion_signals=scen.conclusion_signals,
    )
    db.add(dup_scen)
    await db.flush()

    snapshot = {
        "slug": dup_scen.slug,
        "title": dup_scen.title,
        "status": dup_scen.status,
        "difficulty": dup_scen.difficulty,
        "topic": dup_scen.topic,
        "brief": dup_scen.brief,
        "persona": dup_scen.persona,
        "hidden_motivations": dup_scen.hidden_motivations,
        "objections": dup_scen.objections,
        "curveballs": dup_scen.curveballs,
        "success_criteria": dup_scen.success_criteria,
        "skills_assessed": dup_scen.skills_assessed,
        "opening_line": dup_scen.opening_line,
    }
    db.add(
        ScenarioVersion(
            scenario_id=dup_scen.id,
            version=1,
            snapshot=snapshot,
            changed_by=current_admin.id,
            change_note=f"Duplicated from {scen.slug}",
        )
    )
    await db.commit()
    await db.refresh(dup_scen)
    return dup_scen


@router.get("/{id}/versions", response_model=List[ScenarioVersionResponse])
async def admin_list_versions(
    id: str, current_admin: User = Depends(require_group_admin), db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(ScenarioVersion)
        .where(ScenarioVersion.scenario_id == id)
        .order_by(ScenarioVersion.version.desc())
    )
    versions = (await db.execute(stmt)).scalars().all()
    return versions


@router.post("/{id}/versions/{version_num}/restore", response_model=AdminScenarioResponse)
async def admin_restore_version(
    id: str,
    version_num: int,
    current_admin: User = Depends(require_group_admin),
    db: AsyncSession = Depends(get_db),
):
    return await ScenarioService.admin_restore_version(
        db=db, scenario_id=id, target_version=version_num, admin_id=current_admin.id
    )


@router.post("/ai-draft", response_model=ScenarioConfigSchema)
async def admin_generate_ai_draft(
    topic: str = Body(..., embed=True),
    track: str = Body("sales", embed=True),
    current_admin: User = Depends(require_group_admin),
):
    """Generate an AI draft scenario for review (Draft status only; never auto-published)."""
    return ScenarioService.generate_ai_draft(topic=topic, track=track)
