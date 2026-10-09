@echo off
setlocal
set "REPO_ROOT=%~dp0.."
pushd "%REPO_ROOT%"
set "PYTHONPATH=%CD%"
if exist "C:\Users\naren\AppData\Roaming\nvm\v22.3.0" set "PATH=C:\Users\naren\AppData\Roaming\nvm\v22.3.0;%PATH%"

echo =======================================================
echo Starting ScenarioLab Development Servers
echo Repository Root: %CD%
echo =======================================================

start "ScenarioLab Backend (Port 8000)" cmd /k "cd /d "%CD%" && set PYTHONPATH=%CD% && "%CD%\.venv\Scripts\python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

start "ScenarioLab Frontend (Port 5173)" cmd /k "cd /d "%CD%\frontend" && npm run dev"

echo Backend URL:  http://127.0.0.1:8000
echo Frontend URL: http://127.0.0.1:5173
echo =======================================================
popd
