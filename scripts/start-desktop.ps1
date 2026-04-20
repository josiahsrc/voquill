param(
    [string]$Flavor = "prod"
)

$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\.."

if ($Flavor -notin @("dev", "prod", "emulators", "enterprise", "enterprise-dev")) {
    Write-Error "Unknown flavor: $Flavor"
    exit 1
}

$env:FLAVOR = $Flavor
$env:VITE_FLAVOR = $Flavor

$env:TAURI_DEV_CONFIG = switch ($Flavor) {
    "prod"           { "src-tauri/tauri.prod.conf.json" }
    "dev"            { "src-tauri/tauri.dev.conf.json" }
    "emulators"      { "src-tauri/tauri.local.conf.json" }
    "enterprise"     { "src-tauri/tauri.enterprise.conf.json" }
    "enterprise-dev" { "src-tauri/tauri.enterprise-dev.conf.json" }
}

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
