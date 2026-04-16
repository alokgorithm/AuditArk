$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Receipt Processor Pro - Builder"    -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# ── Ensure tools are on PATH ──
$env:PATH = "$env:USERPROFILE\.bun\bin;$env:USERPROFILE\.cargo\bin;$env:PATH"

# ── Step 1: Build Python backend with PyInstaller ──
Write-Host "[1/3] Building Python backend..." -ForegroundColor Yellow
Set-Location "$root\backend"

python -m pip install pyinstaller --quiet 2>&1 | Out-Null
python build_backend.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Backend build failed!" -ForegroundColor Red
    exit 1
}

$backendDist = "$root\backend\dist\backend"
if (-not (Test-Path "$backendDist\backend.exe")) {
    Write-Host "FAILED: backend.exe not found at $backendDist" -ForegroundColor Red
    exit 1
}
Write-Host "Backend built: $backendDist\backend.exe" -ForegroundColor Green

# ── Step 2: Install frontend deps with bun ──
Write-Host "[2/3] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location "$root\frontend"
bun install
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: bun install failed!" -ForegroundColor Red
    exit 1
}

# ── Step 3: Build Tauri app ──
Write-Host "[3/3] Building Tauri desktop app..." -ForegroundColor Yellow
bun run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Tauri build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

$nsisDir = "$root\frontend\src-tauri\target\release\bundle\nsis"
if (Test-Path $nsisDir) {
    Write-Host "Installer location:" -ForegroundColor Cyan
    Get-ChildItem $nsisDir -Filter "*.exe" | ForEach-Object {
        Write-Host "  $($_.FullName)" -ForegroundColor White
    }
} else {
    Write-Host "Check: frontend\src-tauri\target\release\bundle\" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Data folder: Users will find their data at:" -ForegroundColor Cyan
Write-Host "  %LOCALAPPDATA%\com.receiptprocessor.app\ReceiptProcessorData" -ForegroundColor White
Write-Host "  (Copy this folder to backup/transfer all receipts + DB)" -ForegroundColor Gray
Write-Host ""

Set-Location $root
