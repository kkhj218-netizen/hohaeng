$ErrorActionPreference = "SilentlyContinue"
$taskName = "HOHAENG Market Screenshot"

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -eq $task) {
    Write-Host "[HOHAENG] 등록된 자동 캡처 작업이 없습니다."
    exit 0
}

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Host "[HOHAENG] 자동 캡처 작업을 삭제했습니다." -ForegroundColor Green
