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
for /f "tokens=2 delims==" %%A in ('findstr /b "PORT=" .env') do set PORT_VALUE=%%A
if "%PORT_VALUE%"=="" set PORT_VALUE=8765
start "" "http://localhost:%PORT_VALUE%"
npm start
