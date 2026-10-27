import urllib.request
import json
import sys

def test_fixes():
    print("=== 1. Verifying Uzair Admin Login with UZAIR-2026 ===")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/auth/login",
        data=json.dumps({"passcode": "UZAIR-2026", "display_name": "UZAIR"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode("utf-8"))
        token = data.get("access_token")
        user = data.get("user")
        print(f"Login success! User: {user['display_name']}, Role: {user['role']}")
        assert user["role"] == "super_admin", f"Expected super_admin, got {user['role']}"

    print("\n=== 2. Verifying Cohorts Listing ===")
    req_cohorts = urllib.request.Request(
        "http://127.0.0.1:8000/api/admin/cohorts",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req_cohorts) as resp:
        assert resp.status == 200
        cohorts = json.loads(resp.read().decode("utf-8"))
        print(f"Loaded {len(cohorts)} cohorts.")
        if cohorts:
            cid = cohorts[0]["id"]
            cname = cohorts[0]["name"]
            print(f"Testing cohort sessions scoped to cohort: {cname} ({cid})")

            # Test session filtering by cohort_id
            req_sess = urllib.request.Request(
                f"http://127.0.0.1:8000/api/sessions?cohort_id={cid}",
                headers={"Authorization": f"Bearer {token}"}
            )
            with urllib.request.urlopen(req_sess) as s_resp:
                assert s_resp.status == 200
                sess_list = json.loads(s_resp.read().decode("utf-8"))
                print(f"Sessions for cohort '{cname}': {len(sess_list)}")

    print("\n=== 3. Verifying Capabilities Endpoint ===")
    req_caps = urllib.request.Request(
        "http://127.0.0.1:8000/api/capabilities",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req_caps) as resp:
        assert resp.status == 200
        caps = json.loads(resp.read().decode("utf-8"))
        print(f"Loaded {len(caps)} capabilities.")

    print("\nAll backend endpoints verified successfully!")

if __name__ == "__main__":
    test_fixes()
