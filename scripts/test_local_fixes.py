import httpx

base = "http://127.0.0.1:8000"

# 1. Login as SuperAdmin
r = httpx.post(f"{base}/api/auth/login", json={"passcode": "NARENDRA-2026", "display_name": "Narendra"})
assert r.status_code == 200, f"Login failed: {r.text}"
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("[PASS] SuperAdmin logged in successfully!")

# 2. Create custom cohort with custom passcode 'CUSTOM-9999'
r_cohort = httpx.post(
    f"{base}/api/admin/cohorts",
    headers=headers,
    json={
        "name": "Test Custom Passcode Cohort",
        "description": "Testing custom passcode display",
        "duration_days": 30,
        "track_access": "both",
        "max_members": 50,
        "budget_cap_usd": 500,
        "custom_passcode": "CUSTOM-9999",
    },
)
assert r_cohort.status_code == 201, f"Create cohort failed: {r_cohort.text}"
cohort_data = r_cohort.json()
cohort_id = cohort_data["id"]
print(f"[PASS] Created cohort id={cohort_id}, initial_passcode={cohort_data.get('initial_passcode')}")
assert cohort_data.get("initial_passcode") == "CUSTOM-9999"

# 3. Fetch all cohorts via GET /api/admin/cohorts
r_list = httpx.get(f"{base}/api/admin/cohorts", headers=headers)
assert r_list.status_code == 200
found = [c for c in r_list.json() if c["id"] == cohort_id]
assert len(found) == 1
returned_code = found[0].get("initial_passcode")
print(f"[PASS] GET /api/admin/cohorts returned initial_passcode={returned_code}")
assert returned_code == "CUSTOM-9999", f"Failed: expected CUSTOM-9999, got {returned_code}"

# 4. Fetch specific cohort via GET /api/admin/cohorts/{id}
r_get = httpx.get(f"{base}/api/admin/cohorts/{cohort_id}", headers=headers)
assert r_get.status_code == 200
specific_code = r_get.json().get("initial_passcode")
print(f"[PASS] GET /api/admin/cohorts/{{id}} returned initial_passcode={specific_code}")
assert specific_code == "CUSTOM-9999", f"Failed: expected CUSTOM-9999, got {specific_code}"

# 5. Test Voice Mode Neural TTS endpoint
print("Testing Edge-TTS generation...")
r_tts = httpx.get(f"{base}/api/voice/tts?text=Good+morning+executive+leader&voice=male", timeout=15)
assert r_tts.status_code == 200, f"TTS failed: {r_tts.status_code}"
ct = r_tts.headers.get("content-type")
print(f"[PASS] Neural Edge-TTS synthesized {len(r_tts.content)} bytes of MP3 audio! Content-Type: {ct}")

print("\n>>> ALL LOCAL BACKEND & VOICE TESTS PASSED 100%! <<<")
