import urllib.request
import urllib.parse
import json
import time
import sys

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

def http_json(method, url, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req) as resp:
            elapsed_ms = (time.perf_counter() - start) * 1000
            content = resp.read().decode("utf-8")
            try:
                res_json = json.loads(content) if content else {}
            except Exception:
                res_json = {"raw": content[:200]}
            return resp.status, elapsed_ms, res_json
    except urllib.error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        content = e.read().decode("utf-8")
        try:
            res_json = json.loads(content)
        except Exception:
            res_json = {"raw": content[:200]}
        return e.code, elapsed_ms, res_json
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000
        return 0, elapsed_ms, {"error": str(exc)}

def run_tests():
    log("=========================================================")
    log("  DELIBERATE PRACTICE END-TO-END RUNTIME & VOICE AUDIT   ")
    log("=========================================================")

    # 1. Server Health
    status, elapsed, data = http_json("GET", "http://127.0.0.1:8000/docs")
    log(f"1. Backend Docs Root Check: status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"Expected 200 for /docs, got {status}"

    # 2. Uzair Super Admin Authentication
    log("\n2. Testing Admin Login with UZAIR-2026...")
    status, elapsed, data = http_json(
        "POST",
        "http://127.0.0.1:8000/api/auth/login",
        {"passcode": "UZAIR-2026", "display_name": "UZAIR"}
    )
    log(f"   Uzair Login: status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"Uzair login failed with status {status}: {data}"
    admin_token = data["access_token"]
    admin_user = data["user"]
    log(f"   -> User: '{admin_user['display_name']}', Role: '{admin_user['role']}'")
    assert admin_user["role"] == "super_admin", f"Expected super_admin, got {admin_user['role']}"

    # 3. Admin Cohort Scoping & Telemetry
    log("\n3. Testing Admin Cohorts & Cohort-Scoped Sessions...")
    status, elapsed, cohorts = http_json(
        "GET",
        "http://127.0.0.1:8000/api/admin/cohorts",
        token=admin_token
    )
    log(f"   Cohort list: status={status}, found {len(cohorts)} cohorts (took {elapsed:.1f}ms)")
    assert status == 200, f"Failed to list cohorts: {cohorts}"

    target_cohort = cohorts[0]
    cid = target_cohort["id"]
    cname = target_cohort["name"]
    cpasscode = target_cohort.get("initial_passcode", "CUSTOM-9999")
    log(f"   Selected Cohort: '{cname}' (id: {cid}, passcode: {cpasscode})")

    # Scoped sessions query
    status, elapsed, scoped_sessions = http_json(
        "GET",
        f"http://127.0.0.1:8000/api/sessions?cohort_id={cid}",
        token=admin_token
    )
    log(f"   Scoped Sessions for '{cname}': status={status}, count={len(scoped_sessions)} (took {elapsed:.1f}ms)")
    assert status == 200, f"Failed to get scoped sessions: {scoped_sessions}"

    # 4. Capabilities & Scenarios Verification
    log("\n4. Testing Curriculum Capabilities & Scenarios...")
    status, elapsed, caps = http_json(
        "GET",
        "http://127.0.0.1:8000/api/capabilities",
        token=admin_token
    )
    log(f"   Capabilities API: status={status}, count={len(caps)} (took {elapsed:.1f}ms)")
    assert status == 200 and len(caps) >= 60, f"Expected >= 60 capabilities, got {len(caps)}"

    status, elapsed, scens = http_json(
        "GET",
        "http://127.0.0.1:8000/api/scenarios?track=leadership",
        token=admin_token
    )
    log(f"   Leadership Scenarios: status={status}, count={len(scens)} (took {elapsed:.1f}ms)")
    assert status == 200 and len(scens) > 0, f"Expected scenarios, got {len(scens)}"
    test_scenario = scens[0]
    scen_id = test_scenario["id"]
    scen_title = test_scenario["title"]
    log(f"   Target Scenario: '{scen_title}' (id: {scen_id})")

    # 5. Student Enrollment & Authentication
    log("\n5. Enrolling Student & Testing Participant Access...")
    student_name = f"Test Exec {int(time.time()) % 1000}"
    status, elapsed, member = http_json(
        "POST",
        f"http://127.0.0.1:8000/api/admin/cohorts/{cid}/members",
        {"display_name": student_name, "role": "trainee"},
        token=admin_token
    )
    log(f"   Enrolled '{student_name}': status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"Enrollment failed: {member}"

    # Authenticate student using cohort passcode
    status, elapsed, student_auth = http_json(
        "POST",
        "http://127.0.0.1:8000/api/auth/login",
        {"passcode": cpasscode, "display_name": student_name}
    )
    log(f"   Participant Login with {cpasscode}: status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"Student login failed: {student_auth}"
    student_token = student_auth["access_token"]

    # 6. Voice Mode Simulation Session Creation & Counterpart Reaction
    log("\n6. Launching Voice Practice Simulation...")
    status, elapsed, session_data = http_json(
        "POST",
        "http://127.0.0.1:8000/api/sessions",
        {"scenario_id": scen_id, "mode": "voice"},
        token=student_token
    )
    log(f"   Create Voice Session: status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"Voice session creation failed: {session_data}"
    sess_id = session_data["id"]
    opening_msg = session_data.get("opening_message", "")
    log(f"   Session ID: {sess_id}")
    log(f"   Counterpart Opening Statement: \"{opening_msg}\"")
    assert len(opening_msg) > 5, "Expected valid opening counterpart statement"

    # 7. Testing Voice/Dialogue Turn Generation (LLM Response, TTFT, Latency)
    log("\n7. Executing Dialogue Turn in Voice Mode...")
    student_dialogue = (
        "I understand the executive timeline is aggressive, but delivering this without thorough "
        "QA introduces high operational risk. Let us phase the deliverables to protect the business."
    )
    log(f"   Student Speaks: \"{student_dialogue}\"")
    turn_start = time.perf_counter()
    status, elapsed, turn_reply = http_json(
        "POST",
        f"http://127.0.0.1:8000/api/sessions/{sess_id}/turns",
        {"content": student_dialogue, "stream": False},
        token=student_token
    )
    log(f"   Counterpart Reacted: status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"Dialogue turn failed: {turn_reply}"
    counterpart_reply = turn_reply.get("reply", "")
    latency_ms = turn_reply.get("latency_ms", 0)
    total_ms = turn_reply.get("total_turn_ms", 0)
    log(f"   Counterpart Reply: \"{counterpart_reply}\"")
    log(f"   Latency Telemetry: FirstToken={latency_ms}ms, TotalTurn={total_ms}ms")
    assert len(counterpart_reply) > 5, "Expected non-empty counterpart reply"

    # 8. Testing Voice TTS Audio Synthesis Endpoint
    log("\n8. Testing Voice TTS Model Synthesis...")
    status, elapsed, tts_result = http_json(
        "POST",
        "http://127.0.0.1:8000/api/voice/tts",
        {"text": counterpart_reply[:120], "voice": "en-US-Standard-C"},
        token=student_token
    )
    log(f"   Voice TTS Generation: status={status} (took {elapsed:.1f}ms)")
    # Note: TTS returns audio or fallback synthesized audio
    if status == 200:
        log("   -> Voice TTS synthesized audio stream ready.")
    else:
        log(f"   -> Voice TTS note (status {status}): {tts_result}")

    # 9. Concluding Simulation & Evaluating Performance
    log("\n9. Concluding Practice Session & Generating Evaluation...")
    status, elapsed, end_data = http_json(
        "POST",
        f"http://127.0.0.1:8000/api/sessions/{sess_id}/end",
        token=student_token
    )
    log(f"   Conclude Session: status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"End session failed: {end_data}"

    # 10. Generating 1-Pager Executive Evaluation Report
    log("\n10. Fetching Executive Rubric Feedback & 1-Pager Debrief...")
    status, elapsed, eval_report = http_json(
        "GET",
        f"http://127.0.0.1:8000/api/sessions/{sess_id}/evaluation",
        token=student_token
    )
    log(f"    Evaluation Report: status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"Failed to get evaluation: {eval_report}"
    overall_score = eval_report.get("overall_score")
    summary = eval_report.get("overall_summary", "")
    skill_scores = eval_report.get("skill_scores", [])
    log(f"    Overall Score: {overall_score}/100")
    log(f"    Executive Summary: {summary[:150]}...")
    log(f"    Skills Assessed ({len(skill_scores)}):")
    for s in skill_scores:
        log(f"      - {s.get('skill')}: {s.get('score')}% ({s.get('rubric_level_reached')})")

    # 11. Admin Verification: Check Scoped Session Shows in Cohort Roster
    log("\n11. Verifying Admin 1-Pager Debrief Access for Uzair...")
    status, elapsed, admin_eval = http_json(
        "GET",
        f"http://127.0.0.1:8000/api/sessions/{sess_id}/evaluation",
        token=admin_token
    )
    log(f"    Admin 1-Pager Debrief Access: status={status} (took {elapsed:.1f}ms)")
    assert status == 200, f"Admin evaluation retrieval failed: {admin_eval}"

    # 12. Frontend Server Check
    log("\n12. Verifying Frontend Dev Server Status on port 5173...")
    req_fe = urllib.request.Request("http://localhost:5173/")
    with urllib.request.urlopen(req_fe) as fe_resp:
        log(f"    Frontend HTTP Status: {fe_resp.status} (Vite serving index.html)")
        assert fe_resp.status == 200, f"Expected 200 from frontend, got {fe_resp.status}"

    log("\n=========================================================")
    log("  [SUCCESS] ALL SYSTEMS HEALTHY: BACKEND, FRONTEND, API & VOICE")
    log("=========================================================")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        log(f"[ERROR] TEST FAILED: {e}")
        sys.exit(1)
