$ErrorActionPreference = "Stop"

Write-Host "=== Running Flight Simulator Verification Suite ===" -ForegroundColor Cyan

# 1. Verify Virtual Environment
if (-not $env:VIRTUAL_ENV) {
    if (Test-Path ".venv\Scripts\Activate.ps1") {
        & .venv\Scripts\Activate.ps1
    } else {
        Write-Error "ERROR: Virtual environment not found or active!"
        exit 1
    }
}

Write-Host "Verifying Python interpreter:"
$pythonPath = (Get-Command python).Source
Write-Host "Python: $pythonPath"
if ($pythonPath -notlike "*\.venv\*") {
    Write-Error "ERROR: Active python is not inside .venv!"
    exit 1
}

# 2. Backend Linting
Write-Host "Running Ruff linter..."
python -m ruff check backend/

# 3. Backend Type Checks
Write-Host "Running Mypy type checker..."
python -m mypy --explicit-package-bases backend/app

# 4. Backend Pytest with coverage
Write-Host "Running Pytest with coverage..."
python -m pytest backend/tests/ -v --cov=backend/app --cov-report=term-missing

# 5. Frontend Checks & Playwright E2E
Write-Host "Checking frontend and running Playwright E2E tests..."
Push-Location frontend
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
Pop-Location

Write-Host "=== All verification checks PASSED successfully! ===" -ForegroundColor Green
