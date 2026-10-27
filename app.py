import os
import sys
import subprocess
import logging
import time

# Ensure root directory is in sys.path so 'backend' package imports work cleanly
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Run seed script on boot to ensure SQLite / PostgreSQL schema & records exist
try:
    seed_script = os.path.join(ROOT_DIR, "scripts", "seed.py")
    if os.path.exists(seed_script):
        subprocess.run([sys.executable, seed_script], check=False)
except Exception as e:
    logging.warning(f"Seed script execution skipped or encountered an error: {e}")

# ZeroGPU integration for Hugging Face Spaces
try:
    import spaces
except ImportError:
    class _MockSpaces:
        def GPU(self, fn=None, **kwargs):
            if fn is not None:
                return fn
            def decorator(f):
                return f
            return decorator
    spaces = _MockSpaces()

try:
    import torch
except ImportError:
    torch = None

import gradio as gr
from fastapi import Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

# Import database and all enterprise routers
from backend.app.config import settings
from backend.app.db.session import engine
from backend.app.api.admin_analytics import router as admin_analytics_router
from backend.app.api.admin_cohorts import router as admin_cohorts_router
from backend.app.api.admin_scenarios import router as admin_scenarios_router
from backend.app.api.auth import router as auth_router
from backend.app.api.chat import router as chat_router
from backend.app.api.progress import router as progress_router
from backend.app.api.scenarios import router as scenarios_router
from backend.app.api.sessions import router as sessions_router
from backend.app.api.voice_tts import router as voice_tts_router
from backend.app.voice.ws_handler import router as voice_router

# Top-level ZeroGPU hook required by Hugging Face ZeroGPU supervisor
@spaces.GPU
def probe_zerogpu(n: float = 1.0) -> str:
    """ZeroGPU accelerator hook required by Hugging Face ZeroGPU runtime supervisor."""
    try:
        if torch is not None and torch.cuda.is_available():
            zero = torch.Tensor([0]).cuda()
            return f"ZeroGPU Accelerator Active (Device: {zero.device}, Output Tensor: {zero + n})"
        return "ZeroGPU Node Initialized (Standard Execution Mode)"
    except Exception as exc:
        return f"ZeroGPU Status: {exc}"

# Gradio Interface registered with ZeroGPU hook
demo = gr.Interface(
    fn=probe_zerogpu,
    inputs=gr.Number(value=1.0, label="Vector Dimension Scalar"),
    outputs=gr.Text(label="Hardware State"),
    title="3H Solutions Executive Scenario Training Platform — ZeroGPU Node",
    description="Enterprise scenario training engine with NVIDIA NIM sub-second inference."
)

dist_dir = os.path.join(ROOT_DIR, "frontend", "dist")
assets_dir = os.path.join(dist_dir, "assets")
index_file = os.path.join(dist_dir, "index.html")

# Launch demo using demo.launch() so ZeroGPU supervisor binds to it on port 7860
demo_app, _, _ = demo.launch(
    server_name="0.0.0.0",
    server_port=7860,
    ssr_mode=False,
    prevent_thread_lock=True
)

# Record baseline route count prior to adding application endpoints
before_len = len(demo_app.router.routes)

# 1. Include all enterprise FastAPI routers onto demo_app
demo_app.include_router(auth_router)
demo_app.include_router(admin_cohorts_router)
demo_app.include_router(scenarios_router)
demo_app.include_router(admin_scenarios_router)
demo_app.include_router(sessions_router)
demo_app.include_router(chat_router)
demo_app.include_router(voice_router)
demo_app.include_router(voice_tts_router)
demo_app.include_router(progress_router)
demo_app.include_router(admin_analytics_router)

# 2. Add health and readiness check probes
@demo_app.get("/health", tags=["Ops"])
@demo_app.get("/health/live", tags=["Ops"])
@demo_app.get("/api/health", tags=["Ops"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }

@demo_app.get("/ready", tags=["Ops"])
@demo_app.get("/health/ready", tags=["Ops"])
async def readiness_check():
    db_status = "ok"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": db_status},
        )
    return {"status": "ready", "database": db_status, "version": settings.APP_VERSION}

# 3. Mount static assets and SPA routes
if os.path.exists(dist_dir):
    if os.path.exists(assets_dir):
        demo_app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    logo_file = os.path.join(dist_dir, "logo_3h_solutions.webp")
    if os.path.exists(logo_file):
        @demo_app.get("/logo_3h_solutions.webp", include_in_schema=False)
        async def serve_logo():
            return FileResponse(logo_file, media_type="image/webp")

    @demo_app.get("/", include_in_schema=False)
    @demo_app.get("/app", include_in_schema=False)
    @demo_app.get("/app/", include_in_schema=False)
    @demo_app.get("/app/{full_path:path}", include_in_schema=False)
    async def serve_app_spa(full_path: str = ""):
        resp = FileResponse(index_file, media_type="text/html")
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "SAMEORIGIN"
        resp.headers["X-XSS-Protection"] = "1; mode=block"
        resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        resp.headers["Permissions-Policy"] = "microphone=(self), camera=(), geolocation=()"
        return resp

# Move ALL newly registered API, health, and SPA routes ahead of Gradio's internal catch-all routes
new_routes = demo_app.router.routes[before_len:]
demo_app.router.routes = new_routes + demo_app.router.routes[:before_len]

logging.info("3H Solutions Scenario Training Engine initialized successfully on port 7860.")

if __name__ == "__main__":
    while True:
        time.sleep(3600)
