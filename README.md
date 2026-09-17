# MotoMil Taller — Plataforma Integral de Gestión

![MotoMil](./public/logo-mototamil.jpeg)

Starter/MVP escalable para administrar talleres de motocicletas con **Next.js + TypeScript + Supabase + Vercel**.

## Estado de esta entrega

Esta versión está pensada para que puedas:

- Ejecutar el proyecto inmediatamente en **modo demo**, sin Supabase.
- Configurar **Supabase Auth** con correo/contraseña y Google OAuth.
- Usar **Supabase PostgreSQL** con un modelo multi-tenant y RLS.
- Preparar **Supabase Storage** para fotografías de recepción y motocicletas.
- Activar **Google Analytics 4** mediante `NEXT_PUBLIC_GA_ID`.
- Desplegar en **Vercel**.
- Tener una base de módulos y navegación para continuar el producto sin rehacer la arquitectura.

> Importante: el alcance de esta primera entrega prioriza arquitectura, UX, flujo operativo y base de datos. Las integraciones externas de producción (WhatsApp Cloud API, Resend, facturación electrónica DIAN, pagos y POS fiscal) quedan encapsuladas como siguientes fases y no se incluyen con secretos reales.

## Stack

- Next.js 16.3.2 / App Router
- React 19
- TypeScript
- Supabase Auth + `@supabase/ssr`
- PostgreSQL + Row Level Security
- Supabase Storage
- Vercel
- Google Analytics 4
- Lucide React

## Ejecutar localmente

Requisitos: Node.js 20+ recomendado y npm.

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

Sin variables de Supabase, la aplicación funciona como **demo visual**. El botón de login explica qué configuración falta.

Para activar Supabase:

```bash
cp .env.example .env.local
```

Completa:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

Luego reinicia `npm run dev`.

## Supabase

1. Crea un proyecto nuevo en Supabase.
2. Abre **SQL Editor**.
3. Ejecuta `supabase/migrations/0001_initial_schema.sql`.
4. En Auth habilita Email/Password.
5. En Auth > Providers habilita Google.
6. Configura las URLs de redirección indicadas en `docs/DEPLOYMENT.md`.
7. Copia URL y Publishable Key al `.env.local`.

El esquema incluye organizaciones, usuarios, roles, clientes, motocicletas, citas, recepción, órdenes, diagnóstico, cotizaciones, inventario, proveedores, mecánicos, facturación, pagos, mantenimiento, garantías, CRM, auditoría y Storage.

## Google OAuth

En Supabase habilita Google como proveedor. En Google Cloud crea las credenciales OAuth y usa el callback proporcionado por Supabase. En la aplicación se usa:

```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/callback` }
})
```

## Storage

El SQL crea el bucket privado `vehicle-photos`. La estructura recomendada es:

```text
vehicle-photos/
  <organization_id>/
    <motorcycle_id>/
      <service_order_id>/
        frontal-uuid.jpg
        lateral-uuid.jpg
```

No expongas claves secretas de Supabase en el navegador. Para operaciones administrativas usa servidor/Edge Functions.

## Rutas principales

```text
/login
/dashboard
/clientes
/motocicletas
/motocicletas/[id]
/agenda
/recepcion
/ordenes
/ordenes/[id]
/cotizaciones
/inventario
/proveedores
/mecanicos
/facturacion
/mantenimiento
/crm
/reportes
/portal
/portal/demo
/pos
/finanzas
/api-docs
/movil
/automatizaciones
/configuracion
/api/health
```

## Flujo de negocio

```text
Cliente
  ↓
Motocicleta
  ↓
Cita
  ↓
Recepción digital + fotos
  ↓
Orden de servicio
  ↓
Diagnóstico
  ↓
Cotización
  ├── Rechazada → Cierre
  └── Aprobada
        ↓
      Reparación
        ├── Repuestos → Inventario - cantidad
        └── Mecánico → Mano de obra
              ↓
        Control de calidad
              ↓
            Lista
              ↓
         Facturación
              ↓
           Entrega
              ↓
          Garantía
              ↓
     Próximo mantenimiento
              ↓
             CRM
```

## Validación local

```bash
npm run typecheck
npm run lint
npm run build
```

## Documentación

- `docs/ARCHITECTURE.md` — arquitectura y decisiones técnicas.
- `docs/DEPLOYMENT.md` — Supabase, Google OAuth, Analytics y Vercel.
- `docs/TESTING.md` — plan de pruebas funcional, seguridad y aceptación.
- `supabase/migrations/0001_initial_schema.sql` — modelo PostgreSQL + RLS + Storage.

## Próxima fase recomendada

1. Conectar Clientes/Motocicletas/Órdenes a consultas reales de Supabase.
2. Implementar Server Actions transaccionales para inventario y órdenes.
3. Implementar aprobación pública de cotizaciones con token y controles de seguridad.
4. Subir fotografías reales a Storage desde Recepción.
5. Generar PDF de recepción, cotización, factura y entrega.
6. Integrar Resend.
7. Integrar WhatsApp Cloud API.
8. Facturación electrónica para Colombia.
9. Multi-sucursal y permisos finos por módulo.
10. Aplicación móvil React Native/Expo.
