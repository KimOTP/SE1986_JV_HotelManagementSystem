param(
    [string]$Server = 'tcp:localhost,1433',
    [ValidatePattern('^[A-Za-z][A-Za-z0-9_]*_module_e_test$')]
    [string]$Database = 'HotelManagement_Feedback_module_e_test'
)
$ErrorActionPreference = 'Stop'
$backend = Split-Path $PSScriptRoot -Parent
$target = Join-Path $backend 'target/module-e-test'
New-Item -ItemType Directory -Force -Path $target | Out-Null
$schema = Get-Content (Join-Path $backend 'docs/sql/01_schema_complete_module_b.sql') -Raw
$schema = $schema.Replace('HotelManagement_SBA', $Database)
$schemaPath = Join-Path $target 'schema.sql'
Set-Content -LiteralPath $schemaPath -Value $schema -Encoding utf8
# Schema refuses an existing database. Stop immediately; never drop/reset a database.
& sqlcmd -S $Server -E -C -I -b -f 65001 -i $schemaPath
if ($LASTEXITCODE -ne 0) { throw 'Database creation failed. Existing databases are left intact.' }
$loginName = 'module_e_test_' + [guid]::NewGuid().ToString('N').Substring(0,12)
$testPassword = 'E!' + [guid]::NewGuid().ToString('N') + 'a9'
# A separate login, with privileges only inside the new disposable test database.
$sql = @"
USE master;
CREATE LOGIN [$loginName] WITH PASSWORD=N'$testPassword', CHECK_POLICY=ON;
GO
USE [$Database];
CREATE USER [$loginName] FOR LOGIN [$loginName];
ALTER ROLE db_owner ADD MEMBER [$loginName];
GO
"@
$sql | & sqlcmd -S $Server -E -C -b
if ($LASTEXITCODE -ne 0) { throw 'Test login creation failed. Do not use the shared database as a fallback.' }
# Keep credentials under ignored target/, never in tracked configuration or output.
$hostPort = $Server -replace '^tcp:', '' -replace ',', ':'
$settings = @{
    OPERATIONS_TEST_JDBC_URL = "jdbc:sqlserver://$hostPort;databaseName=$Database;encrypt=true;trustServerCertificate=true"
    OPERATIONS_TEST_USERNAME = $loginName
    OPERATIONS_TEST_PASSWORD = $testPassword
}
$settings | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $target 'connection.json') -Encoding utf8
Write-Output "Created isolated database: $Database"
Write-Output 'Connection settings saved under ignored target/module-e-test/connection.json; password not printed.'
Write-Output 'No changes were made to HotelManagement_SBA. Test database/login remain available for repeat runs.'
