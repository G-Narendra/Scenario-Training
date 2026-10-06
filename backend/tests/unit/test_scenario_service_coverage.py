import pytest
from fastapi import HTTPException

from backend.app.db.session import async_session_factory
from backend.app.services.scenario_service import ScenarioService


def test_generate_ai_draft():
    """Verify AI draft generation for sales and leadership tracks."""
    draft_sales = ScenarioService.generate_ai_draft(topic="Enterprise Price Defense", track="sales")
    assert draft_sales.track == "sales"
    assert "draft-sales" in draft_sales.slug
    assert len(draft_sales.skills_assessed) == 3

    draft_lead = ScenarioService.generate_ai_draft(topic="Peer Conflict", track="leadership")
    assert draft_lead.track == "leadership"
    assert "draft-leadership" in draft_lead.slug


@pytest.mark.asyncio
async def test_scenario_version_restore_and_update():
    """Test scenario version incrementing and restore functionality."""
    async with async_session_factory() as db:
        # 1. Create Track
        _ = await ScenarioService.get_or_create_track(db, "sales")

        # 2. Save Initial Version
        cfg = ScenarioService.generate_ai_draft(topic="Initial Topic", track="sales")
        scen = await ScenarioService.save_scenario_from_config(
            db, cfg, status_val="published", changed_by="admin-1", change_note="Version 1"
        )
        assert scen.version == 1

        # 3. Update Existing Scenario -> Version 2
        cfg.title = "Updated Title for V2"
        scen_v2 = await ScenarioService.save_scenario_from_config(
            db, cfg, status_val="published", changed_by="admin-1", change_note="Version 2 update"
        )
        assert scen_v2.version == 2
        assert scen_v2.title == "Updated Title for V2"

        # 4. Restore to Version 1
        restored = await ScenarioService.admin_restore_version(
            db=db, scenario_id=scen.id, target_version=1, admin_id="admin-1"
        )
        assert restored.version == 3  # new version created with snapshot of v1
        assert "Initial Topic" in restored.title

        # 5. Restore error cases
        with pytest.raises(HTTPException) as exc:
            await ScenarioService.admin_restore_version(
                db=db, scenario_id="invalid-id", target_version=1, admin_id="admin-1"
            )
        assert exc.value.status_code == 404

        with pytest.raises(HTTPException) as exc2:
            await ScenarioService.admin_restore_version(
                db=db, scenario_id=scen.id, target_version=999, admin_id="admin-1"
            )
        assert exc2.value.status_code == 404


@pytest.mark.asyncio
async def test_get_public_scenario_detail_not_found():
    """Verify 404 error when public scenario is not found."""
    async with async_session_factory() as db:
        with pytest.raises(HTTPException) as exc:
            await ScenarioService.get_public_scenario_detail(db, "non-existent-slug")
        assert exc.value.status_code == 404
