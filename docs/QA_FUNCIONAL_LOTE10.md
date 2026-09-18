# TallerPro — Lote 10 · QA funcional integral

## Objetivo

Validar el sistema completo sin cambiar el esquema de Supabase ni introducir datos de prueba destructivos.

Este lote combina:

1. chequeo técnico automatizado;
2. pruebas funcionales manuales;
3. validaciones de consistencia de datos;
4. comprobación responsive;
5. comprobación de documentos y branding.

## 1. Preparación

Desde:

```powershell
cd C:\Project\tallerpro
```

Ejecutar primero:

```powershell
npm run build
```

Después:

```powershell
.\scripts\qa-functional-check.ps1 -SkipHealth
```

Para probar también `/api/health`, iniciar primero:

```powershell
npm run dev
```

en otra consola y luego ejecutar:

```powershell
.\scripts\qa-functional-check.ps1
```

## 2. Flujo funcional principal

### A. Autenticación

- Abrir `/login`.
- Iniciar sesión con un usuario válido.
- Confirmar redirección al dashboard.
- Cerrar sesión.
- Confirmar que una ruta protegida no queda accesible sin sesión.
- Iniciar sesión nuevamente.

### B. Organización

- Abrir Configuración del taller.
- Confirmar nombre, datos fiscales, teléfono, dirección y ciudad.
- Confirmar carga de logo.
- Recargar la aplicación.
- Confirmar que el logo y nombre permanecen.
- Reemplazar el logo por otro archivo válido.
- Confirmar que se muestra el nuevo logo.

### C. Clientes

- Crear un cliente válido.
- Confirmar que aparece en la lista.
- Editar teléfono y correo.
- Guardar.
- Abrir detalle.
- Desactivar.
- Confirmar que el estado queda correctamente reflejado.
- Intentar guardar con nombre vacío y comprobar validación.

### D. Motocicletas

- Crear una motocicleta asociada a un cliente.
- Confirmar placa.
- Editar kilometraje.
- Guardar.
- Intentar registrar otra motocicleta con la misma placa dentro de la misma organización.
- Confirmar que el duplicado no se guarda.
- Probar fecha de tecnomecánica.
- Recargar y confirmar persistencia.

### E. Agenda

- Crear una cita.
- Confirmar fecha/hora.
- Asociar cliente y motocicleta.
- Abrir nuevamente la cita.
- Confirmar persistencia.
- Probar filtro por fecha/estado cuando exista.

### F. Recepción → Orden

- Abrir Recepción.
- Confirmar que una orden recibida aparece.
- Abrir la orden.
- Confirmar cliente, moto, kilometraje y problema reportado.
- Guardar diagnóstico.
- Asignar mecánico.
- Definir entrega estimada.

### G. Estados de la orden

Validar el flujo:

```text
Recibida
→ Diagnóstico
→ Cotización
→ Aprobada
→ Reparación
→ Calidad
→ Lista
→ Entregada
```

Para cada cambio:

- guardar;
- recargar;
- comprobar que el estado persiste;
- volver a la orden;
- comprobar que el timeline coincide.

Probar también cancelación en una orden de prueba controlada.

### H. Cotización

- Abrir `/cotizaciones`.
- Comprobar que las órdenes en estado de cotización aparecen.
- Abrir una cotización.
- Confirmar total.
- Confirmar acceso a la orden asociada.
- Probar vista móvil.

### I. Inventario

- Crear un producto.
- Definir costo.
- Definir precio.
- Definir stock.
- Confirmar persistencia.
- Probar búsqueda.
- Probar filtro de productos activos.
- Verificar que un stock negativo no sea aceptado por la interfaz cuando aplique.

### J. Facturación

- Abrir una factura existente.
- Confirmar organización.
- Confirmar cliente.
- Confirmar orden.
- Confirmar subtotal.
- Confirmar impuesto.
- Confirmar total.
- Verificar estado de pago.
- Probar impresión/PDF.

### K. POS

- Abrir POS.
- Registrar una venta de prueba controlada.
- Confirmar número de comprobante.
- Confirmar detalle de artículos.
- Confirmar total.
- Probar impresión.
- Confirmar branding del taller.

### L. Caja / Finanzas

- Consultar movimientos.
- Registrar un movimiento de prueba controlado.
- Confirmar que el saldo mostrado cambia de acuerdo con el movimiento.
- Verificar reportes.
- Confirmar formato COP.

### M. Mecánicos / Comisiones

- Abrir mecánicos.
- Confirmar listado.
- Abrir reporte de comisiones.
- Aplicar filtros.
- Abrir impresión.
- Confirmar logo, datos del taller y período.

### N. Reportes

- Abrir dashboard de reportes.
- Confirmar que las consultas cargan.
- Confirmar que valores monetarios se muestran como COP.
- Probar filtros disponibles.
- Abrir desde móvil.

### O. Seguridad funcional

- Con un usuario sin permisos administrativos, intentar entrar a una pantalla restringida.
- Confirmar que la interfaz no habilite acciones no autorizadas.
- Confirmar que las consultas de una organización no muestren datos de otra organización.
- No usar service role key en componentes cliente.

## 3. Responsive

Probar en:

- 360 × 800
- 390 × 844
- 430 × 932
- tablet
- desktop

Revisar:

- menú;
- topbar;
- tarjetas;
- formularios;
- tablas;
- botones;
- filtros;
- modales;
- fotografías;
- impresión.

En móvil, ninguna pantalla debe generar scroll horizontal accidental fuera de las tablas diseñadas para desplazamiento.

## 4. Documentos

Validar:

- factura;
- comprobante POS;
- liquidación de comisiones.

Cada documento debe mostrar la identidad del taller cuando corresponda.

La identidad de TallerPro se mantiene como identidad del producto SaaS, mientras que la identidad visual del cliente proviene de la organización configurada.

## 5. Criterio de cierre

Lote 10 queda cerrado cuando:

- `npm run build` = OK;
- `qa-functional-check.ps1` = QA TECNICO OK;
- `/api/health` responde correctamente;
- el flujo Cliente → Moto → Recepción → Orden se completa;
- los cambios de estado de orden persisten;
- documentos se generan;
- POS/Caja funcionan;
- pruebas móviles no revelan desbordamientos importantes;
- no aparecen errores críticos en consola del navegador.

## Importante

Las pruebas que creen, editen o eliminen información deben ejecutarse en datos controlados o en una organización de pruebas antes de aplicarse sobre información real.
