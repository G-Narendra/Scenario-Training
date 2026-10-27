import os
import sys
import subprocess
import logging

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Run seed script on boot
try:
    seed_script = os.path.join(ROOT_DIR, "scripts", "seed.py")
    if os.path.exists(seed_script):
        subprocess.run([sys.executable, seed_script], check=False)
except Exception as e:
    logging.warning(f"Seed script execution skipped or encountered an error: {e}")

# ZeroGPU hook
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
from backend.app.main import app as fastapi_app

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

demo = gr.Interface(
    fn=probe_zerogpu,
    inputs=gr.Number(value=1.0, label="Vector Dimension Scalar"),
    outputs=gr.Text(label="Hardware State"),
    title="3H Solutions Executive Scenario Training Platform — ZeroGPU Node",
    description="Enterprise scenario training engine with NVIDIA NIM sub-second inference."
)

# Mount Gradio dashboard at /dashboard so ZeroGPU is bound, while FastAPI serves / and /api/*
app = gr.mount_gradio_app(fastapi_app, demo, path="/dashboard")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
