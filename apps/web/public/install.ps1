# Voquill CLI installer for Windows
#
# Usage:
#   iwr https://voquill.com/install.ps1 -UseBasicParsing | iex
#   & ([scriptblock]::Create((iwr https://voquill.com/install.ps1 -UseBasicParsing))) -Dev
#   & ([scriptblock]::Create((iwr https://voquill.com/install.ps1 -UseBasicParsing))) -Version 1.2.3

[CmdletBinding()]
param(
	[switch]$Dev,
	[string]$Version = ""
)

$ErrorActionPreference = 'Stop'

$Repo = "voquill/voquill"
if ($Dev) {
	$BinName = "voquill-dev"
	$Channel = "dev"
	$TagPrefix = "cli-dev-v"
} else {
	$BinName = "voquill"
	$Channel = "prod"
	$TagPrefix = "cli-v"
}

# Detect architecture.
$ArchName = $env:PROCESSOR_ARCHITECTURE
switch ($ArchName) {
	"AMD64" { $ArchTarget = "x86_64" }
	"ARM64" { $ArchTarget = "aarch64" }
	default { throw "Unsupported architecture: $ArchName" }
}
$Target = "$ArchTarget-pc-windows-msvc"

# Resolve release tag.
if ($Version) {
	$Tag = "$TagPrefix$Version"
} else {
	$ApiUrl = "https://api.github.com/repos/$Repo/releases"
	try {
		$Releases = Invoke-RestMethod -Uri $ApiUrl -UseBasicParsing
	} catch {
		throw "Failed to query GitHub releases API: $_"
	}
	$Match = $Releases | Where-Object { $_.tag_name -like "$TagPrefix*" } | Select-Object -First 1
	if (-not $Match) {
		throw "No $Channel release found matching tag prefix $TagPrefix"
	}
	$Tag = $Match.tag_name
}

$Asset = "$BinName-$Target.zip"
$DownloadUrl = "https://github.com/$Repo/releases/download/$Tag/$Asset"

$InstallDir = if ($env:VOQUILL_INSTALL) { $env:VOQUILL_INSTALL } else { Join-Path $env:USERPROFILE ".voquill" }
$BinDir = Join-Path $InstallDir "bin"
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

$TmpDir = Join-Path $env:TEMP ("voquill-install-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

try {
	Write-Host "Downloading $DownloadUrl"
	$ZipPath = Join-Path $TmpDir $Asset
	Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing
	Expand-Archive -Path $ZipPath -DestinationPath $TmpDir -Force

	$ExtractedExe = Join-Path $TmpDir (Join-Path "$BinName-$Target" "$BinName.exe")
	if (-not (Test-Path $ExtractedExe)) {
		throw "Binary not found inside archive at $ExtractedExe"
	}

	$DestExe = Join-Path $BinDir "$BinName.exe"
	# Can't overwrite a running .exe on Windows; rename existing aside so the
	# OS will clean it up on reboot.
	if (Test-Path $DestExe) {
		$OldExe = "$DestExe.old"
		if (Test-Path $OldExe) { Remove-Item $OldExe -Force -ErrorAction SilentlyContinue }
		try {
			Rename-Item $DestExe $OldExe -ErrorAction Stop
		} catch {
			# If rename fails (e.g. permission), try delete.
			Remove-Item $DestExe -Force
		}
	}
	Move-Item $ExtractedExe $DestExe -Force

	Write-Host ""
	Write-Host "✓ Installed $BinName $Tag to $DestExe"

	# Add bin dir to User PATH (persists across sessions).
	$UserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
	$PathEntries = @()
	if ($UserPath) { $PathEntries = $UserPath -split ';' | Where-Object { $_ } }

	if ($PathEntries -notcontains $BinDir) {
		$NewPath = (($PathEntries + $BinDir) -join ';')
		[Environment]::SetEnvironmentVariable('Path', $NewPath, 'User')
		Write-Host "Added $BinDir to your User PATH."
		Write-Host "Open a new terminal, or run this now to use $BinName in the current session:"
		Write-Host "  `$env:Path = `"`$env:Path;$BinDir`""
	}
	# Make sure this session can run it too.
	if (($env:Path -split ';') -notcontains $BinDir) {
		$env:Path = "$env:Path;$BinDir"
	}
} finally {
	Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
}
