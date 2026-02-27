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
    $env:VITE_USE_EMULATORS = "true"
    & "$PSScriptRoot\kill-emulators.ps1"
    & "$PSScriptRoot\clear-desktop-db.ps1" -Flavor local
    Push-Location "$PSScriptRoot\..\apps\firebase"
    npx firebase-tools use dev
    Pop-Location
    function global:prompt { "[emulators] PS $($executionContext.SessionState.Path.CurrentLocation)> " }
    npm run dev
} else {
    $env:VITE_USE_EMULATORS = "false"
    npm run dev --workspace=apps/desktop
}
