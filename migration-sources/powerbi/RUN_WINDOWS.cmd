@echo off
cd /d %~dp0
where node >nul 2>nul || (echo Node.js is required. Install Node.js 22 LTS or newer.& pause & exit /b 1)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
echo Starting Power BI Learning Studio...
call npm run dev
