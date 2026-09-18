# TallerPro — Checklist de producción

## Aplicación

- `npm run build` exitoso.
- No hay referencias activas de MotoMil fuera de nombres técnicos históricos.
- Login funciona.
- Dashboard funciona.
- Clientes funciona.
- Motocicletas funciona.
- Agenda funciona.
- Recepción funciona.
- Órdenes funciona.
- Cotizaciones funciona.
- Inventario funciona.
- Facturación funciona.
- POS funciona.
- Mecánicos y comisiones funcionan.
- Finanzas/caja funciona.
- Portal funciona.
- Configuración del taller permite gestionar el logo.

## Branding

- Logo de TallerPro en `public/tallerpro-logo.png`.
- Logo de cada organización en `organization-assets/{organization_id}/`.
- `organizations.logo_url` almacena la ruta del objeto.
- Facturas usan el logo de la organización.
- Liquidaciones de mecánicos usan el logo de la organización.
- POS usa el logo de la organización.

## Móvil

Probar como mínimo:

- 360 × 800
- 390 × 844
- 430 × 932
- tablet
- desktop

Revisar especialmente tablas, modales, formularios, botones, navegación y fotografías.

## Supabase

- Misma base de datos.
- RLS activo.
- `organization-assets` privado.
- Políticas de Storage comprobadas.
- No se publican secretos en el frontend.

## Vercel

- Variables de entorno configuradas.
- Dominio configurado.
- HTTPS activo.
- Deploy de producción probado.
- `/api/health` responde con `status: ok`.

## Antes de publicar

```powershell
npm run build
```

y luego:

```powershell
curl http://localhost:3000/api/health
```

En producción, comprobar que la URL `/api/health` responda correctamente.
