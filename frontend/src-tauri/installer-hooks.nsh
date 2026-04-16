; Kill the backend.exe process before install/uninstall so DLLs are not locked.
; Tauri invokes these macros via !ifmacrodef NSIS_HOOK_* in the generated installer.

!macro NSIS_HOOK_PREINSTALL
  ; Silently kill backend.exe if it is running (ignore errors if not found)
  nsExec::ExecToLog 'taskkill /F /IM "backend.exe"'
  ; Also kill the main app in case it's still running
  nsExec::ExecToLog 'taskkill /F /IM "Receipt Processor Pro.exe"'
  ; Brief pause to let OS release file handles
  Sleep 1000
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::ExecToLog 'taskkill /F /IM "backend.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "Receipt Processor Pro.exe"'
  Sleep 1000
!macroend
