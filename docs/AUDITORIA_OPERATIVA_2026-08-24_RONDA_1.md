# Auditoría operativa ALEMSI Mamuil Malal — Ronda 1

Fecha: 24-08-2026
Rama: `stable-accepted-20260824`

## Resumen ejecutivo

La aplicación compila y el último Preview revisado quedó `READY`. Se detectó una causa concreta de inestabilidad transversal: coexistían dos pools PostgreSQL distintos. `lib/db/pool.ts` ya limitaba cada instancia serverless a `max: 1`, pero `lib/db.ts` mantenía otro `Pool` con `max: 5`. Varias rutas críticas del circuito Comensal/Reserva seguían usando ese segundo pool. Vercel registró 14 errores `EMAXCONNSESSION` en 24 horas sobre Login, Admin Casino, Coordinación y Finanzas, por agotamiento del límite de 15 clientes de Supabase session mode.

Corrección segura realizada: `lib/db.ts` ahora reutiliza el pool compartido único de `lib/db/pool.ts`. Commit: `ffc9cbce9045d836251d3949a54cb8989910c5bc`. Deployment Vercel: `dpl_AqAnvVGTNg6S56oUXhSjtEuJVYRC`, estado `READY`, build completado sin errores. Después del despliegue no se observaron nuevos errores runtime en la ventana comprobada.

## Matriz verificada

| Circuito | Estado | Evidencia / hallazgo |
|---|---|---|
| Vercel / build | OPERATIVO REAL | Último deployment `READY`; build sin errores. `/login` responde HTTP 200. |
| Pool de base de datos | CORREGIDO | Existían dos pools (`max:1` y `max:5`). Se unificó el acceso legacy al pool compartido `max:1`. |
| Login / roles | OPERATIVO DE CÓDIGO | `/login` carga correctamente. Las vistas internas usan `requireUser()` por rol. Falta recorrido autenticado con cada usuario real. |
| Comensal / Reserva | OPERATIVO DE CÓDIGO, PENDIENTE E2E | `saveReservation()` valida comensal, deuda, plazos, menú PUBLICADA, genera código/token y persiste en `solicitudes`. Era uno de los consumidores del pool legacy; queda estabilizado por la corrección. |
| Calendario / minuta para reservar | OPERATIVO DE CÓDIGO | Reserva solo acepta platos cuyo registro de minuta esté `PUBLICADA`. |
| Correo de reserva | PARCIAL | Existe SMTP, HTML, botón de comprobante y PDF adjunto. Falta prueba real de recepción final después de estabilizar DB. |
| Imagen/banner del correo | ROTO / ACTIVO NO DISPONIBLE EN REPO | `public/email/septiembre` contiene únicamente `README.txt`; no existe todavía el archivo real del banner/mascota. La plantilla depende de `SEPTEMBER_EMAIL_BANNER_URL`. Si esa variable no apunta a una URL absoluta pública existente, la imagen no puede mostrarse. |
| PDF detalle reserva | OPERATIVO DE BUILD | Se genera y se adjunta mediante SMTP. Falta abrir un correo real y comparar contenido con la reserva persistida. |
| Carga comprobante | OPERATIVO DE CÓDIGO | Acepta PDF/JPG/PNG hasta 10 MB. Guarda binario en `comprobantes_pago`, marca `estado_pago='Comprobante recibido'` y permite nueva carga si el anterior fue OBSERVADO/RECHAZADO. |
| Finanzas | OPERATIVO DE CÓDIGO | Lista reservas, historial de comprobantes, permite Pagado/Observado/Rechazado y validación manual sin comprobante. |
| Notificación tras decisión Finanzas | INACTIVA / AUSENTE | `validarPago()` actualiza DB y auditoría, pero no dispara correo al comensal al aprobar/observar/rechazar. Debe entrar al motor de correos por evento. |
| Minuta Admin Casino | PARCIAL | Carga/edición y flujo existen. Se verificó una regresión: el backend `publicarMinuta()` todavía exige que la última revisión de Coordinación esté `AUTORIZADA`, y la UI solo muestra “Publicar período” cuando ese estado existe. Esto contradice el estado objetivo registrado de Coordinación no bloqueante. |
| Coordinación | OPERATIVO COMO REVISIÓN, PERO BLOQUEA PUBLICACIÓN | Revisa por día y finaliza revisión; no edita minuta. La dependencia obligatoria para publicar sigue activa y debe corregirse de manera controlada. |
| Minuta Cocina | OPERATIVO DE BUILD | Vista semanal compacta desplegada. |
| Minuta Gerencia | PARCIAL VISUAL | Gerencia sí muestra `MinutaPublicada`, pero además mantiene una tarjeta resumen “Minutas oficiales” en formato listado. Esto explica la percepción de que Gerencia muestra una lista distinta. |
| Homologación de minutas | PENDIENTE | Cocina/Gerencia usan el componente publicado; Coordinación usa `RevisionDia` por su función revisora. Falta definir y aplicar una vista publicada común en todos los perfiles que deban consultar la minuta. |
| Cocina / Producción | OPERATIVO DE CÓDIGO, PENDIENTE E2E | Demanda diaria, detalle por servicio/plato/institución y estados de jornada están conectados. Falta ejecutar una jornada completa con reservas reales. |
| PDF Producción | OPERATIVO DE CÓDIGO | Endpoint protegido por Cocina/AdminCasino/AdminTotal; genera PDF Carta por servicio, plato, institución, comensales, totales y casilla Entregado. |
| Gerencia indicadores | OPERATIVO DE CÓDIGO | Consulta reservas, pagos, producción, jornadas, bodega, minutas y auditoría. Falta contrastar cifras con un set de prueba controlado. |
| Motor interno de correos | PARCIAL / NO CENTRALIZADO | Hay transporte SMTP y plantillas, pero no existe aún una fuente única de reglas evento → TO/CC/CCO. Debe centralizar Reclamos, Finanzas, Minutas, Producción y demás eventos. |

