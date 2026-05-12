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

  try {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($conn) {
      return $true
    }
  } catch {
    # Fallback on systems where Get-NetTCPConnection is unavailable.
  }

  try {
    $line = netstat -ano -p tcp | Select-String -Pattern "LISTENING" | Select-String -Pattern "[:\.]$Port\s" | Select-Object -First 1
    return [bool]$line
  } catch {
    return $false
  }
}

function Get-PortOwner {
  param([int]$Port)

  try {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
    if (-not $conn) {
      return $null
    }

    $pid = [int]$conn.OwningProcess
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $pid" -ErrorAction SilentlyContinue
    $processName = $null
    if (-not $process) {
      try {
        $processName = (Get-Process -Id $pid -ErrorAction Stop).ProcessName
      } catch {
        $processName = $null
      }
    }
    if (-not $process) {
      return [pscustomobject]@{
        ProcessId = $pid
        Name = $processName
        CommandLine = $null
      }
    }

    return [pscustomobject]@{
      ProcessId = $pid
      Name = $process.Name
      CommandLine = $process.CommandLine
    }
  } catch {
    try {
      $netstatLine = netstat -ano -p tcp | Select-String -Pattern "LISTENING" | Select-String -Pattern "[:\.]$Port\s" | Select-Object -First 1
      if (-not $netstatLine) {
        return $null
      }

      $parts = ($netstatLine.ToString() -replace "\s+", " ").Trim().Split(" ")
      $pid = [int]$parts[$parts.Length - 1]
      $process = Get-CimInstance Win32_Process -Filter "ProcessId = $pid" -ErrorAction SilentlyContinue
      $processName = $null
      if (-not $process) {
        try {
          $processName = (Get-Process -Id $pid -ErrorAction Stop).ProcessName
        } catch {
          $processName = $null
        }
      }

      return [pscustomobject]@{
        ProcessId = $pid
        Name = if ($process) { $process.Name } else { $processName }
        CommandLine = if ($process) { $process.CommandLine } else { $null }
      }
    } catch {
      return $null
    }
  }
}

function Stop-NextOnPortIfNeeded {
  param([int]$Port)

  $owner = Get-PortOwner -Port $Port
  if (-not $owner) {
    return $false
  }

  $ownerName = ""
  $ownerCmd = ""
  if ($owner.Name) {
    $ownerName = $owner.Name
  }
  if ($owner.CommandLine) {
    $ownerCmd = $owner.CommandLine
  }

  $name = $ownerName.ToLowerInvariant()
  $cmd = $ownerCmd.ToLowerInvariant()
  $isNode = $name -like "node*"
  $isNodeNext = $isNode -and ($cmd -eq "" -or $cmd.Contains("next"))

  if (-not $isNodeNext) {
    return $false
  }

  Write-Host ""
  Write-Host "Found existing Next.js process on port ${Port}: $($owner.Name) (PID $($owner.ProcessId))" -ForegroundColor Yellow
  Write-Host "Stopping stale process to free port $Port..." -ForegroundColor Yellow

  try {
    Stop-Process -Id $owner.ProcessId -Force -ErrorAction Stop
  } catch {
    return $false
  }

  $attempt = 0
  while ($attempt -lt 20 -and (Test-PortInUse -Port $Port)) {
    Start-Sleep -Milliseconds 200
    $attempt++
  }

  return -not (Test-PortInUse -Port $Port)
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

$port = $PreferredPort
if (Test-PortInUse -Port $port) {
  $stopped = Stop-NextOnPortIfNeeded -Port $port

  if ($stopped) {
    Write-Host "Port $port is now free." -ForegroundColor Green
  } else {
    Write-Host ""
    Write-Host "Port $port is busy and could not be stopped automatically." -ForegroundColor Yellow
    Write-Host "Switching to next available port..." -ForegroundColor Yellow
    while (Test-PortInUse -Port $port) {
      $port++
    }
  }
}

if (-not $SkipClean) {
  Clear-NextCache -ProjectRoot $projectRoot
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
