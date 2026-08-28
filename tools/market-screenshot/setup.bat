@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ===============================================
echo  HOHAENG MARKET MAP 자동 캡처 설치
echo ===============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js가 설치되어 있지 않습니다.
  echo 호행처럼 개발에 사용하는 Node.js를 먼저 설치한 뒤 다시 실행해주세요.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [오류] npm을 찾지 못했습니다.
  pause
  exit /b 1
)

for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
  echo [오류] Node.js 20 이상이 필요합니다. 현재 버전을 먼저 업데이트해주세요.
  node -v
  pause
  exit /b 1
)

echo [1/4] Playwright 설치 중...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo.
echo [2/4] 자동 캡처용 Chromium 설치 중...
call npx playwright install chromium
if errorlevel 1 goto :fail

echo.
echo [3/4] Windows 작업 스케줄러 등록 중...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-scheduler.ps1"
if errorlevel 1 (
  echo [주의] 작업 스케줄러 자동 등록에 실패했습니다.
  echo PowerShell을 관리자 권한으로 열고 아래 파일을 직접 실행하면 됩니다.
  echo %~dp0install-scheduler.ps1
) else (
  echo [완료] 평일 오전 8:10 자동 실행 등록 완료
)

echo.
echo [4/4] 지금 바로 테스트 촬영을 실행합니다...
call "%~dp0run.bat" --force
if errorlevel 1 (
  echo.
  echo [주의] 설치는 끝났지만 테스트 촬영에서 오류가 발생했습니다.
  echo 바탕화면의 HOHAENG_시황_스크린샷\_errors 폴더와 _logs 폴더를 확인해주세요.
  pause
  exit /b 1
)

echo.
echo ===============================================
echo  설치 완료
echo ===============================================
echo 바탕화면 ^> HOHAENG_시황_스크린샷 폴더를 확인해주세요.
echo 이후 평일 오전 8:10에 새 장마감 데이터가 있을 때만 6장이 저장됩니다.
echo.
pause
exit /b 0

:fail
echo.
echo [오류] 설치 중 문제가 발생했습니다.
echo 인터넷 연결과 Node.js/npm 상태를 확인한 뒤 setup.bat을 다시 실행해주세요.
pause
exit /b 1
