# HOHAENG MARKET MAP 자동 스크린샷

`https://hohaeng.vercel.app/data/market-map`의 장마감 화면에서 NASDAQ 100과 S&P 500을 각각 선택해 아래 6장을 자동으로 저장합니다.

1. `01_NASDAQ100_상승하락.png`
2. `02_NASDAQ100_히트맵.png`
3. `03_NASDAQ100_섹터.png`
4. `04_SP500_상승하락.png`
5. `05_SP500_히트맵.png`
6. `06_SP500_섹터.png`

## 저장 위치

기본값은 Windows의 실제 바탕화면 경로를 자동으로 찾습니다.

```text
바탕화면
└─ HOHAENG_시황_스크린샷
   ├─ 2026-08-27
   │  ├─ 01_NASDAQ100_상승하락.png
   │  ├─ 02_NASDAQ100_히트맵.png
   │  ├─ 03_NASDAQ100_섹터.png
   │  ├─ 04_SP500_상승하락.png
   │  ├─ 05_SP500_히트맵.png
   │  └─ 06_SP500_섹터.png
   ├─ _errors
   └─ _logs
```

폴더명은 실행한 날짜가 아니라 **MARKET MAP에 표시된 실제 장마감 거래일**을 사용합니다.

## 최초 1회 설치

호행처럼 프로젝트를 최신 상태로 받은 뒤 Windows 탐색기에서 다음 파일을 더블클릭합니다.

```text
tools\market-screenshot\setup.bat
```

`setup.bat`이 자동으로 다음 작업을 처리합니다.

1. Node.js 20 이상 확인
2. Playwright 설치
3. Chromium 설치
4. Windows 작업 스케줄러 등록
5. 즉시 강제 테스트 촬영

설치가 끝나면 바탕화면의 `HOHAENG_시황_스크린샷` 폴더를 확인합니다.

## 자동 실행 시간

미국 월~금 정규장은 한국 시간으로 **화~토 새벽**에 끝납니다. 따라서 금요일 미국장까지 토요일 아침에 바로 저장되도록 한국 시간 기준으로 아래처럼 등록합니다.

```text
작업 이름: HOHAENG Market Screenshot
실행 시간: 화~토 오전 8:10 (한국 Windows 시간 기준)
```

미국 서머타임에는 한국 시간 오전 5시, 겨울시간에는 오전 6시 전후에 정규장이 끝나므로 오전 8:10이면 두 기간 모두 장 마감 데이터가 준비될 시간을 확보할 수 있습니다.

오전 8:10에 PC가 꺼져 있어도 `StartWhenAvailable` 설정으로 다음 실행 가능한 시점에 작업이 시작됩니다.

미국 휴장일, 아직 새 데이터가 없는 날에는 MARKET MAP의 거래일이 이전 촬영일과 같으므로 **중복 저장하지 않고 종료**합니다.

또한 NASDAQ100과 S&P500의 장마감 기준일이 서로 다르면 서로 다른 날짜의 이미지를 섞지 않도록 촬영을 중단합니다.

## 수동 촬영

새 데이터가 있을 때만 촬영:

```bat
run.bat
```

같은 거래일이라도 다시 촬영:

```bat
run.bat --force
```

브라우저가 실제로 움직이는 모습을 보면서 점검:

```bat
run.bat --force --headed
```

## 자동 실행 해제

PowerShell에서 다음 파일을 실행합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall-scheduler.ps1
```

## 오류가 날 때

먼저 아래 두 폴더를 확인합니다.

```text
바탕화면\HOHAENG_시황_스크린샷\_logs
바탕화면\HOHAENG_시황_스크린샷\_errors
```

- `_logs\market-screenshot.log`: 어느 단계에서 실패했는지 기록
- `_errors\ERROR_날짜_시간.png`: 실패 당시 MARKET MAP 전체 화면

### Playwright/Chromium 관련 오류

`setup.bat`을 다시 실행합니다.

### Windows 작업 스케줄러가 등록되지 않은 경우

PowerShell을 관리자 권한으로 열고 다음을 실행합니다.

```powershell
cd <호행처럼 프로젝트 경로>\tools\market-screenshot
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-scheduler.ps1
```

### 프로젝트 폴더를 다른 위치로 옮긴 경우

작업 스케줄러에는 설치 당시의 절대 경로가 들어갑니다. 프로젝트 위치를 옮겼다면 `setup.bat`을 다시 실행해 작업을 갱신합니다.

## 설정 변경

기본 사이트 주소:

```text
https://hohaeng.vercel.app/data/market-map
```

다른 주소를 테스트할 때는 환경 변수 `HOHAENG_MARKET_MAP_URL`을 사용할 수 있습니다.

이미지 저장 위치를 바꾸려면 `HOHAENG_SCREENSHOT_DIR` 환경 변수에 원하는 폴더를 지정합니다.

## 웹사이트 성능 영향

이 도구의 Playwright와 Chromium은 `tools/market-screenshot` 아래의 별도 Node 프로젝트로 설치됩니다. 호행처럼 웹앱의 루트 `package.json`과 분리되어 있으므로 Vercel 빌드 번들이나 실제 방문자 페이지에 Playwright가 포함되지 않습니다.