## Errores runtime observados en Vercel durante las últimas 24 h

1. `EMAXCONNSESSION max clients reached` — 14 ocurrencias; causa identificada y corregida al unificar pools.
2. `operator does not exist: text = date` — 9 ocurrencias históricas en Admin Casino. El código actual revisado usa `CURRENT_DATE::text` en consultas principales; no volvió a aparecer en la ventana reciente. Mantener vigilancia.
3. `La última revisión de Coordinación no está autorizada.` — 5 ocurrencias. No es un error técnico de Vercel: es una regla de negocio aún activa que contradice el objetivo actual de publicación no bloqueante.
4. Errores de duplicidad de minuta — corresponden a validaciones de datos cargados; no se clasifican como fallo de infraestructura.

## Corrección aplicada en esta ronda

`lib/db.ts` dejó de crear un pool PostgreSQL independiente de hasta 5 conexiones por instancia. Ahora delega `db()` y `query()` al pool global de `lib/db/pool.ts`, configurado en `max: 1` para evitar agotar Supabase session mode bajo concurrencia serverless.

Resultado: commit `ffc9cbce9045d836251d3949a54cb8989910c5bc`, deployment `READY`, build sin errores, `/login` 200 y sin nuevos errores runtime en la ventana de comprobación posterior.

## Pendientes prioritarios para la siguiente ronda

1. Corregir de forma segura la dependencia obligatoria de Coordinación al publicar minuta, preservando Coordinación como revisión opcional y trazable.
2. Subir el archivo real de imagen/banner de septiembre a `public/email/septiembre/` y usar una URL absoluta pública del dominio desplegado; hoy el directorio solo contiene README.
3. Ejecutar Reserva → correo/PDF → comprobante → Finanzas con un caso de prueba único y registrar IDs/estados.
4. Confirmar que aprobación/rechazo de Finanzas debe generar notificación por el nuevo motor centralizado de eventos.
5. Ejecutar Reserva publicada → Cocina → inicio/cierre jornada → PDF Producción y contrastar cantidades.
6. Homologar la vista publicada de minuta en los perfiles de consulta; mantener interfaces especiales solo donde el rol necesita editar/revisar.
7. No borrar reservas/minutas de prueba hasta finalizar la auditoría completa.
