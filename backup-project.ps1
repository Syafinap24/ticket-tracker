# ==============================================================================
# Script Backup Otomatis Seluruh Kode & Data Web Ticket Tracker
# Membuat file .zip berstempel waktu di folder 'backups'
# ==============================================================================

$ProgressPreference = 'SilentlyContinue'
$Root = $PSScriptRoot
if (-not $Root) {
    $Root = (Get-Location).Path
}

$backupDir = Join-Path $Root "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipPath = Join-Path $backupDir "ticket_tracker_full_backup_$timestamp.zip"

Write-Host "Sedang membuat backup project ke: $zipPath ..." -ForegroundColor Cyan

# Files to exclude: existing zip backups in backups directory
$tempDir = Join-Path $env:TEMP "tt_backup_$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Copy files excluding backups folder
    Get-ChildItem -Path $Root -Exclude "backups" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
    }

    # Compress archive
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
    
    $fileSize = (Get-Item $zipPath).Length / 1KB
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " [BERHASIL] Backup project berhasil dibuat!" -ForegroundColor Green
    Write-Host " Lokasi File : $zipPath" -ForegroundColor Yellow
    Write-Host " Ukuran File : $([Math]::Round($fileSize, 2)) KB" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
} finally {
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
