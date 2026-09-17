@echo off
cd /d %~dp0
call npm install
if errorlevel 1 exit /b 1
call npm run check
if errorlevel 1 exit /b 1
call npm run check:deep
if errorlevel 1 exit /b 1
call npm run check:state
if errorlevel 1 exit /b 1
call npm run check:behavior
if errorlevel 1 exit /b 1
call npm run check:workflow
if errorlevel 1 exit /b 1
call npm run check:migration
if errorlevel 1 exit /b 1
call npm run check:syntax
if errorlevel 1 exit /b 1
call npm run check:css
if errorlevel 1 exit /b 1
call npm run build
pause
