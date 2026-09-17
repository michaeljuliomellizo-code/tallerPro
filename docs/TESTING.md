# Plan de pruebas — MotoMil Taller

## 1. Smoke test local

- [ ] `npm install` termina sin errores.
- [ ] `npm run typecheck` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores.
- [ ] `/dashboard` abre correctamente.
- [ ] `/api/health` responde JSON.

## 2. Navegación

- [ ] Dashboard.
- [ ] Clientes.
- [ ] Motocicletas.
- [ ] Ficha de motocicleta.
- [ ] Agenda.
- [ ] Recepción.
- [ ] Órdenes.
- [ ] Detalle de orden.
- [ ] Cotizaciones.
- [ ] Inventario.
- [ ] Proveedores.
- [ ] Mecánicos.
- [ ] Facturación.
- [ ] Mantenimiento.
- [ ] CRM.
- [ ] Reportes.
- [ ] Portal cliente.
- [ ] POS.
- [ ] Finanzas.
- [ ] API.
- [ ] Móvil.
- [ ] Automatizaciones.
- [ ] Configuración.

## 3. Auth

### Email

- [ ] Registro.
- [ ] Login correcto.
- [ ] Contraseña incorrecta.
- [ ] Sesión persistente.
- [ ] Logout.

### Google

- [ ] Botón inicia OAuth.
- [ ] Callback recibe código.
- [ ] Sesión queda creada.
- [ ] Redirección al dashboard.
- [ ] Logout y nuevo login.

## 4. Multi-tenant / RLS

Crear dos usuarios y dos organizaciones.

- [ ] Usuario A puede leer organización A.
- [ ] Usuario A no puede leer clientes de B.
- [ ] Usuario B no puede modificar órdenes de A.
- [ ] Un usuario sin membresía no puede acceder a datos.
- [ ] Un mecánico no puede modificar configuración financiera cuando se implementen permisos finos.

## 5. Flujo E2E principal

```text
Cliente
→ Motocicleta
→ Cita
→ Recepción
→ Fotos
→ Orden
→ Diagnóstico
→ Cotización
→ Aprobación
→ Reparación
→ Repuesto
→ Salida inventario
→ Control calidad
→ Lista
→ Factura
→ Pago
→ Entrega
→ Garantía
→ Mantenimiento
→ CRM
```

Criterio de aceptación: ninguna etapa debe duplicar datos que ya existan en la entidad anterior.

## 6. Inventario

Caso: stock inicial 25.

- [ ] Orden usa 1 → stock 24.
- [ ] Segunda orden usa 1 → stock 23.
- [ ] Venta mostrador usa 2 → stock 21.
- [ ] Compra 20 → stock 41.
- [ ] Cada movimiento conserva referencia y costo.

## 7. Rentabilidad

Caso:

```text
Venta:       650.000
Repuestos:   280.000
Mano obra:   150.000
Otros:        20.000
Utilidad:    200.000
```

- [ ] La orden muestra utilidad 200.000.
- [ ] El dashboard acumula ingreso y costo.
- [ ] Reportes concuerdan con facturas y movimientos.

## 8. Recepción digital

- [ ] Kilometraje obligatorio.
- [ ] Checklist guardado.
- [ ] Daños existentes guardados.
- [ ] Fotos asociadas a motocicleta y orden.
- [ ] Cliente puede recibir comprobante.

## 9. Cotización

- [ ] Crear cotización.
- [ ] Calcular subtotal/total.
- [ ] Generar token público.
- [ ] Aprobar.
- [ ] Rechazar.
- [ ] Registrar fecha y usuario/cliente.
- [ ] Impedir doble aprobación.

## 10. Storage

- [ ] Archivo permitido: JPG/PNG/WebP.
- [ ] Archivo superior al límite rechazado o enviado por TUS en fase posterior.
- [ ] Usuario de otra organización no puede leer el archivo.
- [ ] El path contiene organization/moto/orden.

## 11. Responsive

Probar en:

- [ ] Desktop 1440px.
- [ ] Laptop 1280px.
- [ ] Tablet 768px.
- [ ] Móvil 390px.

## 12. Seguridad

- [ ] Nunca usar service role en cliente.
- [ ] Variables sensibles fuera de Git.
- [ ] RLS activado.
- [ ] Endpoints públicos con validación y rate limiting antes de producción.
- [ ] Logs sin contraseñas/tokens.
