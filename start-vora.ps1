# ============================================================
# start-vora.ps1 — Start VORA AI Agent
# Run this whenever you want VORA to be active.
# It will:
#   1. Start Ollama (if not already running)
#   2. Start a Cloudflare Quick Tunnel (no login, no domain needed)
#   3. Capture the public HTTPS URL
#   4. Save it to your MongoDB so Vercel picks it up instantly
# ============================================================

$CLOUDFLARED  = "C:\cloudflared\cloudflared.exe"
$OLLAMA_KEY   = [System.Environment]::GetEnvironmentVariable("OLLAMA_API_KEY", "User")
$CFG_SECRET   = [System.Environment]::GetEnvironmentVariable("VORA_CONFIG_SECRET", "User")

# Read deployed app URL from env or prompt
$APP_URL = $env:VORA_APP_URL
if (-not $APP_URL) {
    $APP_URL = Read-Host "Enter your deployed app URL (e.g. https://your-app.vercel.app)"
}
$APP_URL = $APP_URL.TrimEnd("/")

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VORA - Starting AI Agent" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── Step 1: Ensure Ollama is running ─────────────────────────
Write-Host "`n[1/3] Checking Ollama..." -ForegroundColor Yellow
$ollamaRunning = $false
try {
    $headers = @{}
    if ($OLLAMA_KEY) { $headers["Authorization"] = "Bearer $OLLAMA_KEY" }
    Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Headers $headers -TimeoutSec 3 | Out-Null
    $ollamaRunning = $true
    Write-Host "      Ollama already running. OK" -ForegroundColor Green
} catch {
    Write-Host "      Starting Ollama..." -ForegroundColor Yellow
    Start-Process "ollama" "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 4
    try {
        $headers = @{}
        if ($OLLAMA_KEY) { $headers["Authorization"] = "Bearer $OLLAMA_KEY" }
        Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Headers $headers -TimeoutSec 5 | Out-Null
        Write-Host "      Ollama started. OK" -ForegroundColor Green
    } catch {
        Write-Host "      ERROR: Could not start Ollama. Is it installed?" -ForegroundColor Red
        exit 1
    }
}

# ── Step 2: Start Quick Tunnel ────────────────────────────────
Write-Host "`n[2/3] Starting Cloudflare Quick Tunnel..." -ForegroundColor Yellow

$tunnelLog = "$env:TEMP\vora-tunnel.log"
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }

# Kill any old cloudflared processes
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

# Start tunnel and redirect stderr (where the URL appears) to a log file
$tunnelProcess = Start-Process -FilePath $CLOUDFLARED `
    -ArgumentList "tunnel --url http://localhost:11434" `
    -RedirectStandardError $tunnelLog `
    -WindowStyle Hidden `
    -PassThru

# Wait for the URL to appear in the log (up to 30 seconds)
$tunnelUrl = $null
$deadline  = (Get-Date).AddSeconds(30)
Write-Host "      Waiting for tunnel URL..." -ForegroundColor Yellow

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 800
    if (Test-Path $tunnelLog) {
        $logContent = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
        if ($logContent -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $tunnelUrl = $Matches[0]
            break
        }
    }
}

if (-not $tunnelUrl) {
    Write-Host "      ERROR: Tunnel URL not found. Check C:\cloudflared is installed." -ForegroundColor Red
    $tunnelProcess | Stop-Process -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "      Tunnel active: $tunnelUrl" -ForegroundColor Green

# ── Step 3: Push URL to MongoDB via your deployed app ────────
Write-Host "`n[3/3] Registering URL with server..." -ForegroundColor Yellow

$setUrlEndpoint = "$APP_URL/api/agent/set-url"
try {
    $body = @{ url = $tunnelUrl; secret = $CFG_SECRET } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri $setUrlEndpoint `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -TimeoutSec 15
    Write-Host "      Server updated. OK" -ForegroundColor Green
} catch {
    Write-Host "      WARNING: Could not notify server. VORA will work locally but Vercel may use stale URL." -ForegroundColor DarkYellow
    Write-Host "      Endpoint: $setUrlEndpoint" -ForegroundColor DarkYellow
}

# ── Done ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  VORA is ONLINE" -ForegroundColor Green
Write-Host "  Tunnel : $tunnelUrl" -ForegroundColor Green
Write-Host "  Model  : qwen3:8b" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop VORA and close the tunnel." -ForegroundColor DarkGray
Write-Host ""

# Keep the script alive so the tunnel process stays running
try {
    while ($true) {
        Start-Sleep -Seconds 30
        # Restart tunnel if it died
        if ($tunnelProcess.HasExited) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Tunnel died — restarting..." -ForegroundColor Yellow
            $tunnelLog2 = "$env:TEMP\vora-tunnel.log"
            $tunnelProcess = Start-Process -FilePath $CLOUDFLARED `
                -ArgumentList "tunnel --url http://localhost:11434" `
                -RedirectStandardError $tunnelLog2 `
                -WindowStyle Hidden `
                -PassThru
            Start-Sleep -Seconds 10
            # Re-register the new URL
            if (Test-Path $tunnelLog2) {
                $logC = Get-Content $tunnelLog2 -Raw -ErrorAction SilentlyContinue
                if ($logC -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
                    $newUrl = $Matches[0]
                    try {
                        $body = @{ url = $newUrl; secret = $CFG_SECRET } | ConvertTo-Json
                        Invoke-RestMethod -Uri $setUrlEndpoint -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10 | Out-Null
                        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Tunnel restarted: $newUrl" -ForegroundColor Green
                    } catch {}
                }
            }
        } else {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] VORA alive — tunnel PID $($tunnelProcess.Id)" -ForegroundColor DarkGray
        }
    }
} finally {
    Write-Host "`nStopping tunnel..." -ForegroundColor Yellow
    $tunnelProcess | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "VORA offline." -ForegroundColor DarkGray
}
