$ErrorActionPreference = "Stop"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  $psqlPath = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
} else {
  $psqlPath = $psql.Source
}
if (-not $psqlPath) { throw "psql not found" }

$env:PGPASSWORD = "panpan_dev_password"
& $psqlPath -U postgres -h localhost -p 5432 -c "SELECT 1" | Out-Null

& $psqlPath -U postgres -h localhost -p 5432 -c @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'panpan') THEN
    CREATE ROLE panpan LOGIN PASSWORD 'panpan_dev_password';
  END IF;
END
`$`$;
"@

& $psqlPath -U postgres -h localhost -p 5432 -c "SELECT 1 FROM pg_database WHERE datname = 'panpan_wonder_house'" |
  Select-String "1" | Out-Null
$dbExists = & $psqlPath -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname='panpan_wonder_house'"
if ($dbExists -ne "1") {
  & $psqlPath -U postgres -h localhost -p 5432 -c "CREATE DATABASE panpan_wonder_house OWNER panpan;"
}

Write-Host "Database ready: panpan_wonder_house"
