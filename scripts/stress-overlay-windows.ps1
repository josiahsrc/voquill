param(
    [ValidateSet("auto", "local", "dev", "prod")]
    [string]$Flavor = "auto",
    [int]$DurationMinutes = 30,
    [int]$StepDelayMs = 80,
    [switch]$NoLogCheck,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($DurationMinutes -lt 1) {
    throw "DurationMinutes must be at least 1."
}

if ($StepDelayMs -lt 10) {
    throw "StepDelayMs must be at least 10."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$identifierByFlavor = @{
    local = "com.voquill.desktop.local"
    dev   = "com.voquill.desktop.dev"
    prod  = "com.voquill.desktop"
}

function Get-LogDirForFlavor {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SelectedFlavor
    )

    if ($SelectedFlavor -ne "auto") {
        $identifier = $identifierByFlavor[$SelectedFlavor]
        $candidate = Join-Path $env:LOCALAPPDATA "$identifier\logs"
        if (Test-Path $candidate) {
            return $candidate
        }
        throw "Log directory does not exist for flavor '$SelectedFlavor': $candidate"
    }

    $candidates = @("local", "dev", "prod") |
        ForEach-Object {
            $candidateFlavor = $_
            $candidateIdentifier = $identifierByFlavor[$candidateFlavor]
            $candidatePath = Join-Path $env:LOCALAPPDATA "$candidateIdentifier\logs"
            if (Test-Path $candidatePath) {
                $latestLog = Get-ChildItem -Path $candidatePath -Filter "voquill_*.log" -File -ErrorAction SilentlyContinue |
                    Sort-Object LastWriteTime -Descending |
                    Select-Object -First 1
                [PSCustomObject]@{
                    Flavor       = $candidateFlavor
                    Path         = $candidatePath
                    LastWriteUtc = if ($latestLog) { $latestLog.LastWriteTimeUtc } else { [datetime]::MinValue }
                }
            }
        } |
        Where-Object { $_ -ne $null } |
        Sort-Object LastWriteUtc -Descending

    if (-not $candidates) {
        throw "No Voquill log directory found under %LOCALAPPDATA%."
    }

    return $candidates[0].Path
}

function Get-CrashMatches {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogDir,
        [Parameter(Mandatory = $true)]
        [datetime]$StartTime
    )

    $patterns = @(
        "PANIC:",
        "thread 'main' panicked",
        "assertion failed: flush_paint_messages"
    )

    $recentLogs = Get-ChildItem -Path $LogDir -Filter "voquill_*.log" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -ge $StartTime.AddMinutes(-2) } |
        Sort-Object LastWriteTime

    if (-not $recentLogs) {
        $fallback = Get-ChildItem -Path $LogDir -Filter "voquill_*.log" -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if ($fallback) {
            $recentLogs = @($fallback)
        }
    }

    if (-not $recentLogs) {
        return @()
    }

    $matches = foreach ($logFile in $recentLogs) {
        Select-String -Path $logFile.FullName -Pattern $patterns -SimpleMatch
    }

    return @($matches)
}

$branchName = "unknown"
$commitSha = "unknown"
try {
    $branchName = (git rev-parse --abbrev-ref HEAD).Trim()
    $commitSha = (git rev-parse --short HEAD).Trim()
} catch {
}

$logDir = $null
if (-not $NoLogCheck) {
    $logDir = Get-LogDirForFlavor -SelectedFlavor $Flavor
}

Write-Host "Voquill Windows overlay stress test"
Write-Host "Repo: $repoRoot"
Write-Host "Branch: $branchName ($commitSha)"
Write-Host "Duration: $DurationMinutes minute(s)"
Write-Host "Step delay: $StepDelayMs ms"
if ($NoLogCheck) {
    Write-Host "Log scan: disabled"
} else {
    Write-Host "Log directory: $logDir"
}

if ($DryRun) {
    Write-Host "DryRun enabled. Exiting without moving cursor."
    exit 0
}

Add-Type @"
using System.Runtime.InteropServices;
public static class NativeCursor {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
}
"@

$points = @(
    @{ x = 960; y = 1020 },
    @{ x = 960; y = 40 },
    @{ x = 40; y = 540 },
    @{ x = 1880; y = 540 }
)

$startTime = Get-Date
$endTime = $startTime.AddMinutes($DurationMinutes)
$moveCount = 0

Write-Host "Starting cursor stress loop..."

while ((Get-Date) -lt $endTime) {
    foreach ($point in $points) {
        [void][NativeCursor]::SetCursorPos([int]$point.x, [int]$point.y)
        $moveCount++
        Start-Sleep -Milliseconds $StepDelayMs

        if ((Get-Date) -ge $endTime) {
            break
        }
    }
}

$finishTime = Get-Date
$elapsed = [math]::Round(($finishTime - $startTime).TotalSeconds, 1)

Write-Host "Completed cursor loop. Moves: $moveCount. Elapsed: $elapsed seconds."

if ($NoLogCheck) {
    Write-Host "Skipped log check."
    exit 0
}

$crashMatches = Get-CrashMatches -LogDir $logDir -StartTime $startTime

if ($crashMatches.Count -gt 0) {
    Write-Host ""
    Write-Host "Crash signature(s) found in logs:" -ForegroundColor Red
    $crashMatches | ForEach-Object {
        Write-Host ("{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim())
    }
    exit 2
}

Write-Host "No crash signatures found in scanned logs." -ForegroundColor Green
exit 0
