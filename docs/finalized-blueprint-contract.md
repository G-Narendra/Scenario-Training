# System Requirements & Dependencies

## 1. Prerequisites
- **Python**: 3.11 or 3.12 (standard Python interpreter).
- **Node.js**: 18.x or 20+ (with npm 9+).
- **Git**: 2.x+
- **Docker & Docker Compose** (Optional for local SQLite mode, required for containerized production PostgreSQL deployment).

## 2. Platform Isolation
- All Python libraries are isolated inside the local virtual environment (`.venv`).
- All frontend packages are isolated inside `frontend/node_modules`.
- No global package installations (`pip install -g` or `npm install -g`) are ever used or required.

## 3. Audio & Media Codecs
- Web browser with WebRTC / WebSocket audio streaming support (Chrome 90+, Edge 90+, Firefox 90+, Safari 15+).
- For local audio transcoding fallback if needed, `ffmpeg` can be utilized. When running in Docker, Alpine ffmpeg packages are bundled. If not present on host, the application defaults to native Web Audio API PCM16 streaming.
