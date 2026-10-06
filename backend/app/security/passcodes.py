import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError

# Unambiguous alphabet (no 0/O, 1/I/L)
ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
ph = PasswordHasher()


def generate_passcode(length: int = 8) -> str:
    """
    Generate a cryptographically secure, human-friendly passcode.
    Example output: 'K7QM-4PXD'
    """
    part1 = "".join(secrets.choice(ALPHABET) for _ in range(length // 2))
    part2 = "".join(secrets.choice(ALPHABET) for _ in range(length - length // 2))
    return f"{part1}-{part2}"


def normalize_passcode(code: str) -> str:
    """Normalize passcode by stripping whitespace, uppercase, and trimming."""
    return code.strip().upper()


def hash_passcode(code: str) -> str:
    """Hash passcode with Argon2id and per-code salt."""
    normalized = normalize_passcode(code)
    return ph.hash(normalized)


def verify_passcode(plain_code: str, hashed_code: str) -> bool:
    """Verify plaintext passcode against Argon2 hash in constant time."""
    normalized = normalize_passcode(code=plain_code)
    try:
        return ph.verify(hashed_code, normalized)
    except (VerifyMismatchError, VerificationError, Exception):
        return False


def hash_token(token: str) -> str:
    """Hash JWT or session token with SHA-256 for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
