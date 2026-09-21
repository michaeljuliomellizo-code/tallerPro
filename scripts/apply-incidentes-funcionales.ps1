$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

$legacyPortal = Join-Path $root "app\(app)\(portal)"

if (Test-Path $legacyPortal) {
    Write-Host "Eliminando ruta antigua del portal: $legacyPortal" -ForegroundColor Yellow
    Remove-Item $legacyPortal -Recurse -Force
}

Write-Host "" 
Write-Host "Corrección de incidentes funcionales preparada." -ForegroundColor Green
Write-Host "" 
Write-Host "Siguiente paso obligatorio:" -ForegroundColor Cyan
Write-Host "1. Ejecutar supabase\migrations\20260920_incidentes_funcionales.sql en Supabase SQL Editor." -ForegroundColor White
Write-Host "2. Ejecutar npm run build." -ForegroundColor White
Write-Host "3. Levantar npm run dev y probar los escenarios indicados en APLICAR.md." -ForegroundColor White
