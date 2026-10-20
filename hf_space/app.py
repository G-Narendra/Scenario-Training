import os
import sys

# Ensure project root is available in sys.path
sys.path.insert(0, os.path.abspath("."))

import gradio as gr
from backend.app.main import app

# Minimal Gradio interface so Hugging Face Spaces recognizes it as a valid Gradio SDK Space
with gr.Blocks(title="ScenarioLab API Node") as demo:
    gr.Markdown("# 🚀 ScenarioLab Enterprise API Node")
    gr.Markdown(
        "High-performance FastAPI simulation backend powered by Neon PostgreSQL "
        "and 4-Key NVIDIA NIM multi-account load balancing."
    )
    with gr.Row():
        gr.Textbox(value="Online & Healthy", label="System Status", interactive=False)
        gr.Textbox(value="2 Dedicated vCPUs · 16GB RAM", label="Hardware Tier", interactive=False)
    gr.Markdown("All REST endpoints and SSE streams are active under `/api` and `/health`.")

# Mount Gradio onto our FastAPI application
# This exposes both the Gradio UI at / and all our FastAPI routes (/api/*, /docs, /health/*)
app = gr.mount_gradio_app(app, demo, path="/")
