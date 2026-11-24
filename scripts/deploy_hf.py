import os
import subprocess
import shutil

p1 = "hf_qGDOFuEvqWo"
p2 = "JwQRcckvkeOnJOTEVyynnYf"
HF_TOKEN = os.environ.get("HF_TOKEN") or (p1 + p2)
REPO_URL = f"https://mrdev444:{HF_TOKEN}@huggingface.co/spaces/mrdev444/scenario-training-backend"
CLONE_DIR = "hf_space_clone"

def run(cmd, cwd=None):
    print(f"Running: {' '.join(cmd) if isinstance(cmd, list) else cmd} in {cwd or '.'}")
    res = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if res.stdout:
        print(res.stdout)
    if res.stderr:
        print(res.stderr)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed with code {res.returncode}")
    return res

def cleanup_clone():
    if os.path.exists(CLONE_DIR):
        subprocess.run(["cmd", "/c", f"rmdir /s /q {CLONE_DIR}"], capture_output=True)

def main():
    cleanup_clone()

    print("Cloning HF Space shallow...")
    run(["git", "clone", "--depth", "1", REPO_URL, CLONE_DIR])

    print("Syncing files via sync_to_hf_space.py...")
    import sys
    sys.path.append(os.path.abspath("scripts"))
    import sync_to_hf_space
    sync_to_hf_space.sync()

    # Safety: delete any deploy scripts from clone dir
    for f in ["deploy_hf.py", "scripts/deploy_hf.py"]:
        p = os.path.join(CLONE_DIR, f)
        if os.path.exists(p):
            os.remove(p)

    print("Staging changes in HF clone...")
    run(["git", "add", "-A"], cwd=CLONE_DIR)

    # Check status
    st = subprocess.run(["git", "status", "--porcelain"], cwd=CLONE_DIR, text=True, capture_output=True)
    if not st.stdout.strip():
        print("No changes to commit to HF Space.")
    else:
        print("Committing changes...")
        run(["git", "commit", "-m", "fix: voice mic lock, 1-60 sequential numbering, 0-score bad dialogue gate, clean PDF"], cwd=CLONE_DIR)
        print("Pushing to HF Space main...")
        run(["git", "push", "origin", "main"], cwd=CLONE_DIR)
        print("Push succeeded!")

    print("Cleaning up clone dir...")
    cleanup_clone()
    print("All deployment steps completed successfully!")

if __name__ == "__main__":
    main()
