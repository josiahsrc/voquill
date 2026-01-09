param(
    [ValidateSet("local", "dev", "prod")]
    [string]$Flavor = "local"
)

$ErrorActionPreference = "Stop"

$Identifier = switch ($Flavor) {
    "local" { "com.voquill.desktop.local" }
    "dev"   { "com.voquill.desktop.dev" }
    "prod"  { "com.voquill.desktop" }
}

$DbFilename = "voquill.db"
$ConfigDir = Join-Path $env:APPDATA $Identifier
$DbPath = Join-Path $ConfigDir $DbFilename

$Removed = $false

foreach ($Suffix in "", "-wal", "-shm") {
    $Target = "$DbPath$Suffix"
    if (Test-Path $Target) {
        Remove-Item $Target -Force
        Write-Host "Removed $Target"
        $Removed = $true
    }
}

if (-not $Removed) {
    Write-Host "No database files found under $ConfigDir"
} else {
    Write-Host "Voquill desktop SQLite data cleared."
}
