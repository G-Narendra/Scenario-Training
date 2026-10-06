Write-Host "=== Setting up Flight Simulator for Difficult Conversations ===" -ForegroundColor Cyan

# 1. Python environment
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python virtual environment..."
    py -m venv .venv
}

Write-Host "Activating virtual environment..."
& .venv\Scripts\Activate.ps1

Write-Host "Upgrading pip..."
python -m pip install --upgrade pip

Write-Host "Installing backend dependencies..."
python -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt

# 2. Database migrations
Write-Host "Running database migrations..."
alembic -c backend/alembic.ini upgrade head

# 3. Frontend dependencies
Write-Host "Installing frontend dependencies locally..."
Push-Location frontend
npm install
Pop-Location

# 4. Optional seed data
if (Test-Path "scripts/seed.py") {
    Write-Host "Seeding initial data..."
    python scripts/seed.py
}

Write-Host "=== Setup completed successfully! ===" -ForegroundColor Green
