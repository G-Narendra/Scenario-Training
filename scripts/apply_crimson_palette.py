"""
Global color replacement: #FF6500 (orange) → #B91C1C (crimson, light)
Dark-mode variants (#E05A00 hover) → #BE2626 (crimson hover dark)
Also updates tailwind.config.js shadow glow.

Run from project root:
  python scripts/apply_crimson_palette.py
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
FRONTEND_SRC = ROOT / "frontend" / "src"
TAILWIND_CFG = ROOT / "frontend" / "tailwind.config.js"

# Replacements: (pattern, replacement) — applied in order
REPLACEMENTS = [
    # Dark-mode hover orange → crimson hover
    (r"#E05A00", "#BE2626"),
    # Dark-mode primary orange → dark crimson (used in dark:bg-[#FF6500])
    # We need context: dark:*-[#FF6500] → dark:*-[#DC2626]
    # But non-dark occurrences should → #B91C1C
    # Strategy: do dark: prefixed first
    (r"(dark:[a-z-]+\[)#FF6500(\])", r"\1#DC2626\2"),
    # Remaining #FF6500 → #B91C1C (light mode / generic)
    (r"#FF6500", "#B91C1C"),
    # Also fix stopColor hex in SVG/JSX attributes for dark mode radar
    # (already covered above, but explicit for SVG stopColor)
]

TARGET_EXTS = {".tsx", ".ts", ".css", ".js"}

files_changed = 0
total_replacements = 0

# Process frontend/src
for f in FRONTEND_SRC.rglob("*"):
    if f.suffix not in TARGET_EXTS:
        continue
    text = f.read_text(encoding="utf-8")
    new_text = text
    for pat, rep in REPLACEMENTS:
        new_text = re.sub(pat, rep, new_text)
    if new_text != text:
        count = text.count("#FF6500") + text.count("#E05A00")
        f.write_text(new_text, encoding="utf-8")
        files_changed += 1
        total_replacements += count
        print(f"  ✓ {f.relative_to(ROOT)} ({count} replacements)")

# Process tailwind.config.js
tw_text = TAILWIND_CFG.read_text(encoding="utf-8")
tw_new = tw_text
for pat, rep in REPLACEMENTS:
    tw_new = re.sub(pat, rep, tw_new)
# Also update glow-brand shadow to crimson
tw_new = re.sub(r"rgba\(255,\s*101,\s*0,\s*[\d.]+\)", "rgba(185,28,28,0.3)", tw_new)
tw_new = re.sub(r"rgba\(255,\s*101,\s*0", "rgba(185,28,28", tw_new)
if tw_new != tw_text:
    TAILWIND_CFG.write_text(tw_new, encoding="utf-8")
    files_changed += 1
    print(f"  ✓ tailwind.config.js (glow-brand updated)")

print(f"\nDone. {files_changed} files updated.")
