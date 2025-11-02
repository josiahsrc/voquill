<#
.SYNOPSIS
  Installs Windows build prerequisites for the Voquill desktop app.

.DESCRIPTION
  Installs the shared dependencies (LLVM/Clang and CMake) required to build the
  Tauri desktop app on Windows. When the EnableGpu switch (or VOQUILL_ENABLE_GPU=1)
  is provided, the script will also install the Vulkan SDK used for GPU-accelerated
  Whisper builds.
#>
[CmdletBinding()]
param(
  [switch]$EnableGpu
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version 3

function Test-IsAdministrator {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-Command {
  param (
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$InstallHint
  )

  if (-not (Get-Command -Name $Name -ErrorAction SilentlyContinue)) {
    throw "Missing prerequisite command '$Name'. Install hint: $InstallHint"
  }
}

function Invoke-Choco {
  param (
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Write-Host "[INFO] choco $($Arguments -join ' ')"
  & choco @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Chocolatey command 'choco $($Arguments -join ' ')' failed with exit code $LASTEXITCODE"
  }
}

function Download-File {
  param (
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  Write-Host "[INFO] Downloading $Url"

  if ([Net.ServicePointManager]::SecurityProtocol -band [Net.SecurityProtocolType]::Tls12 -eq 0) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  }

  try {
    if ($PSVersionTable.PSVersion.Major -ge 6) {
      Invoke-WebRequest -Uri $Url -OutFile $Destination
    }
    else {
      Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
    }
  }
  catch {
    Write-Warning "[WARN] Invoke-WebRequest failed ($($_.Exception.Message)). Falling back to curl.exe."
    if (-not (Get-Command -Name 'curl.exe' -ErrorAction SilentlyContinue)) {
      throw "Unable to download $Url; install curl or fix Invoke-WebRequest."
    }

    & curl.exe -L -o $Destination $Url
    if ($LASTEXITCODE -ne 0) {
      throw "curl.exe failed with exit code $LASTEXITCODE while downloading $Url"
    }
  }
}

function Add-PathIfMissing {
  param (
    [Parameter(Mandatory = $true)][string]$PathToAdd
  )

  if (-not (Test-Path -LiteralPath $PathToAdd)) {
    return
  }

  $currentParts = ($env:PATH -split ';') | Where-Object { $_ -ne '' }
  if ($currentParts -notcontains $PathToAdd) {
    $env:PATH = "$PathToAdd;$env:PATH"
  }
}

function Install-VulkanSdk {
  param (
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$InstallRoot,
    [switch]$EmitGithubEnv
  )

  $destination = Join-Path -Path $InstallRoot -ChildPath $Version
  if (Test-Path -LiteralPath $destination) {
    Write-Host "[INFO] Vulkan SDK $Version already present at $destination"
  }
  else {
    $url = "https://sdk.lunarg.com/sdk/download/$Version/windows/VulkanSDK-$Version-Installer.exe"
    $tempInstaller = Join-Path -Path ([IO.Path]::GetTempPath()) -ChildPath ("VulkanSDK-$Version-Installer.exe")

    Download-File -Url $url -Destination $tempInstaller

    $allowedExitCodes = @(0, 1641, 3010)

    $modernArgs = @(
      "install",
      "--root", $destination,
      "--accept-licenses",
      "--default-answer",
      "--confirm-command"
    )

    $process = $null
    $exitCode = -1

    try {
      $process = Start-Process -FilePath $tempInstaller -ArgumentList $modernArgs -Wait -PassThru -NoNewWindow
      $exitCode = $process.ExitCode
    }
    catch {
      Write-Warning "[WARN] Vulkan SDK installer (modern CLI) threw an error: $($_.Exception.Message)"
    }

    if (($exitCode -notin $allowedExitCodes) -or (-not (Test-Path -LiteralPath $destination))) {
      Write-Warning "[WARN] Vulkan SDK modern installer path failed or did not create $destination. Falling back to legacy silent switches."

      $legacyArgs = @("/S", "/DIR=$destination")
      $process = Start-Process -FilePath $tempInstaller -ArgumentList $legacyArgs -Wait -PassThru -NoNewWindow
      $exitCode = $process.ExitCode

      if ($exitCode -notin $allowedExitCodes) {
        throw "Vulkan SDK installer exited with code $exitCode. Installation failed."
      }
    }

    if (-not (Test-Path -LiteralPath $destination)) {
      throw "Vulkan SDK did not install to $destination. Please install it manually from https://vulkan.lunarg.com/sdk/home."
    }

    try {
      Remove-Item -LiteralPath $tempInstaller -Force
    }
    catch {
      Write-Warning "[WARN] Unable to remove temporary installer $tempInstaller ($($_.Exception.Message))."
    }

    Write-Host "[OK] Vulkan SDK $Version installed at $destination"
  }

  $env:VULKAN_SDK = $destination
  Add-PathIfMissing -PathToAdd (Join-Path -Path $destination -ChildPath "Bin")
  Add-PathIfMissing -PathToAdd (Join-Path -Path $destination -ChildPath "Lib")

  if ($EmitGithubEnv) {
    Add-Content -Path $env:GITHUB_ENV -Value "VULKAN_SDK=$destination"
    Add-Content -Path $env:GITHUB_PATH -Value (Join-Path -Path $destination -ChildPath "Bin")
    Add-Content -Path $env:GITHUB_PATH -Value (Join-Path -Path $destination -ChildPath "Lib")
  }
}

if (-not (Test-IsAdministrator)) {
  throw "This script must be run from an elevated (Run as administrator) PowerShell session."
}

$isGithub = $env:GITHUB_ACTIONS -eq 'true'

if (-not $PSBoundParameters.ContainsKey('EnableGpu')) {
  $EnableGpu = $env:VOQUILL_ENABLE_GPU -in @('1', 'true', 'TRUE')
}

Ensure-Command -Name "node" -InstallHint "Install Node.js 18+ from https://nodejs.org/en/download/"
Ensure-Command -Name "npm" -InstallHint "Node.js installation should provide npm."
Ensure-Command -Name "cargo" -InstallHint "Install Rust via https://rustup.rs/"
Ensure-Command -Name "choco" -InstallHint "Install Chocolatey from https://chocolatey.org/install"

Invoke-Choco -Arguments @("install", "-y", "llvm", "--no-progress")
Invoke-Choco -Arguments @("install", "-y", "cmake", "--installargs", "ADD_CMAKE_TO_PATH=System", "--no-progress")

$clangCommand = Get-Command -Name "clang.exe" -ErrorAction Stop
$llvmBin = Split-Path -Parent $clangCommand.Path
Add-PathIfMissing -PathToAdd $llvmBin
$env:LIBCLANG_PATH = $llvmBin
$env:CLANG_PATH = $clangCommand.Path

if ($isGithub) {
  Add-Content -Path $env:GITHUB_ENV -Value "LIBCLANG_PATH=$llvmBin"
  Add-Content -Path $env:GITHUB_ENV -Value "CLANG_PATH=$($clangCommand.Path)"
  Add-Content -Path $env:GITHUB_PATH -Value $llvmBin
}

if ($EnableGpu) {
  $vulkanVersion = if ($env:VOQUILL_VULKAN_SDK_VERSION) { $env:VOQUILL_VULKAN_SDK_VERSION } else { "1.3.290.0" }
  $vulkanRoot = if ($env:VOQUILL_VULKAN_SDK_ROOT) { $env:VOQUILL_VULKAN_SDK_ROOT } else { "C:\VulkanSDK" }

  Install-VulkanSdk -Version $vulkanVersion -InstallRoot $vulkanRoot -EmitGithubEnv:$isGithub

  try {
    $glslcPath = (Get-Command -Name "glslc.exe" -ErrorAction Stop).Path
    Write-Host "[OK] glslc detected at $glslcPath"
  }
  catch {
    Write-Warning "[WARN] glslc.exe not found in PATH. Verify the Vulkan SDK installation if GPU builds fail."
  }
}

Write-Host "[OK] Windows dependencies installed."
if ($EnableGpu) {
  Write-Host "[INFO] GPU dependencies ready. Rebuild with 'npm run dev:windows:gpu --workspace apps/desktop'."
}
else {
  Write-Host "[INFO] GPU dependencies were skipped. Set VOQUILL_ENABLE_GPU=1 or rerun with -EnableGpu to install them."
}
