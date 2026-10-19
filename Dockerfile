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

# Container healthcheck probe against FastAPI live endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-8000}/health/live || exit 1

# Seed database on boot if needed, then run high-performance multi-worker ASGI server
CMD ["sh", "-c", "python scripts/seed.py && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_CONCURRENCY:-4} --proxy-headers --forwarded-allow-ips='*'"]
