param(
    [string]$Flavor = "dev"
)

$ErrorActionPreference = "Stop"

Set-Location "$PSScriptRoot\.."

if ($Flavor -notin @("dev", "prod")) {
    Write-Error "Unknown flavor: $Flavor"
    exit 1
}

$env:FLAVOR = $Flavor
$env:VITE_FLAVOR = $Flavor
$env:VITE_USE_EMULATORS = "false"

npm run dev --workspace=apps/desktop
