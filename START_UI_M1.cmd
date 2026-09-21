@echo off
cd /d "%~dp0"
echo Starting UI-only preview. Run npm ci once before using this launcher.
echo No local API, Spark, Oracle or dbt process is started.
npm exec --no --workspace apps/web -- vite --host 127.0.0.1 --open "/?preview=1"
pause
