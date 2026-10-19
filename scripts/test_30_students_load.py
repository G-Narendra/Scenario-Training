"""
Concurrently simulates 30 enrolled students accessing the scenario training platform simultaneously.
Enrolls 30 trainees, logs them all in concurrently, creates sessions, sends scenario dialogue,
and measures latency, concurrency, and throughput.
"""

import asyncio
import time
import json
import statistics
import argparse
from typing import List, Dict, Any
import httpx

COHORT_PASSCODE = "UZAIR-2026"
ADMIN_NAME = "Uzair"

STUDENT_ROSTER = [
    "Sarah Jenkins",
    "Marcus Vance",
    "Priya Sharma",
    "David Chen",
    "Elena Rostova",
    "James Wilson",
    "Aaliyah Patel",
    "Carlos Mendez",
    "Rachel Green",
    "Vikram Malhotra",
    "Chloe Bennett",
    "Tariq Al-Mansoor",
    "Stephanie Wong",
    "Michael Chang",
    "Fatima Zahra",
    "Liam O'Connor",
    "Ananya Iyer",
    "Jonathan Brooks",
    "Mei-Ling Zhou",
    "Omar Farooq",
    "Jessica Taylor",
    "Rohan Gupta",
    "Natalie Dubois",
    "Kevin Park",
    "Zainab Abdi",
    "Alexander Wright",
    "Sunita Rao",
    "Daniel Morales",
    "Leila Khoury",
    "Andrew Doherty",
]


class PerformanceMetrics:
    def __init__(self):
        self.latencies: List[float] = []
        self.status_codes: Dict[int, int] = {}
        self.errors: List[str] = []
        self.lock = asyncio.Lock()
        self.start_time = 0.0
        self.end_time = 0.0

    async def record(self, latency_ms: float, status_code: int, error: str = ""):
        async with self.lock:
            self.latencies.append(latency_ms)
            self.status_codes[status_code] = self.status_codes.get(status_code, 0) + 1
            if error:
                self.errors.append(error)


async def enroll_students(base_url: str, admin_token: str, cohort_id: str, client: httpx.AsyncClient):
    print(f"\n[1/3] Enrolling 30 students into Cohort {cohort_id} via Admin API...")
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    enrolled_count = 0
    already_enrolled = 0

    for name in STUDENT_ROSTER:
        resp = await client.post(
            f"{base_url}/api/admin/cohorts/{cohort_id}/members",
            headers=headers,
            json={"display_name": name, "role": "trainee"},
            timeout=15.0,
        )
        if resp.status_code in (200, 201):
            enrolled_count += 1
        elif resp.status_code == 400 and "already enrolled" in resp.text.lower():
            already_enrolled += 1
        else:
            print(f"  Note enrolling {name}: HTTP {resp.status_code} - {resp.text[:80]}")

    print(f"  -> Successfully verified/enrolled {enrolled_count + already_enrolled}/30 students ({enrolled_count} newly added, {already_enrolled} pre-existing).")


