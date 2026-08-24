# Auditoría operativa ALEMSI Mamuil Malal — 24-08-2026

Rama auditada: `stable-accepted-20260824`

Objetivo: registrar el estado real de los circuitos activos, operativos, parciales, inactivos o pendientes de prueba; preservar funciones existentes y corregir únicamente regresiones seguras.

## Estado base confirmado

- Último commit al inicio de la auditoría: `d91eac6bf20c69622848ecb59473819b128f5481` — vista compacta semanal de minuta en Cocina.
- Último deployment Vercel observado: `READY` para ese commit.
- La auditoría nocturna debe actualizar este documento después de cada ronda de pruebas.

## Matriz de circuitos

| Circuito | Estado inicial | Evidencia / alcance | Prueba pendiente |
|---|---|---|---|
| Login / roles internos | OPERATIVO CON REVISIÓN | `requireUser()` protege Cocina, Gerencia y módulos internos. | Recorrer todos los perfiles y verificar redirecciones/permisos. |
| Comensal / sesión | PARCIALMENTE VERIFICADO | Se han corregido sesión persistente, navegación y reanudación del wizard en commits recientes. | Prueba completa móvil + PC desde login/RUT hasta reserva y salida. |
| Reserva | OPERATIVO CON ALERTA | La reserva genera código, payment token y notificación; hubo correcciones de duplicidad y fechas. | Confirmar creación real, persistencia, calendario completo y deuda calculada. |
| Correo de reserva | OPERATIVO CON ALERTA | SMTP HTML y PDF adjunto compilados y desplegados. | Confirmar recepción real: banner septiembre, monto correcto, datos bancarios, PDF adjunto y botón de comprobante. |
| PDF detalle reserva | OPERATIVO DE BUILD | Generador agregado y deployment READY. | Abrir adjunto real recibido y revisar fechas, servicios, opciones, platos, código y monto. |
| Carga de comprobante | PARCIALMENTE VERIFICADO | Flujo existente y probado manualmente previamente con PDF/PNG; hubo lentitud móvil. | Probar teléfono y PC, PDF/PNG/JPG según contrato vigente, persistencia y consulta posterior. |
| Finanzas | OPERATIVO CON ALERTA | Vista de pagos/comprobantes existe y procesa estados. | Confirmar que una reserva nueva aparece inmediatamente, filtro RUT funciona y deuda total coincide. |
| Minuta / Admin Casino | OPERATIVO CON ALERTA | Carga, guardado publicable y publicación directa ya implementados; Coordinación no bloquea publicación. | Cargar minuta de prueba, sobreescribir sin reservas, publicar, comprobar consumo y luego eliminarla. |
| Minuta publicada / Cocina | OPERATIVO DE BUILD | Vista semanal compacta desplegada, usa `MinutaPublicada`. | Validar datos reales y responsive móvil/PC. |
| Minuta publicada / Gerencia | OPERATIVO DE CÓDIGO | Gerencia obtiene `obtenerMinutasRango()` y renderiza `MinutaPublicada`. | Igualar visual final y verificar que no quede presentación alternativa/listado aislado. |
| Minuta publicada / otros perfiles | PENDIENTE DE AUDITORÍA | Debe identificarse cada perfil que consume minuta y unificar componente/visual. | Revisar Coordinación, Finanzas, Comensal y Admin Casino y eliminar divergencias visuales sin cambiar permisos. |
| Cocina / demanda diaria | OPERATIVO CON REVISIÓN | `demandaFecha`, jornada y detalle por comensal/institución están conectados. | Crear reservas reales y comprobar suma por plato/tipo e institución. |
| Producción / jornada | PARCIALMENTE VERIFICADO | Inicio/cierre y estado de jornada existen. | Ejecutar punta a punta: Pendiente → En producción → Finalizado sin romper reservas. |
| Reporte PDF Producción | OPERATIVO DE BUILD | Endpoint PDF real conectado desde Cocina/Admin Casino y builds posteriores READY. | Abrir PDF real: Carta, distribución compacta, dos columnas, hipocalórico, comensales, institución y casilla de entrega. |
| Admin Casino / Producción | OPERATIVO DE CÓDIGO | Acceso a supervisión y reporte diario implementado. | Verificar misma fuente de datos que Cocina y regreso conservando fecha. |
| Gerencia / indicadores | OPERATIVO CON REVISIÓN | Dashboard muestra reservas, raciones, valor, finanzas, producción, minutas y auditoría. | Verificar cifras contra datos reales de prueba. |
| Coordinación | NO BLOQUEANTE / REVISAR | Ya no debe ser requisito para publicar minuta. | Confirmar que ningún flujo operativo dependa todavía de una autorización de Coordinación. |
| Recuperar clave | PENDIENTE | Requerimiento registrado, no forma parte del cierre actual. | Comparar con Streamlit e implementar sin romper login. |
| Reclamos | FUERA DEL CIERRE ACTUAL | Circuito existente parcialmente; destinatario de Coordinación registrado para futura implementación oficial. | Auditar en etapa posterior. |

## Reglas de auditoría nocturna

1. No borrar ni degradar funciones operativas.
2. No fusionar a `main` mientras existan fallas críticas sin identificar.
3. Cada corrección debe compilar y tener deployment `READY` antes de continuar.
4. Distinguir siempre entre: `OPERATIVO REAL`, `OPERATIVO DE BUILD`, `PARCIAL`, `PENDIENTE`, `ROTO`.
5. No declarar un circuito punta a punta como operativo solo porque compile.
6. Registrar cada prueba con fecha/hora, perfil, ruta, dato utilizado, resultado y commit si hubo corrección.

## Rondas nocturnas

### Ronda inicial — 03:58–04:00 Chile

- Branch confirmada en `d91eac6b`.
- Deployment correspondiente confirmado `READY`.
- Gerencia ya usa `MinutaPublicada` con rango de fechas; no es un módulo sin minuta, aunque conserva bloques de resumen/listado ejecutivo además de la vista publicada.
- Pendiente principal inmediato: unificar la presentación semanal de minuta en todos los perfiles que la consumen y realizar pruebas reales punta a punta de Reserva → Correo/PDF → Comprobante → Finanzas → Cocina/Producción → Reporte.

> Las siguientes rondas nocturnas deben anexarse debajo de esta sección.
