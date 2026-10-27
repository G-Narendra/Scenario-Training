import shutil
import os

print("Syncing backend changes to hf_repo...")
shutil.copy2('backend/app/services/access_service.py', 'hf_repo/backend/app/services/access_service.py')
shutil.copy2('backend/app/api/sessions.py', 'hf_repo/backend/app/api/sessions.py')

print("Syncing frontend dist to hf_repo...")
if os.path.exists('frontend/dist'):
    if os.path.exists('hf_repo/frontend/dist'):
        shutil.rmtree('hf_repo/frontend/dist')
    shutil.copytree('frontend/dist', 'hf_repo/frontend/dist')

print("Syncing frontend src to hf_repo...")
if os.path.exists('frontend/src'):
    if os.path.exists('hf_repo/frontend/src'):
        shutil.rmtree('hf_repo/frontend/src')
    shutil.copytree('frontend/src', 'hf_repo/frontend/src')

print("HF Repo synchronization complete!")
