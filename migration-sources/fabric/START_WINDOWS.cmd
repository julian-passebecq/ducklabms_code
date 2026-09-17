@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install a current Node.js LTS/current release and rerun.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :fail
)
echo Starting Fabric + Azure Data Engineering Learning Studio V2...
call npm run dev
exit /b %errorlevel%
:fail
echo Dependency installation failed.
pause
exit /b 1
