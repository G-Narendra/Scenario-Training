#!/usr/bin/env bash
set -e

echo "=== Running Flight Simulator Verification Suite ==="

# 1. Verify Virtual Environment
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -f ".venv/bin/activate" ]; then
        source .venv/bin/activate
    else
        echo "ERROR: Virtual environment not found or active!"
        exit 1
    fi
fi

echo "Verifying Python interpreter:"
which python

# 2. Backend Linting
echo "Running Ruff linter..."
python -m ruff check backend/

# 3. Backend Type Checks
echo "Running Mypy type checker..."
python -m mypy --explicit-package-bases backend/app

# 4. Backend Unit & Integration Tests with Coverage
echo "Running Pytest with coverage..."
python -m pytest backend/tests/ -v --cov=backend/app --cov-report=term-missing --cov-fail-under=85

# 5. Frontend Checks & Playwright E2E
echo "Checking frontend and running Playwright E2E tests..."
cd frontend
npm run lint
npm run build
npm run test:e2e
cd ..

echo "=== All checks PASSED successfully! ==="
