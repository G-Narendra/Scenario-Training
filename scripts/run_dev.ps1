Write-Host "Starting development servers..." -ForegroundColor Cyan

& .venv\Scripts\Activate.ps1
$backend = Start-Process -PassThru powershell -ArgumentList "-NoExit", "-Command", "& .venv\Scripts\Activate.ps1; uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

Push-Location frontend
$frontend = Start-Process -PassThru powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Pop-Location

Write-Host "Backend running on PID $($backend.Id)"
Write-Host "Frontend running on PID $($frontend.Id)"
