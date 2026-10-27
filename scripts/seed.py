import asyncio
import os
import sys
import glob
import yaml

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timedelta, timezone
from sqlalchemy import and_, delete, func, select

import backend.app.db.models  # noqa: F401 - ensure models registered
from backend.app.db.base import Base
from backend.app.db.session import async_session_factory, engine
from backend.app.db.models import Skill, Cohort, Passcode, User
from backend.app.security.passcodes import hash_passcode
from backend.app.services.scenario_service import ScenarioService


async def init_db():
    print("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully.")


async def seed_official_cohort(db):
    now = datetime.now(timezone.utc)
    cohort_expiry = now + timedelta(days=90)

    # 1. Deactivate old demo cohorts and revoke demo passcodes
    old_cohorts = (await db.execute(select(Cohort).where(Cohort.name == "Demo Cohort"))).scalars().all()
    for oc in old_cohorts:
        oc.is_active = False

    demo_passcodes = (await db.execute(select(Passcode))).scalars().all()
    for p in demo_passcodes:
        if any(w in (p.label or "").lower() for w in ["demo", "legacy"]):
            p.revoked_at = now

    # 2. Find or create official Uzair Executive Training Cohort
    stmt = select(Cohort).where(Cohort.name == "Uzair Executive Training Cohort")
    cohort = (await db.execute(stmt)).scalar_one_or_none()

    if not cohort:
        cohort = Cohort(
            name="Uzair Executive Training Cohort",
            description="Official 3H Solutions Executive Scenario Training Cohort for enrolled students.",
            starts_at=now,
            expires_at=cohort_expiry,
            track_access="both",
            budget_cap_usd=1000.0,
            is_active=True,
            max_members=100,
        )
        db.add(cohort)
        await db.flush()
    else:
        cohort.is_active = True
        cohort.expires_at = cohort_expiry
        cohort.track_access = "both"
        cohort.budget_cap_usd = 1000.0

    # 3. Seed Passcodes: UZAIR-2026 and NARENDRA-2026
    passcodes_to_seed = {
        "Uzair Executive Training Passcode": "UZAIR-2026",
        "Narendra Developer SuperAdmin Passcode": "NARENDRA-2026",
    }
    existing_codes = (
        await db.execute(select(Passcode).where(Passcode.cohort_id == cohort.id))
    ).scalars().all()
    codes_by_label = {code.label: code for code in existing_codes}

    for label, plain_code in passcodes_to_seed.items():
        code = codes_by_label.get(label)
        if code is None:
            db.add(
                Passcode(
                    cohort_id=cohort.id,
                    code_hash=hash_passcode(plain_code),
                    label=label,
                    valid_from=now,
                    valid_until=cohort_expiry,
                    max_uses=5000,
                )
            )
        else:
            code.valid_from = now
            code.valid_until = cohort_expiry
            code.revoked_at = None
            code.max_uses = 5000

    # 4. Remove all legacy/dummy students from previous test runs
    dummy_names = [
        "Sarah Jenkins", "Marcus Vance", "Priya Sharma", "David Chen",
        "Elena Rostova", "James Wilson", "Aaliyah Patel", "Carlos Mendez",
        "Rachel Green", "Vikram Malhotra", "Chloe Bennett", "Tariq Al-Mansoor",
        "Stephanie Wong", "Michael Chang", "Fatima Zahra", "Liam O'Connor",
        "Ananya Iyer", "Jonathan Brooks", "Mei-Ling Zhou", "Omar Farooq",
        "Jessica Taylor", "Rohan Gupta", "Natalie Dubois", "Kevin Park",
        "Zainab Abdi", "Alexander Wright", "Sunita Rao", "Daniel Morales",
        "Leila Khoury", "Andrew Doherty",
    ]
    await db.execute(
        delete(User).where(func.lower(User.display_name).in_([n.lower() for n in dummy_names]))
    )
    await db.execute(
        delete(backend.app.db.models.AttemptLedger).where(
            func.lower(backend.app.db.models.AttemptLedger.student_name).in_([n.lower() for n in dummy_names])
        )
    )

    # 5. Seed Primary Administrator Accounts & Enrolled Trainees (Narendra, Uzair, Dev)
    # Narendra & Uzair have super_admin role with dual participant + admin access.
    # Dev is seeded as an active enrolled trainee for mobile and participant testing.
    roster_profiles = [
        {"name": "Narendra", "role": "super_admin"},
        {"name": "Uzair", "role": "super_admin"},
        {"name": "Dev", "role": "trainee"},
    ]
    for profile in roster_profiles:
        u_stmt = select(User).where(func.lower(User.display_name) == profile["name"].lower())
        user_record = (await db.execute(u_stmt)).scalars().first()
        if not user_record:
            user_record = User(
                cohort_id=cohort.id,
                display_name=profile["name"],
                role=profile["role"],
                is_active=True,
            )
            db.add(user_record)
        else:
            user_record.cohort_id = cohort.id
            user_record.role = profile["role"]
            user_record.is_active = True

    await db.commit()
    print("Uzair Executive Training Cohort, passcodes (UZAIR-2026, NARENDRA-2026), and roster accounts (Narendra, Uzair, Dev) seeded successfully.")



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
    await init_db()
    async with async_session_factory() as db:
        await seed_official_cohort(db)
        await seed_skills(db)
        await seed_scenarios(db)
    print("=== Seeding Finished ===")


if __name__ == "__main__":
    asyncio.run(main())
