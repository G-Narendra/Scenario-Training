from backend.app.security.passcodes import (
    generate_passcode,
    hash_passcode,
    hash_token,
    verify_passcode,
)


def test_generate_passcode_format():
    code = generate_passcode()
    assert len(code) == 9  # 4 chars + '-' + 4 chars
    assert "-" in code
    parts = code.split("-")
    assert len(parts) == 2
    assert len(parts[0]) == 4
    assert len(parts[1]) == 4
    # Ensure unambiguous characters only
    for char in code.replace("-", ""):
        assert char in "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def test_hash_and_verify_passcode():
    code = generate_passcode()
    hashed = hash_passcode(code)
    assert hashed != code
    assert verify_passcode(code, hashed) is True
    # Test case insensitivity and whitespace handling
    assert verify_passcode(f"  {code.lower()}  ", hashed) is True
    assert verify_passcode("WRONG-CODE", hashed) is False


def test_hash_token_deterministic():
    token = "some-jwt-token-string-12345"
    h1 = hash_token(token)
    h2 = hash_token(token)
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex string
