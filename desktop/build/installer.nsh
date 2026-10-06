; Always install for the current user (no administrator rights, no "all users" page).
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
