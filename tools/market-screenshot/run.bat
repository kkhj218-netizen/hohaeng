@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist "node_modules\playwright\package.json" (
  echo [HOHAENG] Playwright가 설치되어 있지 않습니다.
  echo 먼저 setup.bat을 한 번 실행해주세요.
  exit /b 2
)

node capture-market.mjs %*
set EXIT_CODE=%ERRORLEVEL%

endlocal & exit /b %EXIT_CODE%