async def simulate_student_journey(
    student_index: int,
    student_name: str,
    base_url: str,
    scenario_id: str,
    metrics: PerformanceMetrics,
):
    """
    Simulates complete user flow for 1 student:
    1. Authenticate with passcode & name
    2. Fetch scenarios
    3. Start scenario session
    4. Send dialogue turn
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Login
        t0 = time.perf_counter()
        try:
            login_resp = await client.post(
                f"{base_url}/api/auth/login",
                json={"passcode": COHORT_PASSCODE, "display_name": student_name},
            )
            lat_login = (time.perf_counter() - t0) * 1000.0
            await metrics.record(lat_login, login_resp.status_code)

            if login_resp.status_code != 200:
                await metrics.record(lat_login, login_resp.status_code, f"Login failed: {login_resp.text}")
                return

            auth_data = login_resp.json()
            token = auth_data["access_token"]
            auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        except Exception as e:
            lat = (time.perf_counter() - t0) * 1000.0
            await metrics.record(lat, 0, f"Login exception: {str(e)}")
            return

        # 2. Fetch Scenarios
        t0 = time.perf_counter()
        try:
            scen_resp = await client.get(f"{base_url}/api/scenarios?track=leadership", headers=auth_headers)
            lat_scen = (time.perf_counter() - t0) * 1000.0
            await metrics.record(lat_scen, scen_resp.status_code)
        except Exception as e:
            lat = (time.perf_counter() - t0) * 1000.0
            await metrics.record(lat, 0, f"Scenarios exception: {str(e)}")

        # 3. Create Session (Concurrent Launch)
        t0 = time.perf_counter()
        session_id = None
        try:
            create_resp = await client.post(
                f"{base_url}/api/sessions",
                headers=auth_headers,
                json={"scenario_id": scenario_id, "mode": "text"},
            )
            lat_create = (time.perf_counter() - t0) * 1000.0
            await metrics.record(lat_create, create_resp.status_code)

            if create_resp.status_code == 201:
                session_id = create_resp.json()["id"]
            elif create_resp.status_code == 429:
                await metrics.record(lat_create, 429, "Attempt limit reached (expected if max runs used)")
                return
            else:
                await metrics.record(lat_create, create_resp.status_code, f"Create session error: {create_resp.text}")
                return
        except Exception as e:
            lat = (time.perf_counter() - t0) * 1000.0
            await metrics.record(lat, 0, f"Create session exception: {str(e)}")
            return

        # 4. Send Message / Dialogue Turn
        if session_id:
            t0 = time.perf_counter()
            try:
                msg_resp = await client.post(
                    f"{base_url}/api/sessions/{session_id}/messages",
                    headers=auth_headers,
                    json={
                        "content": (
                            f"Hello, this is {student_name}. I want to address the recent meeting delays and agree on an operational standard."
                        )
                    },
                )
                lat_msg = (time.perf_counter() - t0) * 1000.0
                await metrics.record(lat_msg, msg_resp.status_code)
            except Exception as e:
                lat = (time.perf_counter() - t0) * 1000.0
                await metrics.record(lat, 0, f"Message turn exception: {str(e)}")


async def main():
    parser = argparse.ArgumentParser(description="Concurrent 30-Student Load Test")
    parser.add_argument("--url", default="https://scenariolab-api.onrender.com", help="Target API URL")
    args = parser.parse_args()
    base_url = args.url.rstrip("/")

    print("=" * 70)
    print(" 3H SOLUTIONS EXECUTIVE SCENARIO PLATFORM — CONCURRENT 30-USER STRESS TEST")
    print(f" Target Endpoint: {base_url}")
    print(f" Simulated Trainees: 30 concurrent users")
    print("=" * 70)

    async with httpx.AsyncClient(timeout=30.0) as admin_client:
        # Step 0: Admin Login
        print(f"\n[0/3] Authenticating Admin '{ADMIN_NAME}' with passcode '{COHORT_PASSCODE}'...")
        admin_resp = await admin_client.post(
            f"{base_url}/api/auth/login",
            json={"passcode": COHORT_PASSCODE, "display_name": ADMIN_NAME},
        )
        if admin_resp.status_code != 200:
            print(f"FAILED to login as admin: {admin_resp.status_code} - {admin_resp.text}")
            return

        admin_data = admin_resp.json()
        admin_token = admin_data["access_token"]
        cohort_id = admin_data["cohort"]["id"]
        print(f"  -> Logged in as Admin. Cohort ID: {cohort_id} ({admin_data['cohort']['name']})")

        # Step 1: Enroll 30 students
        await enroll_students(base_url, admin_token, cohort_id, admin_client)

        # Step 2: Retrieve a valid scenario ID
        scen_resp = await admin_client.get(
            f"{base_url}/api/scenarios?track=leadership",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        scenarios = scen_resp.json()
        target_scenario_id = scenarios[0]["id"]
        target_scenario_title = scenarios[0]["title"]
        print(f"\n[2/3] Target Simulation Scenario: '{target_scenario_title}' ({target_scenario_id})")

    # Step 3: Run 30 CONCURRENT student journeys
    print(f"\n[3/3] Disagreeing barrier: Launching 30 SIMULTANEOUS student sessions at once...")
    metrics = PerformanceMetrics()
    metrics.start_time = time.perf_counter()

    tasks = [
        simulate_student_journey(i, name, base_url, target_scenario_id, metrics)
        for i, name in enumerate(STUDENT_ROSTER)
    ]

    # Concurrently execute all 30 student simulations
    await asyncio.gather(*tasks)

    metrics.end_time = time.perf_counter()
    total_elapsed = metrics.end_time - metrics.start_time

    # Report results
    total_reqs = len(metrics.latencies)
    successful_reqs = sum(count for code, count in metrics.status_codes.items() if 200 <= code < 300)
    failed_reqs = total_reqs - successful_reqs

    print("\n" + "=" * 70)
    print(" EXECUTION PERFORMANCE & CONCURRENCY BENCHMARK RESULTS")
    print("=" * 70)
    print(f" Total Wall-Clock Test Duration: {total_elapsed:.2f} seconds")
    print(f" Total HTTP Requests Executed:    {total_reqs}")
    print(f" Peak Concurrent Trainee Journeys: 30 students active simultaneously")
    print(f" Throughput:                      {total_reqs / total_elapsed:.2f} reqs/sec")
    print(f" Successful Requests (2xx):       {successful_reqs} ({successful_reqs / max(1, total_reqs) * 100:.1f}%)")
    print(f" Failed Requests (non-2xx):       {failed_reqs}")

    print("\n HTTP Status Code Distribution:")
    for code, count in sorted(metrics.status_codes.items()):
        print(f"   HTTP {code}: {count} requests")

    if metrics.latencies:
        sorted_lat = sorted(metrics.latencies)
        p50 = statistics.median(sorted_lat)
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if len(sorted_lat) >= 20 else sorted_lat[-1]
        p99 = sorted_lat[int(len(sorted_lat) * 0.99)] if len(sorted_lat) >= 100 else sorted_lat[-1]
        print("\n Latency Profile (End-to-End per Request):")
        print(f"   Min Latency:     {min(sorted_lat):.1f} ms")
        print(f"   Mean Latency:    {statistics.mean(sorted_lat):.1f} ms")
        print(f"   Median (P50):    {p50:.1f} ms")
        print(f"   P95 Latency:     {p95:.1f} ms")
        print(f"   Max Latency:     {max(sorted_lat):.1f} ms")

    if metrics.errors:
        print(f"\n Error Log ({len(metrics.errors)} anomalies recorded):")
        for err in metrics.errors[:5]:
            print(f"   - {err}")
    else:
        print("\n Zero unhandled errors recorded during concurrent 30-student execution!")

    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
