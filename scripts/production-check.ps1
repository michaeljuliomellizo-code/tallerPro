$ErrorActionPreference = "Stop"

# ============================================================
# TallerPro - chequeo previo a producción
# ============================================================

# La raíz correcta es la carpeta padre de /scripts
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "TallerPro - chequeo previo a producción" -ForegroundColor Cyan
Write-Host "Raíz: $root" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# 1. package.json
# ------------------------------------------------------------

Write-Host "1. Verificando package.json..." -ForegroundColor Yellow

$packageJson = Join-Path $root "package.json"

if (!(Test-Path $packageJson)) {
    throw "No se encontró package.json en: $packageJson"
}

Write-Host "OK - package.json encontrado." -ForegroundColor Green
Write-Host ""

# ------------------------------------------------------------
# 2. package-lock.json
# ------------------------------------------------------------

Write-Host "2. Verificando package-lock.json..." -ForegroundColor Yellow

$packageLock = Join-Path $root "package-lock.json"

if (Test-Path $packageLock) {
    Write-Host "OK - package-lock.json encontrado." -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - No existe package-lock.json." -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 3. .env.local
# ------------------------------------------------------------

Write-Host "3. Verificando variables de entorno..." -ForegroundColor Yellow

$envLocal = Join-Path $root ".env.local"
$envFile = Join-Path $root ".env"

if (Test-Path $envLocal) {
    Write-Host "OK - .env.local encontrado." -ForegroundColor Green
}
elseif (Test-Path $envFile) {
    Write-Host "OK - .env encontrado." -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - No se encontró .env.local ni .env." -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 4. public/tallerpro-logo.png
# ------------------------------------------------------------

Write-Host "4. Verificando logo de TallerPro..." -ForegroundColor Yellow

$logo = Join-Path $root "public\tallerpro-logo.png"

if (Test-Path $logo) {
    Write-Host "OK - Logo encontrado: public\tallerpro-logo.png" -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - No se encontró public\tallerpro-logo.png" -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 5. next.config
# ------------------------------------------------------------

Write-Host "5. Verificando configuración de Next.js..." -ForegroundColor Yellow

$nextConfigTs = Join-Path $root "next.config.ts"
$nextConfigJs = Join-Path $root "next.config.js"
$nextConfigMjs = Join-Path $root "next.config.mjs"

if (
    (Test-Path $nextConfigTs) -or
    (Test-Path $nextConfigJs) -or
    (Test-Path $nextConfigMjs)
) {
    Write-Host "OK - Configuración de Next.js encontrada." -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - No se encontró next.config.*" -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 6. Supabase
# ------------------------------------------------------------

Write-Host "6. Verificando configuración Supabase..." -ForegroundColor Yellow

$envCandidates = @(
    $envLocal,
    $envFile
)

$envFound = $false

foreach ($file in $envCandidates) {

    if (!(Test-Path $file)) {
        continue
    }

    $content = Get-Content -Raw -Path $file

    $hasUrl =
        $content -match "NEXT_PUBLIC_SUPABASE_URL\s*="

    $hasKey =
        $content -match "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\s*="

    if ($hasUrl -and $hasKey) {
        Write-Host "OK - Variables principales de Supabase encontradas." -ForegroundColor Green
        $envFound = $true
        break
    }
}

if (!$envFound) {
    Write-Host "ADVERTENCIA - No se detectaron las variables principales de Supabase." -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 7. Branding
# ------------------------------------------------------------

Write-Host "7. Buscando referencias visibles antiguas de MotoMil..." -ForegroundColor Yellow

$excludedDirectories = @(
    "node_modules",
    ".next",
    ".git"
)

$files = Get-ChildItem `
    -Path $root `
    -Recurse `
    -File `
    -ErrorAction SilentlyContinue |
    Where-Object {

        $excluded = $false

        foreach ($dir in $excludedDirectories) {
            if ($_.FullName -match "\\$dir\\") {
                $excluded = $true
                break
            }
        }

        !$excluded
    }

$brandMatches = $files |
    Select-String `
        -Pattern "MotoMil Taller|MotoMil · Portal|logo-mototamil|motomil-logo" `
        -SimpleMatch `
        -ErrorAction SilentlyContinue

if ($brandMatches) {

    Write-Host "Se encontraron referencias antiguas:" -ForegroundColor Yellow

    $brandMatches |
        Select-Object Path, LineNumber, Line |
        Format-Table -AutoSize
}
else {
    Write-Host "OK - No se encontraron referencias antiguas de branding." -ForegroundColor Green
}

Write-Host ""

# ------------------------------------------------------------
# 8. lib/tallerpro
# ------------------------------------------------------------

Write-Host "8. Verificando configuración TallerPro..." -ForegroundColor Yellow

$tallerproConfig = Join-Path $root "lib\tallerpro\config.ts"
$brandingFile = Join-Path $root "lib\tallerpro\workshop-branding.ts"
$storageFile = Join-Path $root "lib\tallerpro\workshop-storage.ts"

if (Test-Path $tallerproConfig) {
    Write-Host "OK - lib\tallerpro\config.ts" -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - Falta lib\tallerpro\config.ts" -ForegroundColor Yellow
}

if (Test-Path $brandingFile) {
    Write-Host "OK - workshop-branding.ts" -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - Falta workshop-branding.ts" -ForegroundColor Yellow
}

if (Test-Path $storageFile) {
    Write-Host "OK - workshop-storage.ts" -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - Falta workshop-storage.ts" -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 9. Scripts SQL
# ------------------------------------------------------------

Write-Host "9. Verificando migraciones Supabase..." -ForegroundColor Yellow

$migrations = Join-Path $root "supabase\migrations"

if (Test-Path $migrations) {

    $sqlFiles = Get-ChildItem `
        -Path $migrations `
        -Filter "*.sql" `
        -File `
        -ErrorAction SilentlyContinue

    if ($sqlFiles.Count -gt 0) {
        Write-Host "OK - $($sqlFiles.Count) archivo(s) SQL encontrado(s)." -ForegroundColor Green
    }
    else {
        Write-Host "ADVERTENCIA - No se encontraron migraciones SQL." -ForegroundColor Yellow
    }

}
else {
    Write-Host "ADVERTENCIA - No existe supabase\migrations." -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 10. Git
# ------------------------------------------------------------

Write-Host "10. Verificando Git..." -ForegroundColor Yellow

$gitFolder = Join-Path $root ".git"

if (Test-Path $gitFolder) {
    Write-Host "OK - Repositorio Git inicializado." -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - No existe .git." -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 11. node_modules
# ------------------------------------------------------------

Write-Host "11. Verificando dependencias..." -ForegroundColor Yellow

$nodeModules = Join-Path $root "node_modules"

if (Test-Path $nodeModules) {
    Write-Host "OK - node_modules encontrado." -ForegroundColor Green
}
else {
    Write-Host "ADVERTENCIA - node_modules no existe. Ejecuta npm install." -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------
# 12. Resumen
# ------------------------------------------------------------

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Chequeo terminado" -ForegroundColor Green
Write-Host "Proyecto: TallerPro" -ForegroundColor White
Write-Host "Raíz: $root" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""