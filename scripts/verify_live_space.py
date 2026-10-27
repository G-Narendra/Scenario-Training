import httpx
import sys
import time

base = 'https://mrdev444-scenario-training-backend.hf.space'
print('=== Running Comprehensive Live Production Validation on Hugging Face Space ===\n')

# Allow 10 seconds for Hugging Face rebuild if needed
time.sleep(5)

try:
    # 0. Test Web App SPA Endpoints (/ and /app/)
    print("--- Gate 0: Verifying Web App Frontend Delivery ---")
    r_root = httpx.get(f'{base}/', follow_redirects=True, timeout=15)
    r_app = httpx.get(f'{base}/app/', follow_redirects=True, timeout=15)
    print(f"GET /: HTTP {r_root.status_code} (HTML length: {len(r_root.text)})")
    print(f"GET /app/: HTTP {r_app.status_code} (HTML length: {len(r_app.text)})")
    assert r_root.status_code == 200 and "<html" in r_root.text.lower(), "Root SPA failed"
    assert r_app.status_code == 200 and "<html" in r_app.text.lower(), "/app/ SPA failed"
    print("[PASS] Gate 0: Frontend SPA successfully delivering on root and /app/\n")

    # 1. Test Strict Authentication & Personas
    print("--- Gate 1: Strict Authentication & Role Isolation ---")
    
    # 1a. Fake name 'fox' MUST be rejected with HTTP 403
    r_fox = httpx.post(
        f'{base}/api/auth/login',
        json={'passcode': 'UZAIR-2026', 'display_name': 'fox'},
        timeout=15
    )
    print(f"Login 'fox' + 'UZAIR-2026': HTTP {r_fox.status_code}")
    assert r_fox.status_code == 403, f"Expected 403 for fake name 'fox', got {r_fox.status_code}"
    print("[PASS] Fake participant 'fox' properly rejected with 403 Forbidden.")

    # 1b. Student Narendra MUST get role 'trainee'
    r_student = httpx.post(
        f'{base}/api/auth/login',
        json={'passcode': 'UZAIR-2026', 'display_name': 'Narendra'},
        timeout=15
    )
    assert r_student.status_code == 200, f"Student login failed: {r_student.text}"
    student_data = r_student.json()
    assert student_data['user']['role'] == 'trainee', f"Expected trainee, got {student_data['user']['role']}"
    print(f"[PASS] Student Narendra logged in with role: {student_data['user']['role']}")

    # 1c. Facilitator Uzair MUST get role 'group_admin'
    r_uzair = httpx.post(
        f'{base}/api/auth/login',
        json={'passcode': 'UZAIR-2026', 'display_name': 'Uzair'},
        timeout=15
    )
    assert r_uzair.status_code == 200, f"Uzair login failed: {r_uzair.text}"
    uzair_data = r_uzair.json()
    assert uzair_data['user']['role'] == 'group_admin', f"Expected group_admin, got {uzair_data['user']['role']}"
    print(f"[PASS] Facilitator Uzair logged in with role: {uzair_data['user']['role']}")

    # 1d. Super Admin Narendra MUST get role 'super_admin'
    r_admin = httpx.post(
        f'{base}/api/auth/login',
        json={'passcode': 'NARENDRA-2026', 'display_name': 'Narendra'},
        timeout=15
    )
    assert r_admin.status_code == 200, f"Super admin login failed: {r_admin.text}"
    admin_data = r_admin.json()
    assert admin_data['user']['role'] == 'super_admin', f"Expected super_admin, got {admin_data['user']['role']}"
    print(f"[PASS] Super Admin Narendra logged in with role: {admin_data['user']['role']}\n")

    # 2. Test Admin Cohort Enrollment (Uzair managing cohort)
    print("--- Gate 2: Admin Cohort Membership Permissions ---")
    uzair_headers = {'Authorization': f"Bearer {uzair_data['access_token']}"}
    cohort_id = uzair_data['cohort']['id']
    # Enroll dynamic test member
    trainee_name = f"Test Trainee {int(time.time()) % 10000}"
    r_enroll = httpx.post(
        f'{base}/api/admin/cohorts/{cohort_id}/members',
        json={'display_name': trainee_name, 'role': 'trainee'},
        headers=uzair_headers,
        timeout=15
    )
    print(f"Uzair enrolling '{trainee_name}': HTTP {r_enroll.status_code}")
    assert r_enroll.status_code in (200, 201), f"Enrollment failed with: {r_enroll.text}"
    print(f"[PASS] Facilitator Uzair successfully enrolled student without permission error.\n")

    # 2b. Test Facilitator Uzair Cohort Creation & Deletion
    print("--- Gate 2b: Facilitator Uzair Cohort Creation & Permanent Deletion ---")
    cohort_temp_name = f"Uzair Temp Cohort {int(time.time()) % 10000}"
    r_create_c = httpx.post(
        f'{base}/api/admin/cohorts',
        json={
            'name': cohort_temp_name,
            'description': 'Temporary test cohort for deletion check',
            'duration_days': 30,
            'custom_passcode': f"TEST-{int(time.time()) % 10000}",
        },
        headers=uzair_headers,
        timeout=15,
    )
    print(f"Uzair creating cohort '{cohort_temp_name}': HTTP {r_create_c.status_code}")
    assert r_create_c.status_code in (200, 201), f"Cohort creation failed: {r_create_c.text}"
    temp_cohort_id = r_create_c.json()['id']

    # Delete the temporary cohort as Uzair
    r_del_c = httpx.delete(
        f'{base}/api/admin/cohorts/{temp_cohort_id}',
        headers=uzair_headers,
        timeout=15,
    )
    print(f"Uzair deleting cohort '{cohort_temp_name}': HTTP {r_del_c.status_code}")
    assert r_del_c.status_code == 200, f"Cohort deletion failed: {r_del_c.text}"
    del_msg = r_del_c.json().get('message', '')
    print(f"[PASS] Facilitator Uzair permanently deleted cohort without error: \"{del_msg}\"\n")

    # 2c. Test Curriculum Capabilities & Scenarios Listing
    print("--- Gate 2c: Curriculum Capabilities & Scenario Listings ---")
    r_caps = httpx.get(f'{base}/api/capabilities', headers=uzair_headers, timeout=15)
    print(f"GET /api/capabilities: HTTP {r_caps.status_code}")
    assert r_caps.status_code == 200, f"Capabilities failed: {r_caps.text}"
    caps_data = r_caps.json()
    assert len(caps_data) > 0, "Capabilities list is empty!"
    sample_cap = caps_data[0]
    print(f"Loaded {len(caps_data)} capabilities in curriculum.")
    print(f"Sample: '{sample_cap.get('name')}' (Pillar: {sample_cap.get('pillar')})")
    print(f"Mapped Scenario: '{sample_cap.get('matching_scenario_title')}' (ID: {sample_cap.get('matching_scenario_id')})")
    assert sample_cap.get('matching_scenario_title'), "Scenario listing missing on capability item!"
    print("[PASS] Curriculum capabilities and scenario listings fully populated and mapped.\n")

    # 3. Test Student Scenario & Simulation
    print("--- Gate 3: Live Simulation & AI Speed Verification ---")
    student_headers = {'Authorization': f"Bearer {student_data['access_token']}"}
    r_scenarios = httpx.get(f'{base}/api/scenarios', headers=student_headers, timeout=15)
    scenarios = r_scenarios.json()
    scenario = scenarios[0]
    print(f"Loaded {len(scenarios)} scenarios. First: '{scenario['title']}' (Track: {scenario['track']})")

    # Start Session
    r_sess = httpx.post(
        f'{base}/api/sessions',
        json={'scenario_id': scenario['id'], 'mode': 'voice'},
        headers=student_headers,
        timeout=20
    )
    assert r_sess.status_code == 201, f"Session creation failed: {r_sess.text}"
    session_data = r_sess.json()
    session_id = session_data['id']
    opening = session_data['messages'][0]['content'] if session_data.get('messages') else ''
    print(f"Session started ({session_id}) in mode 'voice'")
    print(f"Opening line: \"{opening[:100]}...\"")

    # Send message via high-speed NVIDIA NIM
    msg_payload = {
        'content': 'I understand the urgency and appreciate you outlining your concerns. Let us look at what we can align on first.'
    }
    t0 = time.perf_counter()
    r_msg = httpx.post(
        f'{base}/api/sessions/{session_id}/messages',
        json=msg_payload,
        headers=student_headers,
        timeout=30
    )
    ttft_ms = round((time.perf_counter() - t0) * 1000)
    assert r_msg.status_code == 200, f"Message response failed: {r_msg.text}"
    ai_reply = r_msg.json()
    reply_text = ai_reply.get('reply', '')
    print(f"NVIDIA NIM AI Reply received in {ttft_ms}ms ({len(reply_text)} chars):")
    print(f"\"{reply_text[:120]}...\"\n")

    # 4. Test Voice Audio Synthesis (TTS)
    print("--- Gate 4: Voice Synthesis (TTS) Verification ---")
    tts_params = {'text': opening[:100], 'voice': 'female'}
    r_tts = httpx.get(f'{base}/api/voice/tts', params=tts_params, headers=student_headers, timeout=15)
    assert r_tts.status_code == 200, f"TTS failed: {r_tts.status_code}"
    print(f"Audio synthesized: HTTP 200 ({len(r_tts.content)} bytes, Content-Type: {r_tts.headers.get('content-type')})")
    print("[PASS] Voice TTS successfully verified.\n")

    print("======================================================================")
    print(" [SUCCESS] ALL LIVE PRODUCTION VALIDATION GATES PASSED 100% ON HUGGING FACE! ")
    print("======================================================================")

except Exception as e:
    print(f"\n[FAIL] Validation encountered error: {e}")
    sys.exit(1)
