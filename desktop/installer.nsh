!macro customHeader
  !define MUI_WELCOMEPAGE_TITLE "Welcome to HK-Ai"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TEXT "A secure AI workspace for chat, models, research, and WhatsApp Web.$\r$\n$\r$\nHK-Ai runs its local service automatically and keeps your provider credentials protected on this device."
  !define MUI_FINISHPAGE_TITLE "HK-Ai is ready"
  !define MUI_FINISHPAGE_TEXT "Installation is complete.$\r$\n$\r$\nLaunch HK-Ai, sign in, and add your own provider API key from Settings → AI APIs."
!macroend

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend
