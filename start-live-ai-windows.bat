@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Dependencies are missing. Run setup-live-ai-windows.bat first.
  pause
  exit /b 1
)
if not exist .env (
  echo .env is missing. Run setup-live-ai-windows.bat first.
  pause
  exit /b 1
)
findstr /c:"replace_with_your_openai_api_key" .env >nul
if not errorlevel 1 (
  echo Add your real OPENAI_API_KEY to .env before starting.
  start notepad .env
  pause
  exit /b 1
)
start http://localhost:8765
npm start
pause
