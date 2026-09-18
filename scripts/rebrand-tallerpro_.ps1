$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$replacements = @{
    "README.md" = @(
        @("# MotoMil Taller — Plataforma Integral de Gestión",
          "# TallerPro — Plataforma Integral de Gestión"),
        @("![MotoMil](./public/logo-mototamil.jpeg)",
          "![TallerPro](./public/tallerpro-logo.png)")
    )

    "README.txt" = @(
        @("MOTOMIL - PORTAL DEL CLIENTE 2.0",
          "TALLERPRO - PORTAL DEL CLIENTE 2.0")
    )

    "docs/ARCHITECTURE.md" = @(
        @("# Arquitectura — MotoMil Taller",
          "# Arquitectura — TallerPro")
    )

    "docs/TESTING.md" = @(
        @("# Plan de pruebas — MotoMil Taller",
          "# Plan de pruebas — TallerPro")
    )

    "docs/ROADMAP.md" = @(
        @("UX / UI MotoMil.",
          "UX / UI TallerPro.")
    )

    "app/api/health/route.ts" = @(
        @('service:"motomil-taller"',
          'service:"tallerpro"')
    )

    "components/agenda-client.tsx" = @(
        @("utilizado en el resto de MotoMil.",
          "utilizado en el resto de TallerPro.")
    )

    "components/dashboard-client.tsx" = @(
        @("Resumen operativo de MotoMil.",
          "Resumen operativo del taller.")
    )

    "components/users-client.tsx" = @(
        @("Roles y acceso a MotoMil.",
          "Roles y acceso a TallerPro.")
    )

    "components/portal-client.tsx" = @(
        @("MotoMil · Portal",
          "TallerPro · Portal"),
        @("Portal de autoservicio MotoMil",
          "Portal de autoservicio")
    )

    "components/portal-login.tsx" = @(
        @("MotoMil",
          "TallerPro"),
        @("administración interna de MotoMil",
          "administración interna del taller")
    )

    "components/pos-receipt.tsx" = @(
        @("<strong>MotoMil</strong>",
          "<strong>TallerPro</strong>")
    )

    "components/settings-company.tsx" = @(
        @("name:'MotoMil Taller'",
          "name:'TallerPro'")
    )
}

foreach ($relativePath in $replacements.Keys) {

    $path = Join-Path $root $relativePath

    if (!(Test-Path $path)) {
        Write-Host "NO ENCONTRADO: $relativePath" -ForegroundColor Yellow
        continue
    }

    $content = Get-Content -Raw -Encoding UTF8 $path
    $original = $content

    foreach ($replacement in $replacements[$relativePath]) {
        $content = $content.Replace(
            $replacement[0],
            $replacement[1]
        )
    }

    if ($content -ne $original) {
        Set-Content `
            -Path $path `
            -Value $content `
            -Encoding UTF8

        Write-Host "ACTUALIZADO: $relativePath" -ForegroundColor Green
    }
    else {
        Write-Host "SIN CAMBIOS: $relativePath" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Rebranding controlado terminado." -ForegroundColor Cyan