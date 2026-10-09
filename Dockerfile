FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

# Install curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install python dependencies from backend/requirements.txt
COPY backend/requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application backend and seed scripts
COPY backend ./backend
COPY scripts ./scripts

EXPOSE 8000

# Seed database on boot if needed, then run uvicorn on Render's dynamic $PORT
CMD ["sh", "-c", "python scripts/seed.py && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
