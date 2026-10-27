# ==============================================================================
# Stage 1: Build Frontend Single Page Application (SPA)
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Unified Production Python ASGI Service (HuggingFace Spaces - Port 7860)
# ==============================================================================
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    PORT=7860 \
    DATABASE_URL="sqlite+aiosqlite:///./data/training.db"

# Install curl for healthcheck probes
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install audited Python dependencies
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy application backend, seed scripts, and seed data
COPY backend ./backend
COPY scripts ./scripts
COPY data ./data

# Copy built frontend assets directly into frontend/dist for FastAPI StaticFiles serving
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Hugging Face Spaces runs as user 1000 with persistent /app/data permissions
RUN useradd -m -u 1000 user && \
    mkdir -p /app/data && \
    chown -R user:user /app
USER user

# Hugging Face Spaces default port
EXPOSE 7860

# Healthcheck probe against FastAPI live endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:7860/health/live || exit 1

# Seed database on boot if needed, then run multi-worker ASGI server on port 7860
CMD ["sh", "-c", "python scripts/seed.py && uvicorn backend.app.main:app --host 0.0.0.0 --port 7860 --workers 4 --proxy-headers --forwarded-allow-ips='*'"]
