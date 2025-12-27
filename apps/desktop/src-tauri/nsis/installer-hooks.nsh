; Voquill NSIS Installer Hooks
; Installs Visual C++ 2015-2022 Redistributable (x64) if not already present

!include "MUI2.nsh"
!include "x64.nsh"
!include "LogicLib.nsh"

!macro NSIS_HOOK_PREINSTALL
  ; Check if VC++ 2015-2022 x64 runtime is installed via registry
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"

  ${If} $0 != 1
    DetailPrint "Installing Microsoft Visual C++ Runtime..."

    ; Extract the bundled redistributable to temp directory
    SetOutPath "$PLUGINSDIR"

    ; Use /nonfatal so build doesn't fail if file is missing (for non-Windows builds)
    File "/nonfatal" "${PROJECTDIR}\resources\vc_redist.x64.exe"

    ; Check if extraction succeeded
    ${If} ${FileExists} "$PLUGINSDIR\vc_redist.x64.exe"
      ; Run silently: /install /quiet /norestart
      ; Exit code 0 = success, 3010 = success but reboot needed
      nsExec::ExecToLog '"$PLUGINSDIR\vc_redist.x64.exe" /install /quiet /norestart'
      Pop $1

      ${If} $1 == 0
        DetailPrint "Visual C++ Runtime installed successfully"
      ${ElseIf} $1 == 3010
        DetailPrint "Visual C++ Runtime installed (restart may be required later)"
      ${Else}
        ; Non-fatal: user may have a compatible version via Windows Update
        DetailPrint "Visual C++ Runtime setup returned code $1 (continuing anyway)"
      ${EndIf}

      ; Clean up
      Delete "$PLUGINSDIR\vc_redist.x64.exe"
    ${Else}
      ; File not bundled - warn but continue
      DetailPrint "Note: VC++ Runtime installer not bundled"
      DetailPrint "Install Visual C++ 2015-2022 Redistributable (x64) if app fails to start"
    ${EndIf}
  ${Else}
    DetailPrint "Visual C++ Runtime already installed"
  ${EndIf}
!macroend
