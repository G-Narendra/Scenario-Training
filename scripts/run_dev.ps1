$RepoRoot = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
if (Test-Path "C:\Users\naren\AppData\Roaming\nvm\v22.3.0") { $env:PATH = "C:\Users\naren\AppData\Roaming\nvm\v22.3.0;$env:PATH" }
Write-Host "Starting ScenarioLab development servers from: $RepoRoot" -ForegroundColor Cyan

# 1. Start FastAPI Backend on Port 8000
$backendArgs = @(
    "-NoExit",
    "-Command",
    "`$host.UI.RawUI.WindowTitle = 'ScenarioLab Backend (Port 8000)'; `$env:PYTHONPATH = '$RepoRoot'; Set-Location '$RepoRoot'; & '$RepoRoot\.venv\Scripts\python.exe' -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
)
$backend = Start-Process -PassThru powershell -WorkingDirectory $RepoRoot -ArgumentList $backendArgs

# 2. Start Vite Frontend on Port 5173
$frontendArgs = @(
    "-NoExit",
    "-Command",
    "`$host.UI.RawUI.WindowTitle = 'ScenarioLab Frontend (Port 5173)'; Set-Location '$RepoRoot\frontend'; npm run dev"
)
$frontend = Start-Process -PassThru powershell -WorkingDirectory "$RepoRoot\frontend" -ArgumentList $frontendArgs

Write-Host "Backend running on PID $($backend.Id) -> http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Frontend running on PID $($frontend.Id) -> http://127.0.0.1:5173" -ForegroundColor Green
Write-Host "Application is ready at: http://127.0.0.1:5173" -ForegroundColor Yellow
