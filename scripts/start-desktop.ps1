param(
    [string]$Flavor = "emulators"
)

$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\.."

if ($Flavor -notin @("dev", "prod", "emulators")) {
    Write-Error "Unknown flavor: $Flavor"
    exit 1
}

$env:FLAVOR = $Flavor
$env:VITE_FLAVOR = $Flavor

if ($Flavor -eq "emulators") {
    $listening = Get-NetTCPConnection -LocalPort 9099 -State Listen -ErrorAction SilentlyContinue
    if (-not $listening) {
        Write-Error "Firebase emulators are not running (nothing listening on port 9099). Start the emulators first, then re-run this script."
        exit 1
    }
    $env:VITE_USE_EMULATORS = "true"
    & "$PSScriptRoot\clear-desktop-db.ps1" -Flavor local
    function global:prompt { "[emulators] PS $($executionContext.SessionState.Path.CurrentLocation)> " }
    pnpm exec turbo run dev --filter=desktop...
} else {
    $env:VITE_USE_EMULATORS = "false"
    pnpm --filter desktop run dev
}
