param([switch]$Offline, [switch]$IncludeUnitTests)
$ErrorActionPreference = 'Stop'
$backend = Split-Path $PSScriptRoot -Parent
$settingsPath = Join-Path $backend 'target/module-e-test/connection.json'
if (-not (Test-Path -LiteralPath $settingsPath)) { throw 'Run scripts/New-ModuleETestDatabase.ps1 first, or configure OPERATIONS_TEST_* and invoke Maven directly.' }
$settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
$previous = @{}
try {
    foreach ($key in @('OPERATIONS_TEST_JDBC_URL','OPERATIONS_TEST_USERNAME','OPERATIONS_TEST_PASSWORD')) {
        $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, $settings.$key, 'Process')
    }
    $selection = if ($IncludeUnitTests) { '*ServiceTests,OperationsJwtSecurityTests,FeedbackSqlServerTests' } else { 'FeedbackSqlServerTests' }
    $mavenArgs = @('-f', (Join-Path $backend 'pom.xml'), "-Dtest=$selection", 'test')
    if ($Offline) { $mavenArgs = @('-o') + $mavenArgs }
    & (Join-Path $backend 'mvnw.cmd') @mavenArgs
    if ($LASTEXITCODE -ne 0) { throw 'Module E feedback SQL integration tests failed.' }
} finally {
    foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
}
