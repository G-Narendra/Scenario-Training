import asyncio
import os
import sys
import glob
import yaml

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timedelta, timezone
from sqlalchemy import select

from backend.app.db.session import async_session_factory
from backend.app.db.models import Skill, Cohort, Passcode
from backend.app.security.passcodes import hash_passcode
from backend.app.services.scenario_service import ScenarioService


async def seed_demo_cohort(db):
    stmt = select(Cohort).where(Cohort.name == "Demo Cohort")
    cohort = (await db.execute(stmt)).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if not cohort:
        cohort = Cohort(
            name="Demo Cohort",
            description="Default demo training cohort for exploratory flight simulation.",
            starts_at=now,
            expires_at=now + timedelta(days=30),
            track_access="both",
            budget_cap_usd=500.0,
        )
        db.add(cohort)
        await db.flush()

        passcode = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode("DEMO-2026"),
            label="Default Demo Passcode",
            valid_from=now,
            valid_until=now + timedelta(days=30),
            max_uses=1000,
        )
        passcode_alt = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode("DEMO-PASS"),
            label="Legacy Demo Passcode",
            valid_from=now,
            valid_until=now + timedelta(days=30),
            max_uses=1000,
        )
        admin_passcode = Passcode(
            cohort_id=cohort.id,
            code_hash=hash_passcode("ADMIN-PASS"),
            label="Administrator Passcode",
            valid_from=now,
            valid_until=now + timedelta(days=30),
            max_uses=1000,
        )
        db.add_all([passcode, passcode_alt, admin_passcode])
        await db.commit()
        print("Demo cohort, DEMO-2026, DEMO-PASS, and ADMIN-PASS seeded successfully.")
    else:
        # Check if DEMO-2026 exists
        stmt_demo = select(Passcode).where(Passcode.cohort_id == cohort.id, Passcode.label == "Default Demo Passcode")
        demo_code = (await db.execute(stmt_demo)).scalar_one_or_none()
        if not demo_code:
            db.add(Passcode(
                cohort_id=cohort.id,
                code_hash=hash_passcode("DEMO-2026"),
                label="Default Demo Passcode",
                valid_from=now,
                valid_until=now + timedelta(days=30),
                max_uses=1000,
            ))
            await db.commit()
        # Check if ADMIN-PASS exists
        stmt_admin = select(Passcode).where(Passcode.cohort_id == cohort.id, Passcode.label == "Administrator Passcode")
        admin_code = (await db.execute(stmt_admin)).scalar_one_or_none()
        if not admin_code:
            admin_code = Passcode(
                cohort_id=cohort.id,
                code_hash=hash_passcode("ADMIN-PASS"),
                label="Administrator Passcode",
                valid_from=now,
                valid_until=now + timedelta(days=30),
                max_uses=1000,
            )
            db.add(admin_code)
            await db.commit()
            print("Added ADMIN-PASS to existing demo cohort.")
        print("Demo cohort verified.")


async def seed_skills(db):
    skills_path = os.path.join(os.path.dirname(__file__), "..", "backend", "scenarios", "skills.yaml")
    if not os.path.exists(skills_path):
        print(f"Skills file not found at {skills_path}")
        return

    with open(skills_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    for track_key, skills_map in data.items():
        track = await ScenarioService.get_or_create_track(db, track_key)
        for s_key, s_data in skills_map.items():
            stmt = select(Skill).where(Skill.track_id == track.id, Skill.key == s_key)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if not existing:
                skill = Skill(
                    track_id=track.id,
                    key=s_key,
                    name=s_data["name"],
                    description=s_data.get("description"),
                    rubric=s_data["rubric"]
                )
                db.add(skill)
            else:
                existing.name = s_data["name"]
                existing.description = s_data.get("description")
                existing.rubric = s_data["rubric"]
    await db.commit()
    print("Skills seeded successfully.")


async def seed_scenarios(db):
    base_dir = os.path.join(os.path.dirname(__file__), "..", "backend", "scenarios")
    pattern = os.path.join(base_dir, "**", "*.yaml")
    yaml_files = glob.glob(pattern, recursive=True)

    loaded_count = 0
    for path in yaml_files:
        if path.endswith("skills.yaml"):
            continue

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        try:
            config = ScenarioService.parse_and_validate_yaml(content)
            await ScenarioService.save_scenario_from_config(
                db=db,
                config=config,
                status_val="published",
                change_note="Initial Seed"
            )
            loaded_count += 1
            print(f"Loaded scenario: {config.slug} ({config.title})")
        except Exception as e:
            print(f"Failed to load scenario {path}: {e}")

    print(f"Seeded {loaded_count} scenarios successfully.")


async def main():
    print("=== Starting Database Seeding ===")
    async with async_session_factory() as db:
        await seed_demo_cohort(db)
        await seed_skills(db)
        await seed_scenarios(db)
    print("=== Seeding Finished ===")


if __name__ == "__main__":
    asyncio.run(main())
