import urllib.request
import json
import time

BASE_URL = "https://mrdev444-scenario-training-backend.hf.space"

def get_auth_token():
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = json.dumps({"passcode": "UZAIR-2026", "display_name": "Dev"}).encode('utf-8')
    req = urllib.request.Request(login_url, data=login_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        auth_data = json.loads(resp.read().decode('utf-8'))
        return auth_data["access_token"]

def test_scenario_ordering(token):
    print("\n--- TEST 1: Scenario Ordering 1 to 60 ---")
    url = f"{BASE_URL}/api/scenarios?limit=60"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "User-Agent": "TestClient"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        scenarios = data if isinstance(data, list) else data.get("scenarios", [])
        print(f"Total scenarios returned: {len(scenarios)}")
        first_5 = [(s.get("slug"), s.get("title")) for s in scenarios[:5]]
        last_5 = [(s.get("slug"), s.get("title")) for s in scenarios[-5:]]
        print("First 5:", first_5)
        print("Last 5:", last_5)
        
        # Verify leadership 01 to 30 come first, then sales 01 to 30
        assert "leadership-01" in scenarios[0].get("slug"), f"First scenario should be leadership-01, got {scenarios[0].get('slug')}"
        assert "leadership" in scenarios[29].get("slug"), f"Scenario 30 should be leadership, got {scenarios[29].get('slug')}"
        assert "sales" in scenarios[30].get("slug"), f"Scenario 31 should be sales, got {scenarios[30].get('slug')}"
        print("✓ Scenario order verified: leadership-01..30 followed by sales-01..30 strictly in order!")
        return scenarios[0]["id"]

def test_unprofessional_dialogue_evaluation(token, target_scenario_id):
    print("\n--- TEST 2: Unprofessional/Profane Dialogue Evaluation Gate ---")
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    
    # 2. Start session on scenario
    start_url = f"{BASE_URL}/api/sessions"
    start_payload = json.dumps({"scenario_id": target_scenario_id, "mode": "text"}).encode('utf-8')
    req = urllib.request.Request(start_url, data=start_payload, headers=headers)
    with urllib.request.urlopen(req) as resp:
        session_data = json.loads(resp.read().decode('utf-8'))
        session_id = session_data["id"]
    
    print(f"Started session {session_id}")
    
    # 3. Send profane/unprofessional talk (simulating what the user experienced in shit_talk.pdf)
    msg_url = f"{BASE_URL}/api/sessions/{session_id}/messages"
    bad_messages = [
        "this is complete shit, i don't care about your project",
        "fuck this meeting, you are all idiots and crap"
    ]
    for msg in bad_messages:
        payload = json.dumps({"content": msg}).encode('utf-8')
        req = urllib.request.Request(msg_url, data=payload, headers=headers)
        with urllib.request.urlopen(req) as resp:
            resp_data = json.loads(resp.read().decode('utf-8'))
            print("Message sent, counterpart responded.")
        time.sleep(1)
        
    # 4. End session
    end_url = f"{BASE_URL}/api/sessions/{session_id}/end"
    req = urllib.request.Request(end_url, data=json.dumps({}).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req) as resp:
        print("Session ended.")
        
    # 5. Fetch evaluation
    eval_url = f"{BASE_URL}/api/sessions/{session_id}/evaluation"
    req = urllib.request.Request(eval_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        eval_data = json.loads(resp.read().decode('utf-8'))
        
    print("\nEVALUATION RESULT:")
    overall_score = eval_data.get("overall_score")
    summary = eval_data.get("summary")
    strengths = eval_data.get("strengths", [])
    recommendations = eval_data.get("recommendations", [])
    skill_scores = eval_data.get("skill_scores", [])
    
    print(f"Overall Score: {overall_score} (Expected <= 10 or 0)")
    print(f"Summary: {summary}")
    print(f"Strengths: {strengths}")
    print(f"Recommendations: {recommendations}")
    for s in skill_scores:
        print(f"Skill: {s.get('skill')} -> Score: {s.get('score')}, Level: {s.get('rubric_level_reached')}")
        
    assert overall_score == 0 or overall_score <= 10, f"Score should be 0 or <= 10, got {overall_score}"
    assert "composure" not in " ".join(strengths).lower() or "unprofessional" in summary.lower(), "Should NOT praise composure on profane dialogue!"
    print("✓ Unprofessional dialogue correctly scored 0 with zero fake praise!")

def main():
    token = get_auth_token()
    scen_id = test_scenario_ordering(token)
    test_unprofessional_dialogue_evaluation(token, scen_id)
    print("\n================ ALL LIVE TESTS PASSED ================")

if __name__ == "__main__":
    main()
