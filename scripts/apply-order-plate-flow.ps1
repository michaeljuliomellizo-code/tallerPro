$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

$ordersClient = Join-Path $root "components\orders-client.tsx"
$intakeClient = Join-Path $PSScriptRoot "..\components\service-order-intake-client.tsx"
$sqlSource = Join-Path $PSScriptRoot "..\supabase\migrations\20260922_orden_por_placa.sql"
$sqlDest = Join-Path $root "supabase\migrations\20260922_orden_por_placa.sql"

if (-not (Test-Path $ordersClient)) {
    throw "No se encontró components\orders-client.tsx. Revisa que estés ejecutando el script desde el proyecto TallerPro."
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = Join-Path $root "components\orders-client.tsx.backup_$timestamp"
Copy-Item $ordersClient $backup -Force
Write-Host "Backup creado: $backup" -ForegroundColor DarkGray

$content = Get-Content $ordersClient -Raw

if ($content -notmatch 'service-order-intake-client') {
    $content = $content.Replace(
        'import { useEffect, useMemo, useState } from "react";\r\n',
        'import { useEffect, useMemo, useState } from "react";\r\nimport { useRouter } from "next/navigation";\r\n'
    )

    if ($content -notmatch 'from "next/navigation";') {
        $content = $content.Replace(
            'import { useEffect, useMemo, useState } from "react";\n',
            'import { useEffect, useMemo, useState } from "react";\nimport { useRouter } from "next/navigation";\n'
        )
    }

    $content = $content.Replace(
        'import { money } from "@/lib/utils";\r\n',
        'import { money } from "@/lib/utils";\r\nimport ServiceOrderIntakeClient from "@/components/service-order-intake-client";\r\n'
    )

    if ($content -notmatch 'ServiceOrderIntakeClient') {
        $content = $content.Replace(
            'import { money } from "@/lib/utils";\n',
            'import { money } from "@/lib/utils";\nimport ServiceOrderIntakeClient from "@/components/service-order-intake-client";\n'
        )
    }

    if ($content -notmatch 'const \[intakeOpen, setIntakeOpen\]') {
        $needle = "  const [open, setOpen] = useState(false);"
        $replacement = @"
  const [open, setOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);

  const router = useRouter();
"@
        $replacement = $replacement.TrimEnd()
        if (-not $content.Contains($needle)) {
            throw "No se encontró el punto de inserción del estado de apertura en orders-client.tsx. Se creó backup, pero no se modificó el archivo."
        }
        $content = $content.Replace($needle, $replacement)
    }

    if ($content -match 'onClick=\{openCreate\}') {
        $content = $content.Replace('onClick={openCreate}', 'onClick={() => setIntakeOpen(true)}')
    } elseif ($content -notmatch 'onClick=\{\(\) => setIntakeOpen\(true\)\}') {
        throw "No se encontró el botón Nueva orden esperado. Se creó backup, pero no se completó la instalación."
    }

    if ($content -notmatch '<ServiceOrderIntakeClient') {
        $anchor = "      {open && ("
        if (-not $content.Contains($anchor)) {
            throw "No se encontró el modal antiguo de Nueva orden. Se creó backup, pero no se completó la instalación."
        }
        $block = @"
      <ServiceOrderIntakeClient
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onCreated={async ({ orderId, orderNumber }) => {
          setIntakeOpen(false);
          setMessage(
            orderNumber
              ? `Orden #${orderNumber} creada correctamente.`
              : "Orden de servicio creada correctamente."
          );
          await loadOrders();
          router.push(`/ordenes/${orderId}`);
        }}
      />

"@
        $content = $content.Replace($anchor, $block + $anchor)
    }

    Set-Content $ordersClient $content -Encoding utf8
    Write-Host "orders-client.tsx actualizado." -ForegroundColor Green
}
else {
    Write-Host "orders-client.tsx ya contiene el nuevo flujo; no se hicieron cambios sobre ese archivo." -ForegroundColor Yellow
}

New-Item -ItemType Directory -Force (Join-Path $root "components") | Out-Null
New-Item -ItemType Directory -Force (Join-Path $root "supabase\migrations") | Out-Null
Copy-Item $intakeClient (Join-Path $root "components\service-order-intake-client.tsx") -Force
Copy-Item $sqlSource $sqlDest -Force

Write-Host "" 
Write-Host "Instalación del nuevo flujo de órdenes por placa preparada." -ForegroundColor Green
Write-Host "" 
Write-Host "Pendiente obligatorio:" -ForegroundColor Cyan
Write-Host "1. Ejecutar supabase\migrations\20260922_orden_por_placa.sql en Supabase SQL Editor." -ForegroundColor White
Write-Host "2. Ejecutar Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue" -ForegroundColor White
Write-Host "3. Ejecutar npm run build" -ForegroundColor White
Write-Host "4. Probar Nueva orden -> Placa -> continuar / registrar datos rapidos." -ForegroundColor White
