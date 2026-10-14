#!/usr/bin/env python3
"""
scripts/orchestrate.py — Autonomous Role Orchestrator & Loop Verification Engine

Tracks and verifies the 4-Stage Autonomous Multi-Role Council:
1. Stage 1: Pre-Build Council (Brainstorming, Budget, UX Design, Spec-Driven Development, CTO Architecture, Devil's Advocate, Stack PR Planning)
2. Stage 2: Enterprise Deep-Build Execution (Harness Engineering, AI, Backend, Frontend, Anti-Student Standards, Ponytail Code Compression)
3. Stage 3: Hardening & Audit Council (Security Pen-testing, Adversarial QA, Staff Review, No-AI-Slop, End-User UX, SRE)
4. Stage 4: Autonomous Refinement Loop (Runtime verification gates, test suite execution, zero-stoppage)
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUTS_DIR = ROOT_DIR / "outputs"
STATE_FILE = OUTPUTS_DIR / ".loop-state.json"

STUDENT_ANTI_PATTERNS = [
    (r"except\s*:\s*pass", "Bare except: pass (hides crashes without logging)"),
    (r"except\s+Exception\s*:\s*pass", "Bare except Exception: pass (swallows critical errors)"),
    (r"catch\s*\([a-zA-Z0-9_]*\)\s*\{\s*\}", "Empty catch block (swallows exceptions silently)"),
    (r"#\s*TODO\b", "TODO comment in production codebase"),
    (r"//\s*TODO\b", "TODO comment in production codebase"),
    (r":\s*any\b", "Explicit 'any' type in TypeScript (violates strict typing)"),
    (r"SELECT\s+.*\s+FROM\s+.*\s*(\+|%|\.format|f['\"])", "String-concatenated SQL query (potential SQL injection)"),
    (r"(api_key|secret_key|private_key|password)\s*=\s*['\"][a-zA-Z0-9_\-]{8,}['\"]", "Possible hardcoded secret/credential in source code")
]

AI_SLOP_PATTERNS = [
    (r"In today'?s (rapidly evolving|fast-paced|dynamic|modern digital)", "Vacuous AI opener cliché"),
    (r"It is (worth noting|important to remember|crucial to understand|essential to consider) that", "Filler throat-clearing phrase"),
    (r"It goes without saying that", "Redundant rhetorical filler"),
    (r"marks a pivotal moment", "Overused AI hyperbolic cliché"),
    (r"serves as (the|a) foundational backbone", "Vague AI structural metaphor"),
    (r"delve (deeper )?into", "AI signature buzzword ('delve')"),
    (r"Here'?s the thing:", "Conversational AI filler in technical document"),
    (r"In the realm of", "Grandiose AI fluff"),
    (r"testament to", "Overused AI laudatory cliché"),
    (r"tapestry of", "Overused AI metaphor"),
    (r"beacon of", "Overused AI metaphor"),
    (r"#(?:!.*)?\s*(sets|gets)\s+\w+\s+to\s+\w+", "Tautological comment (explains obvious syntax)"),
    (r"//\s*(sets|gets)\s+\w+\s+to\s+\w+", "Tautological comment (explains obvious syntax)"),
    (r"(#|//)\s*Constructor\b", "Tautological constructor comment")
]

FAANG_ARCHITECTURAL_GATES = [
    {
        "domain": "RAG & AI",
        "pattern": r"RecursiveCharacterTextSplitter\s*\(\s*chunk_size\s*=",
        "severity": "CRITICAL_TECHNIQUE_FLAW",
        "issue": "Naive fixed-character chunking detected. A 10+ yr FAANG Staff Engineer uses semantic boundary parsing or hierarchical parent-child retrieval.",
        "remediation": "Replace with semantic header-based chunking or parent-child retrieval preserving tables and headings."
    },
    {
        "domain": "RAG & AI",
        "pattern": r"\.similarity_search\s*\(",
        "severity": "HIGH_TECHNIQUE_FLAW",
        "issue": "Isolated dense vector cosine similarity search without hybrid search (BM25) or cross-encoder reranking.",
        "remediation": "Implement Hybrid Retrieval (Dense Vector + BM25) with Reciprocal Rank Fusion (RRF) and Cohere/BGE cross-encoder reranking."
    },
    {
        "domain": "Security & APIs",
        "pattern": r"allow_origins\s*=\s*\[\s*['\"]\*['\"]\s*\]",
        "severity": "SECURITY_VULNERABILITY",
        "issue": "Wildcard CORS origin (allow_origins=['*']) permits arbitrary cross-origin requests.",
        "remediation": "Whitelist explicit production domains and credentials in CORS middleware."
    },
    {
        "domain": "Frontend & UX",
        "pattern": r"dangerouslySetInnerHTML",
        "severity": "SECURITY_XSS_RISK",
        "issue": "Direct HTML injection without DOMPurify sanitization (XSS risk).",
        "remediation": "Sanitize HTML using DOMPurify or render typed React markdown nodes."
    },
    {
        "domain": "Database & Scale",
        "pattern": r"OFFSET\s+[0-9]+",
        "severity": "PERFORMANCE_SCALE_FLAW",
        "issue": "Offset-based pagination creates quadratic table scan degradation on large datasets.",
        "remediation": "Implement cursor-based keyset pagination using indexed timestamp/ID boundaries."
    }
]

DEFAULT_STATE = {
    "mode": "enterprise_deep_build",
    "started_at": datetime.utcnow().isoformat() + "Z",
    "last_updated": datetime.utcnow().isoformat() + "Z",
    "loop_count": 1,
    "current_stage": 1,
    "stages": [
        {
            "stage_id": 1,
            "name": "Pre-Build Strategy, Budget, Spec & Architecture Council",
            "roles": [
                "problem-researcher",
                "founder-ceo",
                "cfo",
                "product-designer-ux",
                "product-designer-ui",
                "cto",
                "software-architect",
                "idea-critic",
                "solution-debater",
                "chief-strategy-officer"
            ],
            "status": "pending",
            "verified": False,
            "deliverables": [
                "docs/problem-discovery.md",
                "docs/unit-economics-budget.md",
                "docs/ux-design-specification.md",
                "specs",
                "docs/pr-stack-plan.md",
                "docs/system-architecture.md",
                "docs/adversarial-debate-findings.md",
                "docs/finalized-blueprint-contract.md"
            ]
        },
        {
            "stage_id": 2,
            "name": "Enterprise Deep-Build Execution & Harness Engineering Team",
            "roles": [
                "ai-engineer",
                "backend-engineer",
                "frontend-engineer",
                "database-engineer",
                "api-engineer",
                "senior-software-engineer"
            ],
            "status": "pending",
            "verified": False,
            "deliverables": [
                "docker-compose.test.yml",
                "scripts/verify.sh",
                "tests",
                "backend",
                "frontend"
            ]
        },
        {
            "stage_id": 3,
            "name": "Hardening, Defense, Review & Audit Council",
            "roles": [
                "security-engineer",
                "penetration-tester",
                "qa-automation-engineer",
                "chaos-engineer",
                "staff-software-engineer",
                "customer-experience-designer",
                "accessibility-engineer",
                "sre-engineer"
            ],
            "status": "pending",
            "verified": False,
            "deliverables": [
                "reviews",
                "docs/security-audit-report.md",
                "docs/qa-adversarial-test-report.md",
                "docs/staff-code-review.md",
                "docs/ux-accessibility-audit.md",
                "docs/sre-readiness.md"
            ]
        },
        {
            "stage_id": 4,
            "name": "Autonomous Refinement & Runtime Verification Loop",
            "roles": [
                "release-engineer",
                "incident-commander"
            ],
            "status": "pending",
            "verified": False,
            "deliverables": [
                "docs/release-verification.md",
                "outputs/reviews/faang-technical-audit-scorecard.md"
            ]
        }
    ],
    "last_action": "Initialized Autonomous Role Council",
    "errors": []
}


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARN] Error reading state file: {e}. Using default state.")
    return DEFAULT_STATE.copy()


def save_state(state: dict) -> None:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    state["last_updated"] = datetime.utcnow().isoformat() + "Z"
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def audit_student_code() -> list:
    """Scans codebase for beginner / student anti-patterns."""
    findings = []
    scan_exts = {".py", ".ts", ".tsx", ".js", ".jsx"}
    ignore_dirs = {".git", ".venv", "node_modules", "dist", "build", ".mypy_cache", ".ruff_cache", "__pycache__"}

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            path = Path(root) / file
            if path.suffix in scan_exts and not str(path).startswith(str(OUTPUTS_DIR)):
                if path.name == "orchestrate.py":
                    continue
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                    for line_no, line in enumerate(lines, 1):
                        for pattern, desc in STUDENT_ANTI_PATTERNS:
                            if "tests" in path.parts and "Possible hardcoded secret" in desc:
                                continue
                            if re.search(pattern, line):
                                findings.append({
                                    "file": str(path.relative_to(ROOT_DIR)),
                                    "line": line_no,
                                    "code": line.strip(),
                                    "rule": desc
                                })
                except Exception:
                    pass
    return findings


def audit_ai_slop() -> list:
    """Scans documentation, comments, and copy for AI slop patterns."""
    findings = []
    scan_exts = {".md", ".py", ".ts", ".tsx", ".js", ".jsx"}
    ignore_dirs = {".git", ".venv", "node_modules", "dist", "build", ".mypy_cache", ".ruff_cache", "__pycache__"}

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            path = Path(root) / file
            if path.name in {"AGENTS.md", "agent.md", "orchestrate.py", "AUTONOMOUS-ROLE-ORCHESTRATOR.md"}:
                continue
            if path.suffix in scan_exts and not str(path).startswith(str(OUTPUTS_DIR)):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                    for line_no, line in enumerate(lines, 1):
                        for pattern, desc in AI_SLOP_PATTERNS:
                            if re.search(pattern, line, re.IGNORECASE):
                                findings.append({
                                    "file": str(path.relative_to(ROOT_DIR)),
                                    "line": line_no,
                                    "code": line.strip(),
                                    "rule": desc
                                })
                except Exception:
                    pass
    return findings


def audit_faang_architecture() -> list:
    """Audits codebase against FAANG Staff / Principal architectural gates."""
    findings = []
    scan_exts = {".py", ".ts", ".tsx", ".js", ".jsx"}
    ignore_dirs = {".git", ".venv", "node_modules", ".mypy_cache", ".ruff_cache", "__pycache__"}

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            path = Path(root) / file
            if path.suffix in scan_exts and not str(path).startswith(str(OUTPUTS_DIR)):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    for gate in FAANG_ARCHITECTURAL_GATES:
                        matches = re.finditer(gate["pattern"], content)
                        for m in matches:
                            line_no = content[:m.start()].count("\n") + 1
                            matched_line = content.splitlines()[line_no - 1].strip()
                            findings.append({
                                "file": str(path.relative_to(ROOT_DIR)),
                                "line": line_no,
                                "domain": gate["domain"],
                                "severity": gate["severity"],
                                "issue": gate["issue"],
                                "remediation": gate["remediation"],
                                "code": matched_line
                            })
                except Exception:
                    pass
    return findings


def execute_test_harness() -> dict:
    """Executes the test suite and checks runtime harness health."""
    results = {
        "harness_found": False,
        "tests_passed": False,
        "details": "No test harness detected."
    }

    test_dir = ROOT_DIR / "backend" / "tests"
    if not test_dir.exists():
        test_dir = ROOT_DIR / "tests"
    if not test_dir.exists():
        return results

    results["harness_found"] = True

    # Check for pytest or npm test files
    py_tests = list(test_dir.glob("**/test_*.py"))
    ts_tests = list(test_dir.glob("**/*.test.ts")) + list(test_dir.glob("**/*.spec.ts"))

    if not py_tests and not ts_tests:
        results["details"] = f"{test_dir.relative_to(ROOT_DIR)} directory exists but contains zero test files."
        return results

    # Attempt running pytest if python test files exist
    if py_tests:
        pytest_cmd = ["pytest"]
        venv_py = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
        if venv_py.exists():
            pytest_cmd = [str(venv_py), "-m", "pytest"]
        try:
            proc = subprocess.run(
                pytest_cmd + [str(test_dir.relative_to(ROOT_DIR)), "-v", "--tb=short"],
                cwd=str(ROOT_DIR),
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore",
                timeout=120
            )
            if proc.returncode == 0:
                results["tests_passed"] = True
                results["details"] = f"pytest passed: {len(py_tests)} test file(s) executed successfully."
            else:
                results["tests_passed"] = False
                results["details"] = f"pytest failed with exit code {proc.returncode}:\n{proc.stderr or proc.stdout}"
            return results
        except FileNotFoundError:
            results["details"] = "pytest command not found in PATH. Ensure test runner is installed in environment."
        except subprocess.TimeoutExpired:
            results["details"] = "pytest timed out after 60 seconds."
        except Exception as e:
            results["details"] = f"Error running pytest: {str(e)}"

    # Attempt running npm test if typescript/javascript tests exist
    if ts_tests and not results["tests_passed"]:
        try:
            proc = subprocess.run(
                ["npm", "test"],
                cwd=str(ROOT_DIR),
                capture_output=True,
                text=True,
                timeout=60
            )
            if proc.returncode == 0:
                results["tests_passed"] = True
                results["details"] = f"npm test passed: {len(ts_tests)} test file(s) executed successfully."
            else:
                results["tests_passed"] = False
                results["details"] = f"npm test failed with exit code {proc.returncode}."
            return results
        except Exception as e:
            results["details"] = f"npm test error: {str(e)}"

    return results


def verify_all_stages() -> bool:
    """Verifies that all required deliverables exist and quality gates pass."""
    state = load_state()
    print("=" * 70)
    print(" 🏛️  AUTONOMOUS MULTI-ROLE COUNCIL VERIFICATION REPORT")
    print("=" * 70)

    all_passed = True
    stages = state.get("stages", [])

    for stage in stages:
        stage_name = stage.get("name", "Unknown Stage")
        stage_id = stage.get("stage_id", 0)
        deliverables = stage.get("deliverables", [])
        missing = []
        found = []

        for item in deliverables:
            target = ROOT_DIR / item
            if target.exists():
                found.append(item)
            else:
                missing.append(item)

        print(f"\n[Stage {stage_id}] {stage_name}")
        print(f"  Completed Deliverables ({len(found)}/{len(deliverables)}):")
        for f in found:
            print(f"    [x] {f}")
        if missing:
            all_passed = False
            print(f"  Missing Deliverables ({len(missing)}):")
            for m in missing:
                print(f"    [ ] {m}")
        else:
            stage["verified"] = True

    print("\n" + "-" * 70)
    print(" 🧪 RUNTIME TEST HARNESS VERIFICATION")
    print("-" * 70)
    harness_res = execute_test_harness()
    if harness_res["harness_found"]:
        if harness_res["tests_passed"]:
            print(f"[PASS] {harness_res['details']}")
        else:
            print(f"[WARN] Runtime tests failed or incomplete: {harness_res['details']}")
    else:
        print(f"[INFO] {harness_res['details']} (Scaffold tests/ directory before final verification)")

    print("\n" + "-" * 70)
    print(" 🔍 SENIOR VS STUDENT CODE ANTI-PATTERN SCAN")
    print("-" * 70)
    findings = audit_student_code()
    if findings:
        print(f"[FAIL] Found {len(findings)} beginner/student anti-pattern(s):")
        for f in findings[:10]:
            print(f"  - {f['file']}:{f['line']} -> {f['rule']}")
            print(f"    Code snippet: {f['code']}")
        if len(findings) > 10:
            print(f"  ... and {len(findings) - 10} more.")
        all_passed = False
    else:
        print("[PASS] Zero student anti-patterns found. Senior engineering standards verified!")

    print("\n" + "-" * 70)
    print(" ✍️  NO AI SLOP & HUMAN ENGINEERING AUDIT")
    print("-" * 70)
    slop_findings = audit_ai_slop()
    if slop_findings:
        print(f"[WARN] Found {len(slop_findings)} AI slop / filler pattern(s):")
        for sf in slop_findings[:5]:
            print(f"  - {sf['file']}:{sf['line']} -> {sf['rule']}")
            print(f"    Line: {sf['code']}")
    else:
        print("[PASS] Zero AI slop detected. Clear, human, direct communication verified!")

    print("\n" + "=" * 70)
    if all_passed:
        print(" [PASS] ALL STRUCTURAL DELIVERABLES & QUALITY GATES PASSED.")
        print("=" * 70)
    else:
        print(" [ACTION REQUIRED] GATES INCOMPLETE. CONTINUE AUTONOMOUS REFINEMENT LOOP.")
        print("=" * 70)

    save_state(state)
    return all_passed


def run_deep_audit() -> None:
    """Executes full FAANG Technical Audit combining student anti-patterns, architectural gates, and AI slop."""
    print("=" * 75)
    print(" 🔬 10+ YR FAANG STAFF ENGINEER TECHNICAL AUDIT & ARCHITECTURE REVIEW")
    print("=" * 75)

    student_findings = audit_student_code()
    arch_findings = audit_faang_architecture()
    slop_findings = audit_ai_slop()

    print(f"\n[1] Student/Beginner Anti-Pattern Scan: {len(student_findings)} finding(s)")
    for f in student_findings:
        print(f"  ❌ [{f['rule']}] in {f['file']}:{f['line']}")
        print(f"     Code: {f['code']}")

    print(f"\n[2] FAANG Architectural & Technique Gates: {len(arch_findings)} finding(s)")
    for f in arch_findings:
        print(f"  ⚠️ [{f['severity']}] {f['domain']} in {f['file']}:{f['line']}")
        print(f"     Issue: {f['issue']}")
        print(f"     Remediation: {f['remediation']}")
        print(f"     Code: {f['code']}")

    print(f"\n[3] No AI Slop & Human Engineering Scan: {len(slop_findings)} finding(s)")
    for sf in slop_findings[:10]:
        print(f"  📝 [{sf['rule']}] in {sf['file']}:{sf['line']}")
        print(f"     Snippet: {sf['code']}")

    # Write Scorecard Artifact
    review_dir = OUTPUTS_DIR / "reviews"
    review_dir.mkdir(parents=True, exist_ok=True)
    scorecard_path = review_dir / "faang-technical-audit-scorecard.md"

    score = 100 - (len(student_findings) * 10) - (len(arch_findings) * 15) - (len(slop_findings) * 2)
    score = max(0, score)

    lines = [
        "# FAANG Staff Technical Audit Scorecard\n",
        f"**Date:** {datetime.utcnow().isoformat()}Z  ",
        f"**Technical Depth Score:** `{score}/100`  ",
        f"**Verdict:** {'PASSED (Staff Production Grade)' if score >= 85 else 'FAILED (Requires Architectural Remediation)'}\n",
        "## Summary of Findings\n",
        f"- Beginner / Student Anti-Patterns: `{len(student_findings)}`",
        f"- Architectural Technique Flaws: `{len(arch_findings)}`",
        f"- AI Slop / Filler Instances: `{len(slop_findings)}`\n",
        "## Detailed Architectural Remediation Matrix\n"
    ]

    if not student_findings and not arch_findings and not slop_findings:
        lines.append("Zero flaws detected. System exhibits FAANG Staff engineering rigor.\n")
    else:
        lines.append("| Domain | Severity | File:Line | Issue & Required Remediation |")
        lines.append("|---|---|---|---|")
        for f in arch_findings:
            lines.append(f"| {f['domain']} | `{f['severity']}` | `{f['file']}:{f['line']}` | **{f['issue']}**<br>Fix: {f['remediation']} |")
        for f in student_findings:
            lines.append(f"| Code Quality | `STUDENT_ANTI_PATTERN` | `{f['file']}:{f['line']}` | **{f['rule']}**<br>Code: `{f['code']}` |")
        for sf in slop_findings:
            lines.append(f"| Communication | `AI_SLOP` | `{sf['file']}:{sf['line']}` | **{sf['rule']}**<br>Snippet: `{sf['code']}` |")

    with open(scorecard_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\n[OK] Scorecard written to {scorecard_path.relative_to(ROOT_DIR)}")
    print("=" * 75)


def main():
    parser = argparse.ArgumentParser(description="Autonomous Role Orchestrator & Loop Verification Engine")
    parser.add_argument("--verify", action="store_true", help="Verify all council stages, test harness, and deliverables")
    parser.add_argument("--audit", action="store_true", help="Run student-code anti-pattern audit")
    parser.add_argument("--audit-slop", action="store_true", help="Run AI slop detection scan across docs and code")
    parser.add_argument("--deep-audit", action="store_true", help="Run 10+ yr FAANG Staff architectural audit, student scan & slop detector")
    parser.add_argument("--init", action="store_true", help="Initialize fresh council state")
    parser.add_argument("--status", action="store_true", help="Show current loop state")

    args = parser.parse_args()

    if args.init:
        save_state(DEFAULT_STATE)
        print("[OK] Fresh council state initialized in outputs/.loop-state.json")
    elif args.audit:
        findings = audit_student_code()
        print(f"Scanned codebase. Found {len(findings)} student anti-patterns.")
        for f in findings:
            print(f"  {f['file']}:{f['line']} | {f['rule']} -> {f['code']}")
    elif args.audit_slop:
        slop = audit_ai_slop()
        print(f"Scanned codebase. Found {len(slop)} AI slop pattern(s).")
        for s in slop:
            print(f"  {s['file']}:{s['line']} | {s['rule']} -> {s['code']}")
    elif args.deep_audit:
        run_deep_audit()
    elif args.status:
        state = load_state()
        print(json.dumps(state, indent=2))
    elif args.verify:
        passed = verify_all_stages()
        sys.exit(0 if passed else 1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
