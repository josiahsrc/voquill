; Voquill NSIS Installer Hooks
; Bundles Visual C++ Runtime DLLs directly from the CI build machine

!macro NSIS_HOOK_POSTINSTALL
  ; Copy VC++ 2015-2022 Runtime DLLs to installation directory
  ; These are embedded at NSIS compile time from the CI runner's System32
  ; The DLLs are placed alongside the exe so Windows finds them automatically

  DetailPrint "Installing Visual C++ Runtime DLLs..."
  SetOutPath "$INSTDIR"

  ; Bundle the required MSVC runtime DLLs directly
  ; These paths exist on GitHub Actions windows-latest runners
  File "C:\Windows\System32\msvcp140.dll"
  File "C:\Windows\System32\vcruntime140.dll"
  File "C:\Windows\System32\vcruntime140_1.dll"

  DetailPrint "Visual C++ Runtime DLLs installed"
!macroend
