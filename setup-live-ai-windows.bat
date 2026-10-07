@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the current LTS version from nodejs.org, then run this file again.
  pause
  exit /b 1
)
npm install
if not exist .env copy .env.example .env
start notepad .env
echo.
echo Setup complete. Add your OPENAI_API_KEY to .env, save it, then run start-live-ai-windows.bat.
pause
