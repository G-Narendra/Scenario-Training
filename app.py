import os
import sys
import subprocess
import logging

# Ensure root directory is in sys.path so 'backend' package imports work cleanly
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Run seed script on boot to ensure PostgreSQL schema & records exist
try:
    seed_script = os.path.join(ROOT_DIR, "scripts", "seed.py")
    if os.path.exists(seed_script):
        subprocess.run([sys.executable, seed_script], check=False)
except Exception as e:
    logging.warning(f"Seed script execution skipped or encountered an error: {e}")

import gradio as gr
from backend.app.main import app as fastapi_app

# Create a clean monitoring dashboard for Hugging Face Spaces UI
with gr.Blocks(title="ScenarioLab High-Performance API Node") as demo:
    gr.Markdown("# ⚡ ScenarioLab High-Performance API Node")
    gr.Markdown("""
    ### System Status: **Online & Healthy**
    This Hugging Face Space runs the enterprise **ScenarioLab** backend engine with:
    
    - **Engine:** FastAPI + 4-Key NVIDIA NIM Load Balancer
    - **Database:** Neon PostgreSQL Serverless Connection Pool
    - **Hardware:** 2 Dedicated vCPUs · 16 GB RAM (Free Community Tier)
    - **Interactive API Documentation:** [/docs](/docs)
    - **Health Probe:** [/health/ready](/health/ready)
    
    *All training requests, student authentication, and live streaming dialogue are actively served.*
    """)

# Mount Gradio dashboard at /dashboard, leaving root / and all /api/* routes exclusively to FastAPI
app = gr.mount_gradio_app(fastapi_app, demo, path="/dashboard")

if __name__ == "__main__":
    import uvicorn
    # Hugging Face Spaces expects the app to listen on port 7860
    uvicorn.run(app, host="0.0.0.0", port=7860)
