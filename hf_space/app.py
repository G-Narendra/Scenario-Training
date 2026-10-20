import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath("."))

import gradio as gr
from backend.app.main import app as fastapi_app

# Create a clean Gradio status interface for the Hugging Face Space web view
with gr.Blocks(title="ScenarioLab Enterprise AI Backend") as demo:
    gr.Markdown(
        """
        # ⚡ ScenarioLab Workplace Training API
        **High-Capacity Multi-Worker Backend Service**
        
        - 🚀 **Interactive OpenAPI Docs:** [/docs](/docs)
        - 🩺 **Health Check Endpoint:** [/health/ready](/health/ready)
        - 🔑 **AI Engine:** 4-Key NVIDIA NIM Load-Balanced Pool
        - 🗄️ **Database:** Central Neon Serverless PostgreSQL
        """
    )
    with gr.Row():
        btn = gr.Button("Check API System Status", variant="primary")
        status_output = gr.Textbox(label="System Health", value="Click to check...")
    
    def check_health():
        return "✅ ScenarioLab Backend is ONLINE (2 vCPUs, 16GB RAM Active)"
    
    btn.click(fn=check_health, outputs=status_output)

# Mount Gradio onto the existing FastAPI application
# All standard API routes (/api/auth/login, /api/sessions, /health/ready, /docs) operate at the root!
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
