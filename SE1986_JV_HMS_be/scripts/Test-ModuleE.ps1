param(
    [string]$BaseUrl = 'http://127.0.0.1:8080',
    [switch]$WriteDemoData,
    [string]$ManagerEmail = 'manager@sba.example',
    [string]$StaffEmail = 'housekeeper@sba.example',
    [string]$CustomerEmail = 'customer@sba.example',
    [Security.SecureString]$Password
)
$ErrorActionPreference = 'Stop'
$apiRoot = $BaseUrl.TrimEnd('/') + '/api/operations'
if (-not ([uri]$BaseUrl).IsLoopback) { throw 'This test script only supports a local backend.' }
function Read-Api([string]$Path) {
    $response = Invoke-RestMethod -Uri ($apiRoot + $Path) -Headers $script:headers -TimeoutSec 20
    # Explicitly enumerate JSON arrays: [] must yield zero rows, not one nested array.
    foreach ($item in $response) { Write-Output $item }
}
function Send-Api([string]$Method, [string]$Path, $Body) {
    $json = ConvertTo-Json -InputObject $Body -Depth 5 -Compress
    Invoke-RestMethod -Method $Method -Uri ($apiRoot + $Path) -Headers $script:headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) -TimeoutSec 20
}
function Assert-That([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}
function Find-MyTask([long]$Id, [string]$RoomNumber) {
    $encodedRoom = [uri]::EscapeDataString($RoomNumber)
    for ($pageIndex = 0; $pageIndex -lt 50; $pageIndex++) {
        $rows = @(Read-Api "/my-tasks?page=$pageIndex&size=100&room=$encodedRoom")
        $match = $rows | Where-Object { $_.id -eq $Id } | Select-Object -First 1
        if ($null -ne $match) { return $match }
        if ($rows.Count -lt 100) { break }
    }
    throw "Created task $Id is not visible to the signed-in staff."
}
if ($null -eq $Password) { $Password = Read-Host 'Password for the three local test accounts' -AsSecureString }
function Login-As([string]$Email) {
    $plain = [Net.NetworkCredential]::new('', $Password).Password
    try {
        $json = @{ email=$Email; password=$plain } | ConvertTo-Json -Compress
        $session = Invoke-RestMethod -Method Post -Uri ($BaseUrl.TrimEnd('/') + '/api/auth/login') -ContentType 'application/json' -Body $json -TimeoutSec 20
        return @{Authorization='Bearer ' + $session.accessToken}
    } finally { $plain = $null; $json = $null }
}
$managerHeaders = Login-As $ManagerEmail
$staffHeaders = Login-As $StaffEmail
$customerHeaders = Login-As $CustomerEmail
$script:headers = $managerHeaders
$manager = Read-Api '/issue-assignment-context'
Assert-That $manager.enabled 'The signed-in manager needs an active ADMIN/MANAGER role.'
$script:headers = $staffHeaders
$worker = Read-Api '/issue-work-context'
$reporter = Read-Api '/issue-reporting-context'
Assert-That $worker.enabled 'The signed-in staff needs an active STAFF record and role.'
$null = Read-Api '/my-tasks?page=0&size=5'
$script:headers = $customerHeaders
$customer = Read-Api '/feedback-customer-context'
Assert-That $customer.enabled 'The signed-in customer needs an active CUSTOMER role.'
$null = Read-Api '/my-feedback?page=0&size=5'
$bookings = @(Read-Api '/feedback-bookings')
Write-Output "Eligible feedback bookings: $($bookings.Count). No review will be created by this script."
$script:headers = $managerHeaders
$day = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(7)).ToString('yyyy-MM-dd')
$script:headers = $managerHeaders
$dashboard = Read-Api "/dashboard?date=$day&zone=Asia%2FBangkok&allTime=true"
Assert-That ($null -ne $dashboard.summary) 'Dashboard returned no summary.'
Assert-That ($dashboard.summary.total -eq ($dashboard.summary.pending + $dashboard.summary.inProgress + $dashboard.summary.completed + $dashboard.summary.cancelled)) 'Dashboard status totals do not reconcile.'
$null = Read-Api '/tasks?page=0&size=5'
$null = Read-Api '/issues?page=0&size=5'
$null = Read-Api '/feedback?page=0&size=5'
Write-Output 'PASS: API reads and dashboard status totals.'
if (-not $WriteDemoData) {
    Write-Output 'Read-only run complete. Add -WriteDemoData only against a disposable demo database to test task/issue writes.'
    return
}
Assert-That $worker.enabled 'Staff context must be enabled for the write test.'
$selectedRoom = $null
foreach ($room in @(Read-Api '/task-rooms')) {
    $staff = @(Read-Api "/task-assignees?roomId=$($room.id)")
    if ($staff | Where-Object { $_.id -eq $worker.staffId }) { $selectedRoom = $room; break }
}
Assert-That ($null -ne $selectedRoom) 'No manager-accessible room can be assigned to the signed-in staff.'
$tag = 'SMOKE-E-' + [DateTimeOffset]::UtcNow.ToString('yyyyMMddHHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,4)
$task = Send-Api 'Post' '/tasks' @{
    roomId = $selectedRoom.id; staffId = $worker.staffId; taskType = 'CLEANING'; title = $tag
    description = 'Module E task lifecycle test'; priority = 'NORMAL'
    scheduledAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fff')
}
Write-Output "Created demo task ID $($task.id), tag $tag. This record is retained for inspection."
Assert-That ($task.status -eq 'PENDING') 'New task is not PENDING.'
$script:headers = $staffHeaders
$visible = Find-MyTask $task.id $selectedRoom.roomNumber
Assert-That ($visible.status -eq 'PENDING') 'Assigned staff cannot see the pending task.'
$started = Send-Api 'Patch' "/my-tasks/$($task.id)/start" @{}
Assert-That ($started.status -eq 'IN_PROGRESS') 'Start did not return IN_PROGRESS.'
$completed = Send-Api 'Patch' "/my-tasks/$($task.id)/complete" @{}
Assert-That ($completed.status -eq 'COMPLETED') 'Complete did not return COMPLETED.'
$visible = Find-MyTask $task.id $selectedRoom.roomNumber
Assert-That ($visible.status -eq 'COMPLETED' -and $null -ne $visible.startedAt -and $null -ne $visible.completedAt) 'Task timestamps/state did not persist.'
$script:headers = $managerHeaders
$managerRows = @(Read-Api '/tasks?page=0&size=100')
Assert-That (@($managerRows | Where-Object { $_.id -eq $task.id -and $_.status -eq 'COMPLETED' }).Count -eq 1) 'Manager does not see the completed task.'
Write-Output 'PASS: Manager create -> staff start -> staff complete -> manager refresh.'
if ($reporter.enabled) {
    $script:headers = $staffHeaders
    $issue = Send-Api 'Post' '/issues' @{ roomId = $selectedRoom.id; issueTypeId = @(Read-Api '/issue-types')[0].id; title = $tag; description = 'Module E issue lifecycle test'; priority = 'NORMAL' }
    Write-Output "Created demo issue ID $($issue.id). This record is retained for inspection."
    $script:headers = $managerHeaders
    $null = Send-Api 'Patch' "/issues/$($issue.id)/assignment" @{staffId=$worker.staffId}
    $script:headers = $staffHeaders
    $null = Send-Api 'Patch' "/issues/$($issue.id)/start" @{}
    $resolved = Send-Api 'Patch' "/issues/$($issue.id)/resolve" @{resolutionNote='Fixed during Module E smoke test'}
    Assert-That ($resolved.status -eq 'RESOLVED') 'Issue was not resolved.'
    $issues = @(Read-Api '/issues?page=0&size=100')
    Assert-That (@($issues | Where-Object { $_.id -eq $issue.id -and $_.resolutionNote -and $_.resolvedAt }).Count -eq 1) 'Resolution note/time did not persist.'
    Write-Output 'PASS: Issue create -> assign -> start -> resolve.'
}
$dashboard = Read-Api "/dashboard?date=$day&zone=Asia%2FBangkok&allTime=true"
Assert-That ($dashboard.summary.completed -ge 1) 'Dashboard did not include completed task.'
Write-Output 'PASS: dashboard reflects write test. Only operations tasks/issues were written; login may create auth refresh-token records.'
