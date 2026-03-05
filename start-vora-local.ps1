# ============================================================
# start-vora-local.ps1 — VORA local dev on/off switch
# Run from the project folder:  .\start-vora-local.ps1
#
# What it does:
#   ON  → starts Ollama + Next.js dev server
#   OFF → Ctrl+C  (script cleans up both processes on exit)
# ============================================================

$PROJECT = $PSScriptRoot   # folder where this script lives

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VORA Local Dev  —  Starting..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── Step 1: Ensure Ollama is running ─────────────────────────
Write-Host "`n[1/2] Checking Ollama..." -ForegroundColor Yellow

$ollamaProc = $null
try {
    Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 | Out-Null
    Write-Host "      Ollama already running. OK" -ForegroundColor Green
} catch {
    Write-Host "      Starting Ollama..." -ForegroundColor Yellow
    $ollamaProc = Start-Process "ollama" "serve" -WindowStyle Normal -PassThru
    Start-Sleep -Seconds 4
    try {
        Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 | Out-Null
        Write-Host "      Ollama started. OK" -ForegroundColor Green
    } catch {
        Write-Host "      ERROR: Could not start Ollama. Is it installed?" -ForegroundColor Red
        exit 1
    }
}

# ── Step 2: Start Next.js dev server ─────────────────────────
Write-Host "`n[2/2] Starting Next.js dev server..." -ForegroundColor Yellow

$devProc = Start-Process "cmd" `
    -ArgumentList "/c npm run dev" `
    -WorkingDirectory $PROJECT `
    -WindowStyle Normal `
    -PassThru

# Wait a moment then check it came up
Start-Sleep -Seconds 6

Write-Host "      Dev server started (PID $($devProc.Id)). OK" -ForegroundColor Green

# ── Ready ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  VORA is ONLINE (local)" -ForegroundColor Green
Write-Host "  App  : http://localhost:3000/os" -ForegroundColor Green
Write-Host "  AI   : http://localhost:11434  (qwen3:8b)" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop everything." -ForegroundColor DarkGray
Write-Host ""

# ── Keep alive + cleanup on Ctrl+C ───────────────────────────
try {
    while ($true) {
        Start-Sleep -Seconds 10

        $devDead    = $devProc.HasExited
        $ollamaDead = ($ollamaProc -and $ollamaProc.HasExited)

        if ($devDead) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Dev server stopped unexpectedly." -ForegroundColor Red
        }
        if ($ollamaDead) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Ollama stopped unexpectedly." -ForegroundColor Red
        }
        if ($devDead -or $ollamaDead) { break }

        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Running  dev=$($devProc.Id)  ollama OK" -ForegroundColor DarkGray
    }
} finally {
    Write-Host "`nShutting down..." -ForegroundColor Yellow

    # Stop dev server
    if ($devProc -and -not $devProc.HasExited) {
        Stop-Process -Id $devProc.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Dev server stopped." -ForegroundColor DarkGray
    }

    # Only stop Ollama if WE started it (don't kill the user's existing session)
    if ($ollamaProc -and -not $ollamaProc.HasExited) {
        Stop-Process -Id $ollamaProc.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Ollama stopped." -ForegroundColor DarkGray
    }

    Write-Host "VORA offline." -ForegroundColor Cyan
    Write-Host ""
}
