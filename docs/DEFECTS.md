# Defect Log & Resolutions

This log records notable defects identified, their root causes, and regression tests added.

| Defect ID | Phase | Description | Root Cause | Resolution & Regression Test |
|---|---|---|---|---|
| D-001 | Phase 0 | Global python invocation blocked in sandboxed subshell | System uses Python 3.12 via custom path; PATH not inherited in isolated powershell invocation without explicit venv activation | Created project `.venv` and verified `.venv\Scripts\Activate.ps1` with verified test runner |
