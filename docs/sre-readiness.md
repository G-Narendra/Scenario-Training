# Production Deployment Guide

## 1. Containerized Deployment via Docker Compose
The system is fully containerized. A production deployment requires Docker Engine 24+ and Docker Compose v2+.

### 1.1 Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure mandatory production variables:
   - `SECRET_KEY`: Set to a strong random 64-character hex secret.
   - `DATABASE_URL`: `postgresql+asyncpg://postgres:<secure-pass>@db:5432/scenario_training`
   - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`: Supply valid API keys for live LLM providers.
   - `CORS_ORIGINS`: Set to your production domain(s).

### 1.2 Starting Services
```bash
docker compose up -d --build
```
This launches:
- `db`: PostgreSQL 16 Alpine with persisted volume `pgdata`.
- `backend`: FastAPI service on port 8000 with healthcheck on `/health`.
- `frontend`: Optimized Nginx production bundle on port 3000.

### 1.3 Running Migrations
Alembic migrations run automatically on container startup or manually via:
```bash
docker compose exec backend alembic upgrade head
```

## 2. Reverse Proxy & TLS Configuration
Put Nginx, Caddy, or Cloudflare in front of the application:
- Terminate TLS on port 443 with valid SSL certificates.
- Proxy `/api` and `/api/sessions/{id}/voice` (WebSocket) to backend:8000.
- Forward headers: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, and WebSocket upgrade headers (`Upgrade`, `Connection`).
