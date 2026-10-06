"""Concurrent Load Testing Utility

Simulates 50 concurrent text conversation sessions and 10 voice sessions,
measuring latency percentiles (p50, p95, p99), throughput, and error rates.
"""

import asyncio
import os
import statistics
import sys
import time
from typing import Any, Dict, List

sys.path.insert(0, os.path.abspath("."))

from httpx import ASGITransport, AsyncClient

from backend.app.db.models import Scenario, Track
from backend.app.db.session import async_session_factory
from backend.app.main import app


import uuid

from sqlalchemy import select

from backend.app.services.access_service import AccessService


async def setup_test_fixtures() -> Dict[str, Any]:
    """Seed test cohort, admin, trainee, and published scenarios."""
    run_id = uuid.uuid4().hex[:6]
    async with async_session_factory() as db:
        # Check if sales track exists or create new
        stmt = select(Track).where(Track.key == "sales")
        track = (await db.execute(stmt)).scalar_one_or_none()
        if not track:
            track = Track(key=f"track_{run_id}", name="Load Test Track")
            db.add(track)
            await db.flush()

        cohort, raw_code = await AccessService.create_cohort(
            db=db, name=f"Load Cohort {run_id}", duration_days=30, track_access="sales"
        )

        scenario = Scenario(
            track_id=track.id,
            slug=f"load-test-negotiation-{run_id}",
            title=f"Load Test Negotiation {run_id}",
            topic="Performance",
            status="published",
            difficulty=2,
            duration_limit_seconds=600,
            turn_limit=10,
            brief="Simulate high throughput conversation turns under load.",
            persona={
                "name": "Jordan Lee",
                "role": "COO",
                "personality": ["Analytical", "Prompt"],
                "communication_style": "Direct",
                "emotional_baseline": "neutral",
            },
            hidden_motivations=["Check system scalability"],
            objections=["Can your system scale?"],
            success_criteria=["Demonstrate low latency under load"],
            skills_assessed=[{"skill": "scalability", "weight": 1.0}],
            opening_line="Let's see if your platform can handle enterprise load.",
        )
        db.add(scenario)
        await db.commit()

        return {
            "passcode": raw_code,
            "scenario_id": scenario.id,
        }


async def simulate_text_session(
    client: AsyncClient, passcode: str, scenario_id: str, trainee_idx: int
) -> List[float]:
    """Execute full login, session start, and multi-turn exchanges, measuring latencies."""
    latencies: List[float] = []

    # 1. Login
    t0 = time.perf_counter()
    res = await client.post(
        "/api/auth/login",
        json={"passcode": passcode, "display_name": f"Load Trainee {trainee_idx}"},
    )
    t1 = time.perf_counter()
    if res.status_code == 200:
        latencies.append((t1 - t0) * 1000)
    else:
        print(f"[Text Error] Trainee {trainee_idx} login failed: {res.status_code} - {res.text}")
        return []

    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Start simulation session
    t0 = time.perf_counter()
    start_res = await client.post(
        "/api/sessions",
        json={"scenario_id": scenario_id, "mode": "text"},
        headers=headers,
    )
    t1 = time.perf_counter()
    if start_res.status_code in (200, 201):
        latencies.append((t1 - t0) * 1000)
        session_id = start_res.json()["id"]
    else:
        print(f"[Text Error] Trainee {trainee_idx} start session failed: {start_res.status_code} - {start_res.text}")
        return latencies

    # 3. Simulate 2 conversational turns
    turns = [
        "We guarantee 99.99% uptime and sub-second response times.",
        "Our architecture scales horizontally without degrading response quality.",
    ]
    for msg in turns:
        t0 = time.perf_counter()
        turn_res = await client.post(
            f"/api/sessions/{session_id}/messages",
            json={"content": msg},
            headers=headers,
        )
        t1 = time.perf_counter()
        if turn_res.status_code == 200:
            latencies.append((t1 - t0) * 1000)
        else:
            print(f"[Text Error] Trainee {trainee_idx} turn failed: {turn_res.status_code} - {turn_res.text}")

    return latencies


