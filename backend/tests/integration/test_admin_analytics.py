from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.db.models import (
    AuditLog,
    AuthSession,
    Cohort,
    UsageEvent,
    User,
)
from backend.app.db.session import async_session_factory
from backend.app.main import app
from backend.app.security.passcodes import hash_token
from backend.app.security.tokens import create_access_token


@pytest.mark.asyncio
async def test_admin_audit_logs_and_usage_summary():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        now = datetime.now(timezone.utc)
        async with async_session_factory() as db:
            cohort = Cohort(
                name="Security Review Cohort",
                starts_at=now,
                expires_at=now + timedelta(days=30),
                is_active=True,
            )
            db.add(cohort)
            await db.commit()
            await db.refresh(cohort)

            admin = User(
                display_name="Auditor Admin",
                role="group_admin",
                cohort_id=cohort.id,
                is_active=True,
            )
            trainee = User(
                display_name="Plain Trainee",
                role="trainee",
                cohort_id=cohort.id,
                is_active=True,
            )
            db.add_all([admin, trainee])
            await db.commit()
            await db.refresh(admin)
            await db.refresh(trainee)

            admin_tok, _, _ = create_access_token(admin.id, "group_admin")
            trainee_tok, _, _ = create_access_token(trainee.id, "trainee")

            exp = now + timedelta(hours=1)
            db.add_all(
                [
                    AuthSession(
                        user_id=admin.id,
                        token_hash=hash_token(admin_tok),
                        expires_at=exp,
                    ),
                    AuthSession(
                        user_id=trainee.id,
                        token_hash=hash_token(trainee_tok),
                        expires_at=exp,
                    ),
                ]
            )

            # Insert sample audit logs
            db.add_all(
                [
                    AuditLog(
                        actor_id=admin.id,
                        action="passcode.rotate",
                        entity="cohort",
                        entity_id=cohort.id,
                        details={"grace_period_minutes": 60},
                    ),
                    AuditLog(
                        actor_id=admin.id,
                        action="session.revoke",
                        entity="session",
                        entity_id="sample-sess-1",
                        details={"reason": "security_test"},
                    ),
                ]
            )

            # Insert sample usage events
            db.add_all(
                [
                    UsageEvent(
                        user_id=trainee.id,
                        cohort_id=cohort.id,
                        type="llm",
                        units=1200,
                        cost_estimate=0.015,
                    ),
                    UsageEvent(
                        user_id=trainee.id,
                        cohort_id=cohort.id,
                        type="realtime",
                        units=60,
                        cost_estimate=0.040,
                    ),
                ]
            )
            await db.commit()

        # 1. Trainee cannot view audit logs -> 403 Forbidden
        res_t = await client.get(
            "/api/admin/audit-logs",
            headers={"Authorization": f"Bearer {trainee_tok}"},
        )
        assert res_t.status_code == 403

        # 2. Admin can view audit logs -> 200 OK
        res_a = await client.get(
            "/api/admin/audit-logs",
            headers={"Authorization": f"Bearer {admin_tok}"},
        )
        assert res_a.status_code == 200
        logs_data = res_a.json()
        assert logs_data["total"] >= 2
        actions = [item["action"] for item in logs_data["items"]]
        assert "passcode.rotate" in actions

        # 3. Filter audit logs by action
        res_filter = await client.get(
            "/api/admin/audit-logs?action=passcode.rotate",
            headers={"Authorization": f"Bearer {admin_tok}"},
        )
        assert res_filter.status_code == 200
        assert all(
            item["action"] == "passcode.rotate" for item in res_filter.json()["items"]
        )

        # 4. Trainee cannot view usage -> 403 Forbidden
        res_ut = await client.get(
            "/api/admin/usage",
            headers={"Authorization": f"Bearer {trainee_tok}"},
        )
        assert res_ut.status_code == 403

        # 5. Admin views usage summary -> 200 OK
        res_ua = await client.get(
            "/api/admin/usage",
            headers={"Authorization": f"Bearer {admin_tok}"},
        )
        assert res_ua.status_code == 200
        usage_data = res_ua.json()
        assert usage_data["recent_events_count"] >= 2
        types = [b["type"] for b in usage_data["breakdown_by_type"]]
        assert "llm" in types
        assert "realtime" in types
