# ============================================================
# start-aria.ps1 — Start ARIA Voice Agent (on-demand, local)
#
# Run this whenever you want ARIA voice assistant to be active.
# ARIA connects to LiveKit Cloud — no public IP needed.
# Stop it with Ctrl+C when done.
#
# Prerequisites:
#   1. Python 3.10+ installed (python --version)
#   2. pip install -r requirements.txt  (run once from voice-agent/)
#   3. .env file in voice-agent/ with your keys (see .env.example)
#      OR keys already in parent .env.local
# ============================================================

$scriptDir = $PSScriptRoot
Set-Location $scriptDir

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ARIA - BEC Vortex Voice Assistant" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── Check Python ──────────────────────────────────────────────
Write-Host "`n[1/3] Checking Python..." -ForegroundColor Yellow
try {
    $pyVer = python --version 2>&1
    Write-Host "      $pyVer OK" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Python not found. Install from https://python.org" -ForegroundColor Red
    exit 1
}

# ── Check dependencies ────────────────────────────────────────
Write-Host "`n[2/3] Checking dependencies..." -ForegroundColor Yellow
$pipCheck = pip show livekit-agents 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      ERROR: pip install failed." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "      Dependencies OK" -ForegroundColor Green
}

# ── Check required env vars ───────────────────────────────────
Write-Host "`n[3/3] Checking environment..." -ForegroundColor Yellow
$envFile   = Join-Path $scriptDir ".env"
$parentEnv = Join-Path $scriptDir "..\\.env.local"
$envOk = $true

# Try loading from .env for the check
$keysToCheck = @("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "DEEPGRAM_API_KEY", "CEREBRAS_API_KEY", "CARTESIA_API_KEY")
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^#=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
        }
    }
} elseif (Test-Path $parentEnv) {
    Get-Content $parentEnv | ForEach-Object {
        if ($_ -match "^([^#=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
        }
    }
}

foreach ($key in $keysToCheck) {
    $val = [System.Environment]::GetEnvironmentVariable($key, "Process")
    if (-not $val) {
        Write-Host "      MISSING: $key" -ForegroundColor Red
        $envOk = $false
    } else {
        Write-Host "      $key : SET" -ForegroundColor Green
    }
}

if (-not $envOk) {
    Write-Host "`n  Create voice-agent/.env with missing keys (see .env.example)" -ForegroundColor Yellow
    exit 1
}

# ── Start ARIA ────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Starting ARIA..." -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

python agent.py start
