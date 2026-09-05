# PowerShell Backup Script
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "./backups"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$backupFile = "$backupDir/micaela_backup_$timestamp.sql"
Write-Host "[INFO] Iniciando backup de PostgreSQL..." -ForegroundColor Cyan
docker compose exec -T postgres pg_dump -U micaela_admin -d micaela_bastidas > $backupFile
Write-Host "[SUCCESS] Backup guardado en: $backupFile" -ForegroundColor Green
