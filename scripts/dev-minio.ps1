$ErrorActionPreference = "Stop"
$dataDir = Join-Path $PSScriptRoot "..\.data\minio"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$env:MINIO_ROOT_USER = "panpanminio"
$env:MINIO_ROOT_PASSWORD = "panpanminio_dev_password"

$minio = Get-Command minio -ErrorAction SilentlyContinue
if (-not $minio) {
  $candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\minio.exe",
    "$env:ProgramFiles\MinIO\minio.exe",
    "$env:LOCALAPPDATA\Programs\MinIO\minio.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { $minioPath = $c; break }
  }
  if (-not $minioPath) { throw "minio.exe not found. Install MinIO.Server via winget." }
} else {
  $minioPath = $minio.Source
}

Write-Host "Starting MinIO from $minioPath"
& $minioPath server $dataDir --address ":9000" --console-address ":9001"
