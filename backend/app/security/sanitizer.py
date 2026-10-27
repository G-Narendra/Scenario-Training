import re
import unicodedata

# Unicode bidirectional control characters that can conceal text or reorder rendering
BIDI_CHARS_PATTERN = re.compile(r"[\u200E\u200F\u202A-\u202E\u2066-\u2069]")

# Prompt injection delimiter markers and raw model control tokens
INJECTION_TOKENS_PATTERN = re.compile(
    r"(<\|im_start\|>|<\|im_end\|>|<special_token_system>|<special_token_user>|\[INST\]|\[/INST\])",
    re.IGNORECASE,
)


def sanitize_user_input(text: str) -> str:
    """
    Sanitizes user conversational and voice input by:
    - Removing Unicode null bytes
    - Stripping Unicode bidirectional override characters
    - Stripping raw LLM prompt injection delimiter tokens
    - Applying Unicode NFKC normalization
    - Stripping leading/trailing whitespace
    """
    if not text:
        return ""
    # 1. Strip null bytes
    clean = text.replace("\x00", "").replace("\u0000", "")
    # 2. Strip Bidi override characters
    clean = BIDI_CHARS_PATTERN.sub("", clean)
    # 3. Strip special token injection markers
    clean = INJECTION_TOKENS_PATTERN.sub("", clean)
    # 4. Normalize Unicode
    clean = unicodedata.normalize("NFKC", clean)
    return clean.strip()
