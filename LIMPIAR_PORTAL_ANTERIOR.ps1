# Ejecutar desde la raíz de C:\Project\motomil-platform
# Este script elimina SOLO la carpeta de route group (portal)
# incorrectamente ubicada dentro de app/(app), que provoca rutas duplicadas.

$oldPortal = "app\(app)\(portal)"

if (Test-Path $oldPortal) {
    Remove-Item -Recurse -Force $oldPortal
    Write-Host "Eliminado: $oldPortal"
} else {
    Write-Host "No se encontró la ruta antigua: $oldPortal"
}

if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Caché .next eliminada."
}

Write-Host "Limpieza terminada."
Write-Host "Ahora copia el contenido del paquete respetando app\(portal) y ejecuta npm run build."
