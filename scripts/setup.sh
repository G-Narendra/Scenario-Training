#!/usr/bin/env bash
set -e

echo "=== Setting up Flight Simulator for Difficult Conversations ==="

# 1. Python environment
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Upgrading pip..."
python -m pip install --upgrade pip

echo "Installing backend dependencies..."
python -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt

# 2. Database migrations
echo "Running database migrations..."
alembic -c backend/alembic.ini upgrade head

# 3. Frontend dependencies
echo "Installing frontend dependencies locally..."
cd frontend
npm install
cd ..

# 4. Optional seed data
if [ -f "scripts/seed.py" ]; then
    echo "Seeding initial data..."
    python scripts/seed.py
fi

echo "=== Setup completed successfully! ==="
