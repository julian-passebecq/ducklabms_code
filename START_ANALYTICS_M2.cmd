@echo off
cd /d "%~dp0"
echo Analytics M2 UI-only preview. Run npm ci first.
echo No API, dbt process, VM, Spark or cloud connection is started.
npm exec --no --workspace apps/web -- vite --host 127.0.0.1 --open "/?preview=2"
pause
