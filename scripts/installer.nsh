!macro customInstall
  # 删掉默认以 productName 命名的快捷方式（"Phronesis Lite"）
  Delete "$newStartMenuLink"
  Delete "$newDesktopLink"

  # 新建名为"比赛专用"的开始菜单 / 桌面快捷方式，指向真实可执行文件
  CreateShortCut "$SMPROGRAMS\比赛专用.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  CreateShortCut "$DESKTOP\比赛专用.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0

  # 保持"安装完成后运行"可用（上面已删除默认快捷方式）
  StrCpy $launchLink "$SMPROGRAMS\比赛专用.lnk"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\比赛专用.lnk"
  Delete "$DESKTOP\比赛专用.lnk"
!macroend
