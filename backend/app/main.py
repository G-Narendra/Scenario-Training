import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from backend.app.api.admin_analytics import router as admin_analytics_router
from backend.app.api.admin_cohorts import router as admin_cohorts_router
from backend.app.api.admin_scenarios import router as admin_scenarios_router
from backend.app.api.auth import router as auth_router
from backend.app.api.chat import router as chat_router
from backend.app.api.progress import router as progress_router
from backend.app.api.scenarios import router as scenarios_router
from backend.app.api.sessions import router as sessions_router
from backend.app.api.voice_tts import router as voice_tts_router
from backend.app.config import settings
from backend.app.db.session import engine
from backend.app.voice.ws_handler import router as voice_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Ensure data directory exists for persistent SQLite WAL storage
    os.makedirs("data", exist_ok=True)
    # Ensure all tables exist on startup
    import backend.app.db.models  # noqa: F401
    from backend.app.db.base import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown actions
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.hf\.space|https://huggingface\.co",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_cohorts_router)
app.include_router(scenarios_router)
app.include_router(admin_scenarios_router)
app.include_router(sessions_router)
app.include_router(chat_router)
app.include_router(voice_router)
app.include_router(voice_tts_router)
app.include_router(progress_router)
app.include_router(admin_analytics_router)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    import logging
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    request.state.timings = {}
    start_time = time.perf_counter()

    response = await call_next(request)

    process_time_sec = time.perf_counter() - start_time
    process_time_ms = round(process_time_sec * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time_sec:.4f}"
    response.headers["X-Process-Time-Ms"] = f"{process_time_ms}"

    # RFC Server-Timing header for browser DevTools and telemetry consumers
    timing_parts = []
    custom_timings = getattr(request.state, "timings", {})
    if isinstance(custom_timings, dict):
        for k, v in custom_timings.items():
            timing_parts.append(f"{k};dur={v}")
    timing_parts.append(f"total;dur={process_time_ms}")
    response.headers["Server-Timing"] = ", ".join(timing_parts)

    if process_time_ms > 1500 and not request.url.path.endswith(("/messages", "/ws")):
        logging.getLogger("uvicorn.error").warning(
            f"Slow API path detected: {request.method} {request.url.path} took {process_time_ms}ms"
        )

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' ws: wss: https:; "
        "img-src 'self' data: https: blob:; frame-ancestors 'self' https://huggingface.co https://*.hf.space https://*.vercel.app;"
    )
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "microphone=(self), camera=(), geolocation=()"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logging.getLogger("uvicorn.error").error(
        f"500 on {request.method} {request.url.path}: {exc.__class__.__name__}: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": f"{exc.__class__.__name__}: {str(exc)}",
                "request_id": request_id,
            }
        },
    )


@app.get("/health", tags=["Ops"])
@app.get("/health/live", tags=["Ops"])
@app.get("/api/health", tags=["Ops"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/ready", tags=["Ops"])
@app.get("/health/ready", tags=["Ops"])
async def readiness_check():
    db_status = "ok"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "degraded", "database": db_status},
        )

    return {"status": "ready", "database": db_status, "version": settings.APP_VERSION}


@app.get("/version", tags=["Ops"])
async def version_info():
    return {"version": settings.APP_VERSION, "environment": settings.ENVIRONMENT}


# Mount built frontend SPA static files if present
frontend_dist = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist"
)
if os.path.exists(frontend_dist):
    from fastapi.responses import FileResponse
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    index_file = os.path.join(frontend_dist, "index.html")

    @app.get("/app", include_in_schema=False)
    @app.get("/app/", include_in_schema=False)
    @app.get("/app/{full_path:path}", include_in_schema=False)
    async def serve_app_subpath(full_path: str = ""):
        return FileResponse(index_file, media_type="text/html")

    app.mount("/app", StaticFiles(directory=frontend_dist, html=True), name="app_spa")

    @app.get("/logo_3h_solutions.webp", include_in_schema=False)
    async def serve_logo_direct():
        logo_file = os.path.join(frontend_dist, "logo_3h_solutions.webp")
        if os.path.exists(logo_file):
            return FileResponse(logo_file, media_type="image/webp")
        return JSONResponse(status_code=404, content={"detail": "Logo not found"})

    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="root_spa")
