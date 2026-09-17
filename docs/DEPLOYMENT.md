# Despliegue — Supabase + Google + Vercel

## 1. Crear Supabase

1. Crear un proyecto.
2. Abrir SQL Editor.
3. Ejecutar `supabase/migrations/0001_initial_schema.sql`.
4. Verificar que existan tablas en `public` y bucket `vehicle-photos`.

## 2. Variables de entorno

Local:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

No colocar claves secretas de servidor en `NEXT_PUBLIC_*`.

## 3. Email / Password

En Supabase:

`Authentication → Providers → Email`

Activar el proveedor y configurar confirmación de correo según la política del negocio.

## 4. Google OAuth

1. Crear un proyecto en Google Cloud.
2. Configurar OAuth consent screen.
3. Crear OAuth Client ID tipo Web.
4. En Supabase, abrir `Authentication → Providers → Google`.
5. Copiar Client ID y Client Secret de Google.
6. Agregar el callback URL que muestra Supabase.
7. En Supabase configurar la Site URL del proyecto.
8. Agregar como Redirect URLs:

```text
http://localhost:3000/callback
https://TU-DOMINIO.vercel.app/callback
https://TU-DOMINIO.com/callback
```

En la aplicación el callback termina en `/callback`, donde se intercambia el código por sesión.

## 5. Google Analytics

Crear una propiedad GA4 y obtener el Measurement ID (`G-...`).

En Vercel agregar:

```text
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

El componente `components/analytics.tsx` carga el script solamente cuando la variable existe.

## 6. Vercel

### Opción GitHub

1. Crear repositorio.
2. Subir el proyecto.
3. En Vercel: `Add New → Project`.
4. Seleccionar repositorio.
5. Framework: Next.js.
6. Agregar las variables de entorno.
7. Deploy.

### CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## 7. Dominio

Después del primer deploy, agregar el dominio desde Vercel. Luego actualizar las Redirect URLs de Supabase y Google OAuth con el dominio definitivo.

## 8. Checklist post-deploy

- `/api/health` responde `status: ok`.
- Login con email funciona.
- Google OAuth devuelve al dashboard.
- RLS no permite leer otra organización.
- Storage rechaza archivos de usuarios fuera de su organización.
- GA4 recibe page views.
- Fotos se guardan en `vehicle-photos`.
- No existen secretos en el código cliente.

## 9. Producción

Antes de abrir el SaaS al público:

- Configurar backups y política de recuperación.
- Revisar RLS con usuarios de distintos roles.
- Añadir rate limiting.
- Configurar logs y alertas.
- Implementar auditoría completa.
- Configurar dominio y correo transaccional.
- Configurar WhatsApp Cloud API en servidor.
- Implementar facturación electrónica según normativa aplicable.
