param(
  [int]$PreferredPort = 3000,
  [switch]$SkipBrowser,
  [switch]$AllowPortFallback,
  [switch]$SkipClean
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Resolve-Executable {
  param(
    [string]$CommandName,
    [string[]]$FallbackPaths
  )

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($fallback in $FallbackPaths) {
    if (Test-Path -LiteralPath $fallback) {
      return $fallback
    }
  }

  return $null
}

function Test-PortInUse {
  param([int]$Port)

  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
  try {
    $listener.Start()
    $listener.Stop()
    return $false
  } catch {
    return $true
  }
}

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return $null
  }

  foreach ($line in Get-Content -LiteralPath $FilePath) {
    if ($line.StartsWith("#")) {
      continue
    }

    if ($line -match "^$([regex]::Escape($Key))=(.*)$") {
      return $Matches[1].Trim()
    }
  }

  return $null
}

function Test-YandexKey {
  param(
    [string]$ApiKey,
    [int]$Port
  )

  if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Host "Yandex key check: NEXT_PUBLIC_YANDEX_MAPS_API_KEY is empty in .env" -ForegroundColor Yellow
    return
  }

  $checkUrl = "https://api-maps.yandex.ru/v3/?apikey=$([uri]::EscapeDataString($ApiKey))&lang=ru_RU"
  $headers = @{ Referer = "http://localhost:$Port/" }

  try {
    $null = Invoke-WebRequest -Uri $checkUrl -Headers $headers -Method Get -TimeoutSec 20 -UseBasicParsing
    Write-Host "Yandex key check: OK (v3 endpoint returns 200 for localhost referer)" -ForegroundColor Green
  } catch {
    $statusCode = $null
    $body = ""

    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
      } catch {
        $statusCode = $null
      }

      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $body = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {
        $body = ""
      }
    }

    if ($statusCode -eq 403 -and $body -match "Invalid api key") {
      Write-Host "Yandex key check: FAILED (403 Invalid api key)." -ForegroundColor Red
      Write-Host "Check key restrictions in Yandex Developer: HTTP Referer must include only 'localhost'." -ForegroundColor Yellow
      Write-Host "The app will still start, but map may not load until the key is fixed." -ForegroundColor Yellow
      return
    }

    Write-Host "Yandex key check: WARNING (unable to validate key before startup)." -ForegroundColor Yellow
  }
}

function Clear-NextCache {
  param([string]$ProjectRoot)

  $nextPath = Join-Path $ProjectRoot ".next"
  if (-not (Test-Path -LiteralPath $nextPath)) {
    return
  }

  $resolvedRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
  $resolvedNext = [System.IO.Path]::GetFullPath($nextPath)
  $leaf = Split-Path -Path $resolvedNext -Leaf

  if ($leaf -ne ".next" -or -not $resolvedNext.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove unexpected directory: $resolvedNext"
  }

  Write-Host "Clearing Next.js cache: $resolvedNext" -ForegroundColor Cyan
  Remove-Item -LiteralPath $resolvedNext -Recurse -Force
}

$nodeExe = Resolve-Executable -CommandName "node" -FallbackPaths @(
  "C:\Program Files\nodejs\node.exe",
  "C:\Program Files (x86)\nodejs\node.exe"
)

$npmCmd = Resolve-Executable -CommandName "npm.cmd" -FallbackPaths @(
  "C:\Program Files\nodejs\npm.cmd",
  "C:\Program Files (x86)\nodejs\npm.cmd"
)

if (-not $nodeExe -or -not $npmCmd) {
  Write-Host ""
  Write-Host "Node.js was not found. Install Node.js LTS and try again." -ForegroundColor Red
  Write-Host "Download: https://nodejs.org/" -ForegroundColor Yellow
  exit 1
}

$nodeDir = Split-Path -Parent $nodeExe
if ($env:Path -notlike "*$nodeDir*") {
  $env:Path = "$nodeDir;$env:Path"
}

if (-not (Test-Path -LiteralPath ".env") -and (Test-Path -LiteralPath ".env.example")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env"
  Write-Host "Created .env from .env.example" -ForegroundColor Yellow
}

if (-not (Test-Path -LiteralPath "node_modules")) {
  Write-Host "Installing dependencies (npm install)..." -ForegroundColor Cyan
  & $npmCmd install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed." -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

if (-not $SkipClean) {
  Clear-NextCache -ProjectRoot $projectRoot
}

$port = $PreferredPort
if (Test-PortInUse -Port $port) {
  if ($AllowPortFallback) {
    while (Test-PortInUse -Port $port) {
      $port++
    }
  } else {
    try {
      $ownerPid = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
        Select-Object -First 1 -ExpandProperty OwningProcess)
      if ($ownerPid) {
        $ownerProcess = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
        if ($ownerProcess) {
          Write-Host ""
          Write-Host "Port owner: $($ownerProcess.ProcessName) (PID $ownerPid)" -ForegroundColor Yellow
        }
      }
    } catch {
      # Best effort only: on some systems Get-NetTCPConnection may be unavailable.
    }

    Write-Host ""
    Write-Host "Port $port is already in use." -ForegroundColor Red
    Write-Host "Free this port and run start-dev.bat again, or run:" -ForegroundColor Yellow
    Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1 -AllowPortFallback" -ForegroundColor Yellow
    exit 1
  }
}

$url = "http://localhost:$port"
$yandexApiKey = Get-EnvValue -FilePath ".env" -Key "NEXT_PUBLIC_YANDEX_MAPS_API_KEY"

Write-Host ""
Write-Host "Starting dev server..." -ForegroundColor Cyan
Write-Host "Project: $projectRoot" -ForegroundColor DarkCyan
Write-Host "URL: $url" -ForegroundColor Green
Write-Host "Stop with Ctrl + C" -ForegroundColor DarkGray
Write-Host ""

Test-YandexKey -ApiKey $yandexApiKey -Port $port

if (-not $SkipBrowser) {
  Start-Process $url | Out-Null
}

& $npmCmd run dev -- --port $port
exit $LASTEXITCODE
