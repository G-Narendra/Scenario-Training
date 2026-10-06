import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.models import User
from backend.app.db.session import async_session_factory
from backend.app.main import app


@pytest.mark.asyncio
async def test_admin_cohorts_api_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a super_admin user and a trainee user
        async with async_session_factory() as db:
            admin_user = User(display_name="Super Admin", role="super_admin", is_active=True)
            trainee_user = User(display_name="Regular Trainee", role="trainee", is_active=True)
            db.add_all([admin_user, trainee_user])
            await db.commit()
            await db.refresh(admin_user)
            await db.refresh(trainee_user)

            # Issue tokens for admin and trainee
            from backend.app.security.tokens import create_access_token

            admin_token, _, _ = create_access_token(admin_user.id, "super_admin")
            trainee_token, _, _ = create_access_token(trainee_user.id, "trainee")

            # Store session hashes
            from datetime import datetime, timedelta, timezone

            from backend.app.db.models import AuthSession
            from backend.app.security.passcodes import hash_token

            exp = datetime.now(timezone.utc) + timedelta(hours=12)
            db.add(
                AuthSession(
                    user_id=admin_user.id, token_hash=hash_token(admin_token), expires_at=exp
                )
            )
            db.add(
                AuthSession(
                    user_id=trainee_user.id, token_hash=hash_token(trainee_token), expires_at=exp
                )
            )
            await db.commit()

        # 2. Trainee tries to create a cohort -> 403 Forbidden
        trainee_create = await client.post(
            "/api/admin/cohorts",
            json={"name": "Illegal Cohort", "duration_days": 30},
            headers={"Authorization": f"Bearer {trainee_token}"},
        )
        assert trainee_create.status_code == 403

        # 3. Admin creates a cohort -> 201 Created
        admin_create = await client.post(
            "/api/admin/cohorts",
            json={
                "name": "Q1 Leadership Cohort",
                "description": "Training for new managers",
                "duration_days": 30,
                "track_access": "leadership",
                "max_members": 25,
                "budget_cap_usd": 150.0,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert admin_create.status_code == 201
        cohort_data = admin_create.json()
        assert "initial_passcode" in cohort_data
        assert cohort_data["name"] == "Q1 Leadership Cohort"
        cohort_id = cohort_data["id"]

        # 4. List cohorts -> 200 OK
        list_res = await client.get(
            "/api/admin/cohorts", headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # 5. Get cohort by id -> 200 OK
        get_res = await client.get(
            f"/api/admin/cohorts/{cohort_id}", headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_res.status_code == 200
        assert get_res.json()["name"] == "Q1 Leadership Cohort"

        # 6. Rotate passcode -> 200 OK
        rotate_res = await client.post(
            f"/api/admin/cohorts/{cohort_id}/passcodes/rotate",
            json={"label": "Mid-month rotation", "grace_period_minutes": 5},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert rotate_res.status_code == 200
        assert "new_passcode" in rotate_res.json()

        # 7. Extend cohort -> 200 OK
        extend_res = await client.post(
            f"/api/admin/cohorts/{cohort_id}/extend",
            json={"additional_days": 15},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert extend_res.status_code == 200

        # 8. Revoke sessions -> 200 OK
        revoke_res = await client.post(
            f"/api/admin/cohorts/{cohort_id}/revoke-sessions",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert revoke_res.status_code == 200
