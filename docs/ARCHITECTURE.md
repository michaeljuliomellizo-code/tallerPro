# Arquitectura — MotoMil Taller

## Objetivo

Construir un SaaS multi-tenant donde cada taller tenga sus datos aislados y pueda crecer desde un pequeño taller hasta una operación multi-sucursal.

## Capas

```text
Browser
  │
  ▼
Next.js App Router
  ├── Server Components
  ├── Client Components
  ├── Server Actions / Route Handlers
  └── Proxy de sesión
  │
  ▼
Supabase
  ├── Auth
  ├── PostgreSQL
  ├── RLS
  ├── Storage
  └── Edge Functions / Jobs futuros
```

## Multi-tenancy

La unidad de aislamiento es `organization_id`.

Todas las entidades operativas principales incluyen `organization_id`. Las políticas RLS verifican la pertenencia mediante `public.is_org_member()`.

Roles iniciales:

- `owner`
- `admin`
- `reception`
- `mechanic`
- `finance`
- `customer`

Para producción se recomienda separar permisos de rol de permisos por acción y crear una matriz explícita:

```text
módulo × rol × acción
```

## Auth

La sesión se maneja mediante cookies SSR con `@supabase/ssr`. La aplicación tiene:

- Email/Password.
- Google OAuth.
- Callback `/callback`.
- Proxy para refrescar sesión.

No se utiliza `@supabase/auth-helpers-nextjs`.

## Dominio de negocio

### Cliente

Un cliente puede tener varias motocicletas.

### Motocicleta

Una motocicleta pertenece a un cliente y concentra historial, kilometraje, fotos, órdenes, garantías y mantenimiento.

### Orden

La orden es la entidad operativa central.

### Inventario

El stock no debe modificarse manualmente sin generar movimiento. Cada entrada/salida debe generar `inventory_movements`.

Ejemplo:

```text
Orden #1052
Filtro x1
   ↓
inventory_movements: order_usage -1
   ↓
stock actual = stock anterior - 1
   ↓
costo de la orden = costo unitario × cantidad
```

Para producción se recomienda una función SQL transaccional que actualice movimiento + stock + costo de orden en una sola transacción.

## Storage

Bucket privado `vehicle-photos`.

La aplicación debe almacenar la ruta, no depender de una URL pública permanente. Para mostrar archivos privados, usar signed URLs.

## Integraciones

### Google Analytics

Se carga solo cuando existe `NEXT_PUBLIC_GA_ID`.

### Resend

Reservado para correos transaccionales: cotización, recepción, factura, entrega y mantenimiento.

### WhatsApp

Reservado para WhatsApp Cloud API. El token debe permanecer exclusivamente en servidor/Edge Function.

### PDFs

Se recomienda generar documentos desde Route Handlers o un servicio de servidor, no desde componentes cliente.

## Seguridad

- Nunca exponer service role / secret keys.
- Mantener RLS activado.
- Validar `organization_id` en servidor.
- No confiar en campos enviados por el navegador para decidir permisos.
- Auditar cambios importantes.
- Firmar URLs de Storage privadas.
- Aplicar rate limiting a endpoints públicos.

## Escalabilidad

La separación por módulos permite evolucionar hacia:

```text
Web Next.js
    │
    ├── API / Server Actions
    │
    ├── Supabase PostgreSQL
    │
    ├── Storage
    │
    ├── Edge Functions
    │
    ├── Cron / automatizaciones
    │
    └── Mobile App
```

La futura aplicación móvil no debería acceder directamente a tablas sensibles sin políticas RLS equivalentes; puede utilizar Supabase Auth y la misma API de dominio.
