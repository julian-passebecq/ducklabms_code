$ErrorActionPreference = "Stop"

Write-Host "Mosaic V2 - Notebook Layout Engine" -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required. Install Node.js 20+ and run this script again."
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}

npm run verify:source
npm run dev
