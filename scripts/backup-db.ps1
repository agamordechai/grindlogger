<#
.SYNOPSIS
  Dump the GrindLogger Postgres database to a timestamped, compressed file and prune old dumps.

.DESCRIPTION
  The production data lives in the grindlogger-db container on this laptop, so a disk failure loses
  everything. Point -Destination at a different drive or a synced cloud folder (OneDrive, Dropbox, ...)
  and schedule this script (see docs/runbooks/home-hosting.md, "Backups").

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1 -Destination D:\grindlogger-backups
#>
param(
  [Parameter(Mandatory = $true)][string]$Destination,
  [int]$KeepDays = 30,
  [string]$Container = 'grindlogger-db',
  [string]$DbUser = 'workout',
  [string]$DbName = 'workout_tracker'
)

$ErrorActionPreference = 'Stop'

New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sqlFile = Join-Path $Destination "grindlogger-$stamp.sql"
$zipFile = "$sqlFile.zip"

# pg_dump runs inside the container; stdout is captured as the plain-SQL dump.
docker exec $Container pg_dump -U $DbUser -d $DbName --no-owner --no-privileges | Out-File -FilePath $sqlFile -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed (exit $LASTEXITCODE)" }
if ((Get-Item $sqlFile).Length -lt 1024) { throw "Dump is suspiciously small; keeping $sqlFile for inspection" }

Compress-Archive -Path $sqlFile -DestinationPath $zipFile -Force
Remove-Item $sqlFile

Get-ChildItem -Path $Destination -Filter 'grindlogger-*.sql.zip' |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
  Remove-Item -Force

Write-Host "Backup written: $zipFile"
