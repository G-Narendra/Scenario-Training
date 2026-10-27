import os
import shutil
import sys

def sync():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    target = os.path.join(root, "hf_space_clone")

    if not os.path.exists(target):
        print(f"Error: Target directory {target} does not exist.")
        sys.exit(1)

    print(f"=== Synchronizing ScenarioLab to Hugging Face Space: {target} ===")

    # 1. Sync backend
    print("-> Syncing backend...")
    target_backend = os.path.join(target, "backend")
    if os.path.exists(target_backend):
        shutil.rmtree(target_backend)
    shutil.copytree(
        os.path.join(root, "backend"),
        target_backend,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.db", ".pytest_cache", ".coverage")
    )

    # 2. Sync data (scenarios, curriculum)
    print("-> Syncing data...")
    target_data = os.path.join(target, "data")
    if os.path.exists(target_data):
        shutil.rmtree(target_data)
    shutil.copytree(
        os.path.join(root, "data"),
        target_data,
        ignore=shutil.ignore_patterns("*.db", "*.sqlite3")
    )

    # 3. Sync frontend dist
    print("-> Syncing frontend/dist...")
    target_dist = os.path.join(target, "frontend", "dist")
    if os.path.exists(target_dist):
        shutil.rmtree(target_dist)
    shutil.copytree(
        os.path.join(root, "frontend", "dist"),
        target_dist
    )

    # 4. Sync frontend src
    print("-> Syncing frontend/src...")
    target_src = os.path.join(target, "frontend", "src")
    if os.path.exists(target_src):
        shutil.rmtree(target_src)
    shutil.copytree(
        os.path.join(root, "frontend", "src"),
        target_src
    )

    # 5. Sync scripts
    print("-> Syncing scripts...")
    target_scripts = os.path.join(target, "scripts")
    if os.path.exists(target_scripts):
        shutil.rmtree(target_scripts)
    shutil.copytree(
        os.path.join(root, "scripts"),
        target_scripts,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc")
    )

    # 6. Update requirements.txt
    print("-> Updating requirements.txt...")
    req_src = os.path.join(root, "requirements.txt")
    req_dst = os.path.join(target, "requirements.txt")
    with open(req_src, "r", encoding="utf-8") as f:
        src_reqs = set(line.strip() for line in f if line.strip() and not line.startswith("#"))
    with open(req_dst, "r", encoding="utf-8") as f:
        dst_lines = [line.strip() for line in f if line.strip() and not line.startswith("#")]
        dst_reqs = set(dst_lines)
    
    # Merge needed requirements
    extra = ["python-multipart>=0.0.9", "edge-tts>=7.0.0"]
    for req in extra:
        if not any(req.split(">=")[0].split("==")[0] in d for d in dst_reqs):
            dst_lines.append(req)
    with open(req_dst, "w", encoding="utf-8") as f:
        f.write("\n".join(dst_lines) + "\n")

    # 7. Update app.py
    print("-> Updating app.py with chat_router and /api/health...")
    app_py_path = os.path.join(target, "app.py")
    with open(app_py_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Import chat_router if not present
    if "chat_router" not in content:
        content = content.replace(
            "from backend.app.api.auth import router as auth_router",
            "from backend.app.api.auth import router as auth_router\nfrom backend.app.api.chat import router as chat_router"
        )
        content = content.replace(
            "demo_app.include_router(sessions_router)",
            "demo_app.include_router(sessions_router)\ndemo_app.include_router(chat_router)"
        )

    # Add /api/health alias if not present
    if "/api/health" not in content:
        content = content.replace(
            '@demo_app.get("/health", tags=["Ops"])',
            '@demo_app.get("/health", tags=["Ops"])\n@demo_app.get("/api/health", tags=["Ops"])'
        )

    with open(app_py_path, "w", encoding="utf-8") as f:
        f.write(content)

    # 8. Ensure .env points to data/training.db
    env_path = os.path.join(target, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            env_content = f.read()
        env_content = env_content.replace(
            "DATABASE_URL=sqlite+aiosqlite:///./data.db",
            "DATABASE_URL=sqlite+aiosqlite:///./data/training.db"
        )
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(env_content)

    print("=== Sync Complete! ===")

if __name__ == "__main__":
    sync()
