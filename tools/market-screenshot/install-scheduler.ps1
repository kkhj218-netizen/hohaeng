$ErrorActionPreference = "Stop"

$taskName = "HOHAENG Market Screenshot"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$captureScript = Join-Path $scriptDir "capture-market.mjs"
$nodePath = (Get-Command node -ErrorAction Stop).Source

if (-not (Test-Path $captureScript)) {
    throw "capture-market.mjs 파일을 찾지 못했습니다: $captureScript"
}

$action = New-ScheduledTaskAction `
    -Execute $nodePath `
    -Argument ('"' + $captureScript + '"') `
    -WorkingDirectory $scriptDir

$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday `
    -At 8:10AM

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 20) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "평일 오전 8시 10분 HOHAENG MARKET MAP NASDAQ100/S&P500 6장 자동 캡처" `
    -Force | Out-Null

Write-Host ""
Write-Host "[HOHAENG] Windows 작업 스케줄러 등록 완료" -ForegroundColor Green
Write-Host "작업 이름: $taskName"
Write-Host "실행 시각: 평일 오전 8:10 (Windows 현지 시간)"
Write-Host "PC가 해당 시각에 꺼져 있으면 다음 사용 가능 시점에 실행되도록 설정했습니다."