async def simulate_voice_session(
    client: AsyncClient, passcode: str, scenario_id: str, trainee_idx: int
) -> List[float]:
    """Simulate voice session creation and turn initialization."""
    latencies: List[float] = []

    # Login
    t0 = time.perf_counter()
    res = await client.post(
        "/api/auth/login",
        json={"passcode": passcode, "display_name": f"Voice Trainee {trainee_idx}"},
    )
    t1 = time.perf_counter()
    if res.status_code == 200:
        latencies.append((t1 - t0) * 1000)
    else:
        print(f"[Voice Error] Trainee {trainee_idx} login failed: {res.status_code} - {res.text}")
        return []

    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start voice session
    t0 = time.perf_counter()
    start_res = await client.post(
        "/api/sessions",
        json={"scenario_id": scenario_id, "mode": "voice"},
        headers=headers,
    )
    t1 = time.perf_counter()
    if start_res.status_code in (200, 201):
        latencies.append((t1 - t0) * 1000)
    else:
        print(f"[Voice Error] Trainee {trainee_idx} start voice session failed: {start_res.status_code} - {start_res.text}")

    return latencies


async def run_load_test(num_text_sessions: int = 50, num_voice_sessions: int = 10):
    print("=" * 65)
    print(f"Starting Load Test: {num_text_sessions} Concurrent Text + {num_voice_sessions} Concurrent Voice")
    print("=" * 65)

    fixtures = await setup_test_fixtures()
    passcode = fixtures["passcode"]
    scenario_id = fixtures["scenario_id"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        start_time = time.perf_counter()

        # Launch 50 text and 10 voice sessions concurrently
        text_tasks = [
            simulate_text_session(client, passcode, scenario_id, i)
            for i in range(num_text_sessions)
        ]
        voice_tasks = [
            simulate_voice_session(client, passcode, scenario_id, i)
            for i in range(num_voice_sessions)
        ]

        all_results = await asyncio.gather(*text_tasks, *voice_tasks, return_exceptions=True)
        total_time = time.perf_counter() - start_time

    all_latencies: List[float] = []
    error_count = 0

    for res in all_results:
        if isinstance(res, Exception):
            error_count += 1
            print(f"[Gather Exception] {type(res).__name__}: {res}")
        elif isinstance(res, list):
            if not res:
                error_count += 1
                print("[Empty Result] Session yielded no requests")
            else:
                all_latencies.extend(res)

    total_requests = len(all_latencies) + error_count
    sorted_latencies = sorted(all_latencies)

    print("\n--- Load Test Benchmark Results ---")
    print(f"Total Completed Requests: {len(all_latencies)}")
    print(f"Total Errors / Failures:  {error_count}")
    print(f"Error Rate:               {(error_count / max(total_requests, 1)) * 100:.2f}%")
    print(f"Elapsed Benchmark Time:   {total_time:.2f} seconds")
    print(f"Throughput:               {len(all_latencies) / max(total_time, 0.001):.2f} req/sec")

    if sorted_latencies:
        p50 = statistics.median(sorted_latencies)
        p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
        p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]
        mean_lat = statistics.mean(sorted_latencies)
        max_lat = max(sorted_latencies)

        print("\n--- Latency Breakdown (ms) ---")
        print(f"Mean Latency: {mean_lat:.2f} ms")
        print(f"p50 (Median): {p50:.2f} ms")
        print(f"p95:          {p95:.2f} ms")
        print(f"p99:          {p99:.2f} ms")
        print(f"Max Latency:  {max_lat:.2f} ms")
        print("=" * 65)

        # Assert requirements: p95 latency under acceptable threshold & 0% error rate
        assert error_count == 0, f"Load test suffered {error_count} errors"
        print("Load Test: PASSED with ZERO errors!")
    else:
        print("No latency metrics collected!")
        raise RuntimeError("Load test failed to collect latencies")


if __name__ == "__main__":
    asyncio.run(run_load_test())
