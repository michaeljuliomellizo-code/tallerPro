param(
  [switch]$SkipBuild,
  [switch]$SkipHealth,
  [string]$HealthUrl = "http://localhost:3000/api/health"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

$failed = 0
$checks = 0

function Pass([string]$message) {
  Write-Host "OK   - $message" -ForegroundColor Green
}

function Warn([string]$message) {
  Write-Host "WARN - $message" -ForegroundColor Yellow
}

function Fail([string]$message) {
  Write-Host "FAIL - $message" -ForegroundColor Red
  $script:failed++
}

function Check([string]$message, [scriptblock]$test) {
  $script:checks++
  try {
    if (& $test) {
      Pass $message
    } else {
      Fail $message
    }
  } catch {
    Fail "$message :: $($_.Exception.Message)"
  }
}

function Find-RoutePage([string]$route) {
  $appRoot = Join-Path $root "app"
  if (-not (Test-Path $appRoot)) { return $false }

  $segments = $route -split "/"
  $directories = Get-ChildItem -Path $appRoot -Directory -Recurse -ErrorAction SilentlyContinue

  foreach ($dir in $directories) {
    if ($dir.Name -ne $segments[-1]) { continue }

    $current = $dir
    $ok = $true

    for ($i = $segments.Length - 1; $i -ge 0; $i--) {
      if ($current.Name -ne $segments[$i]) {
        $ok = $false
        break
      }
      $current = $current.Parent
    }

    if ($ok -and (
      (Test-Path (Join-Path $dir "page.tsx")) -or
      (Test-Path (Join-Path $dir "page.jsx")) -or
      (Test-Path (Join-Path $dir "page.js"))
    )) {
      return $true
    }
  }

  # Caso directo: ruta agrupada, por ejemplo app/(app)/portal/page.tsx.
  $directCandidates = @(
    Get-ChildItem -Path $appRoot -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -in @("page.tsx","page.jsx","page.js") -and
        $_.Directory.Name -eq $segments[-1]
      }
  )

  return $directCandidates.Count -gt 0
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "TallerPro - QA funcional Lote 10 (corrección)" -ForegroundColor Cyan
Write-Host "Raiz: $root" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Estructura base" -ForegroundColor White

Check "package.json" {
  Test-Path (Join-Path $root "package.json")
}

Check "package-lock.json" {
  Test-Path (Join-Path $root "package-lock.json")
}

Check "lib/tallerpro/config.ts" {
  Test-Path (Join-Path $root "lib\tallerpro\config.ts")
}

Check "lib/tallerpro/workshop-branding.ts" {
  Test-Path (Join-Path $root "lib\tallerpro\workshop-branding.ts")
}

Check "lib/tallerpro/workshop-storage.ts" {
  Test-Path (Join-Path $root "lib\tallerpro\workshop-storage.ts")
}

Write-Host ""
Write-Host "2. Rutas funcionales esperadas" -ForegroundColor White

$routes = @(
  "dashboard",
  "clientes",
  "motocicletas",
  "agenda",
  "recepcion",
  "ordenes",
  "cotizaciones",
  "facturacion",
  "finanzas",
  "inventario",
  "mecanicos",
  "reportes",
  "configuracion",
  "pos",
  "portal",
  "notificaciones",
  "automatizaciones",
  "auditoria"
)

foreach ($route in $routes) {
  Check "/$route" {
    Find-RoutePage $route
  }
}

Write-Host ""
Write-Host "3. Archivos de estabilidad" -ForegroundColor White

Check "app/loading.tsx" {
  Test-Path (Join-Path $root "app\loading.tsx")
}

Check "app/error.tsx" {
  Test-Path (Join-Path $root "app\error.tsx")
}

Check "app/not-found.tsx" {
  Test-Path (Join-Path $root "app\not-found.tsx")
}

Write-Host ""
Write-Host "4. Branding visible de runtime" -ForegroundColor White

Check "Logo TallerPro" {
  Test-Path (Join-Path $root "public\tallerpro-logo.png")
}

# Solo audita archivos de runtime. No marca:
# - lib/motomil/* (namespace técnico interno, todavía válido)
# - READMEs históricos
# - scripts de migración anteriores
# - comentarios internos
$runtimeRoots = @(
  (Join-Path $root "app"),
  (Join-Path $root "components")
)

$runtimeFiles = foreach ($runtimeRoot in $runtimeRoots) {
  if (Test-Path $runtimeRoot) {
    Get-ChildItem -Path $runtimeRoot -Recurse -File -ErrorAction SilentlyContinue
  }
}

$patterns = @(
  'MotoMil\s+Taller',
  'MOTOMIL\s+TALLER',
  'MotoMil\s+-',
  'admin@motomil\.com',
  '/assets/motomil-logo',
  'motomil-logo\.(png|jpeg|jpg)',
  'logo-motomil'
)

$legacyHits = $runtimeFiles |
  Select-String -Pattern $patterns -ErrorAction SilentlyContinue |
  Where-Object {
    # Las rutas @/lib/motomil/* son namespace técnico interno.
    # No son branding visible y no deben generar FAIL.
    $_.Line -notmatch '@[\/\\]lib[\/\\]motomil[\/\\]' -and
    $_.Line -notmatch '[\/\\]lib[\/\\]motomil[\/\\]'
  }

if ($legacyHits) {
  Fail "Se encontraron referencias visibles antiguas en runtime"

  $legacyHits |
    Select-Object -First 30 |
    ForEach-Object {
      Write-Host "     $($_.Path):$($_.LineNumber) $($_.Line.Trim())" -ForegroundColor DarkYellow
    }
}
else {
  Pass "No se encontraron referencias antiguas visibles en runtime"
}
Write-Host ""
Write-Host "5. Logica de branding por organizacion" -ForegroundColor White

$brandingSource = Get-Content (Join-Path $root "lib\tallerpro\workshop-branding.ts") -Raw
$storageSource = Get-Content (Join-Path $root "lib\tallerpro\workshop-storage.ts") -Raw

Check "workshop-branding usa organizations" {
  $brandingSource -match 'from\("organizations"\)'
}

Check "workshop-branding contempla logo_url" {
  $brandingSource -match 'logo_url'
}

Check "Storage usa bucket organization-assets" {
  $storageSource -match 'organization-assets'
}

Check "Storage genera rutas por organizationId" {
  $storageSource -match '\$\{organizationId\}/logo'
}

Write-Host ""
Write-Host "6. Build" -ForegroundColor White

if ($SkipBuild) {
  Warn "Build omitido por parametro -SkipBuild"
} else {
  Write-Host "Ejecutando npm run build..." -ForegroundColor DarkGray
  npm run build

  if ($LASTEXITCODE -eq 0) {
    Pass "npm run build"
  } else {
    Fail "npm run build"
  }
}

Write-Host ""
Write-Host "7. Health endpoint" -ForegroundColor White

if ($SkipHealth) {
  Warn "Health omitido por parametro -SkipHealth"
} else {
  try {
    $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 8
    $body = $response.Content

    if (
      $response.StatusCode -ge 200 -and
      $response.StatusCode -lt 300 -and
      $body -match '"status"\s*:\s*"ok"'
    ) {
      Pass "Health responde status=ok"
    } else {
      Fail "Health respondio, pero no contiene status=ok"
      Write-Host "     $body" -ForegroundColor DarkYellow
    }
  } catch {
    Warn "No se pudo consultar $HealthUrl. Arranca Next.js y repite."
  }
}

Write-Host ""
Write-Host "8. Git" -ForegroundColor White

Check "Repositorio Git" {
  Test-Path (Join-Path $root ".git")
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Resultado QA Lote 10" -ForegroundColor Cyan
Write-Host "Checks: $checks" -ForegroundColor Cyan
Write-Host "Fallos: $failed" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if ($failed -eq 0) {
  Write-Host "QA TECNICO OK" -ForegroundColor Green
  exit 0
}

Write-Host "QA TECNICO CON FALLOS" -ForegroundColor Red
exit 1
