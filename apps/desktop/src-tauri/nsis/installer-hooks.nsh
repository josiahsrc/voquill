; Voquill NSIS Installer Hooks
; Installs Visual C++ 2015-2022 Redistributable (x64) if not already present

!include "LogicLib.nsh"

!macro NSIS_HOOK_POSTINSTALL
  ; Check if VC++ 2015-2022 x64 runtime is already installed
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"

  ${If} $0 != 1
    ; File is bundled via tauri.conf.json bundle.resources
    ${If} ${FileExists} "$INSTDIR\resources\vc_redist.x64.exe"
      DetailPrint "Installing Microsoft Visual C++ Runtime..."

      ; Run silently: /install /quiet /norestart
      nsExec::ExecToLog '"$INSTDIR\resources\vc_redist.x64.exe" /install /quiet /norestart'
      Pop $1

      ${If} $1 == 0
        DetailPrint "Visual C++ Runtime installed successfully"
      ${ElseIf} $1 == 3010
        DetailPrint "Visual C++ Runtime installed (restart may be required later)"
      ${Else}
        DetailPrint "Visual C++ Runtime setup returned code $1 (continuing anyway)"
      ${EndIf}

      ; Clean up - delete the redistributable after installation
      Delete "$INSTDIR\resources\vc_redist.x64.exe"
    ${Else}
      DetailPrint "Note: VC++ Runtime installer not found in bundle"
    ${EndIf}
  ${Else}
    DetailPrint "Visual C++ Runtime already installed"
  ${EndIf}
!macroend
