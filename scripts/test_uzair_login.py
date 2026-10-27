import httpx

try:
    r = httpx.post("http://localhost:8000/api/auth/login", json={"passcode": "UZAIR-2026", "display_name": "UZAIR"})
    print("STATUS:", r.status_code)
    print("BODY:", r.text)
except Exception as e:
    print("ERROR:", e)
