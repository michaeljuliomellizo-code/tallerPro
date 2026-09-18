$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$oldBrand = "Moto" + "Mil"
$oldBrandSpaced = "Moto " + "Mil"
$oldBrandLower = "moto" + "mil"
$oldService = "motomil" + "-taller"
$oldLogoName = "logo-" + "motomil" + ".jpeg"
$oldLogoPng = "motomil" + "-logo.png"

$files = Get-ChildItem -Path $root -Recurse -File | Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.next\\" -and
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\_archive\\"
}

$replaced = 0

foreach ($file in $files) {
    try {
        $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName
    }
    catch {
        continue
    }

    $original = $content

    $content = $content.Replace("$oldBrand Taller", "TallerPro")
    $content = $content.Replace("$oldBrand", "TallerPro")
    $content = $content.Replace("$oldBrandSpaced", "TallerPro")
    $content = $content.Replace("$oldBrandLower", "tallerpro")
    $content = $content.Replace("$oldService", "tallerpro")
    $content = $content.Replace("$oldLogoName", "tallerpro-logo.png")
    $content = $content.Replace("/$oldLogoPng", "/tallerpro-logo.png")

    if ($content -ne $original) {
        Set-Content -LiteralPath $file.FullName -Value $content -Encoding UTF8
        $replaced++
        Write-Host "ACTUALIZADO: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Rebranding controlado completado. Archivos actualizados: $replaced" -ForegroundColor Cyan
Write-Host "Nota: no se modifican nombres internos de lib/motomil ni archivos de node_modules/.next/.git." -ForegroundColor DarkGray
