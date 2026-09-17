MOTOMIL - PORTAL DEL CLIENTE 2.0 - RUTAS CORREGIDAS
===================================================

IMPORTANTE
----------
Este paquete NO debe copiarse dentro de app/(app).

La estructura correcta es:

app/
├── (app)/
│   ├── login/
│   ├── cotizaciones/
│   ├── mantenimiento/
│   ├── motocicletas/
│   └── ordenes/
│
└── (portal)/
    └── portal/
        ├── page.tsx
        └── login/
            └── page.tsx

RUTAS RESULTANTES
------------------
/portal
/portal/login

ARCHIVOS
--------
app/(portal)/portal/page.tsx
app/(portal)/portal/login/page.tsx
components/portal-client.tsx
components/portal-login.tsx
lib/motomil/portal.ts
supabase/SQL_portal_cliente_2_CORREGIDO.sql

IMPORTANTE SOBRE EL SQL
-----------------------
customer_portal_users actualmente contiene:
- user_id
- customer_id
- created_at

NO existe una columna active.
El SQL de este paquete no utiliza "active".

LIMPIEZA DEL ERROR DE RUTAS
---------------------------
Si instalaste una versión anterior que creó:

app/(app)/(portal)/

elimina SOLO esa carpeta si corresponde al portal agregado por el paquete anterior.
No elimines las carpetas existentes:

app/(app)/cotizaciones
app/(app)/mantenimiento
app/(app)/motocicletas
app/(app)/ordenes
app/(auth)

También elimina cualquier versión anterior que haya creado estas rutas duplicadas:

app/(app)/(portal)/cotizaciones
app/(app)/(portal)/mantenimiento
app/(app)/(portal)/motocicletas
app/(app)/(portal)/ordenes
app/(app)/(portal)/login

Después de copiar el paquete correctamente:

1. Ejecuta el SQL_portal_cliente_2_CORREGIDO.sql.
2. Verifica que el portal esté en app/(portal)/portal.
3. Elimina .next si había errores de rutas anteriores.
4. Ejecuta: npm run build

PowerShell para limpiar caché:
Remove-Item -Recurse -Force .next
npm run build
