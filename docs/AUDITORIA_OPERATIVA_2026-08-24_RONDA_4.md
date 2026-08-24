# Auditoría operativa ALEMSI Mamuil Malal — Ronda 4

Fecha: 24-08-2026
Rama: `stable-accepted-20260824`

## Resumen ejecutivo

La aplicación mantiene un deployment `READY` y no registra errores runtime en la ventana revisada. El build de Next.js/TypeScript finaliza correctamente y expone todas las rutas principales previstas para el circuito actual: Login, Reserva, Comensal, Comprobante, Finanzas, Admin Casino, Coordinación, Cocina, Producción, Bodega y Gerencia.

En esta ronda se encontró y corrigió una falla de consistencia importante en Reserva → Correo: la reserva se confirmaba primero en PostgreSQL y luego se generaba/enviaba el correo. Si la generación del PDF o el envío lanzaban una excepción, la API respondía 400 aunque la reserva ya estaba guardada. Esto podía hacer creer al comensal que debía repetir la reserva. El commit `898c79d5e8ef12081da6804141f53b883ae2ac2a` separa correctamente ambos resultados: una falla posterior de correo ya no invalida una reserva confirmada. El deployment asociado quedó `READY` y compiló sin errores.

## Estado de infraestructura

- Vercel deployment auditado: commit `898c79d5e8ef12081da6804141f53b883ae2ac2a`.
- Estado: `READY`.
- Build: Next.js 16.3.2, compilación y TypeScript correctos.
- Rutas principales presentes en build: `/login`, `/reserva`, `/mis-reservas`, `/comprobante/[token]`, `/finanzas`, `/admin-casino`, `/admin-casino/produccion`, `/coordinacion`, `/cocina`, `/produccion/reporte`, `/api/produccion/reporte-pdf`, `/bodega`, `/gerencia`.
- Errores runtime Vercel, últimos 30 minutos al cierre: ninguno.
- `/login` responde HTTP 200.
- Las rutas de Preview protegidas por Vercel SSO no permiten una prueba anónima equivalente a sesión de aplicación; la validación funcional autenticada sigue requiriendo sesión real por rol.

## Matriz actualizada

| Circuito | Estado | Evidencia / observación |
|---|---|---|
| Login interno | OPERATIVO DE BUILD / RUTA REAL | `/login` HTTP 200. `requireUser()` mantiene sesión firmada y control por rol. |
| Roles y navegación | OPERATIVO DE CÓDIGO | `MODULES_BY_ROLE` limita módulos por rol; AdminTotal conserva acceso transversal. |
| Comensal / identificación | OPERATIVO CON PRUEBA REAL PENDIENTE | Existe alta, sesión persistente, perfil, menú, reservas y Mis Reservas. Tests existentes son mayormente estructurales, no E2E contra BD. |
| Reserva | OPERATIVO CON ALERTA | `saveReservation()` valida comensal, deuda, plazo, minuta PUBLICADA, duplicidad y persiste en transacción. Falta última prueba autenticada con datos reales. |
| Reserva → correo/PDF | MEJORADO / PARCIAL | Corregido falso error post-commit. SMTP y PDF existen, pero falta recepción real validada y banner gráfico definitivo. |
| Carga comprobante | OPERATIVO DE CÓDIGO | PDF/JPG/PNG hasta 10 MB; evita segundo comprobante activo por token y persiste bytes. Falta prueba móvil/PC final. |
| Finanzas | OPERATIVO CON ALERTA | Bandejas, filtros, comprobante, validado/observado/rechazado y validación manual existen. Falta correo automático al comensal tras decisión financiera. |
| Minuta Admin Casino | OPERATIVO | Guardado/carga publica directamente mediante `publicarMinutaDirecta`; Coordinación no es requisito para disponibilidad de Reserva. |
| Coordinación | OPERATIVO COMO REVISIÓN NO BLOQUEANTE | Conserva revisión diaria y finalización; la visual común `MinutaPublicada` fue añadida sin quitar controles. |
| Cocina / demanda | OPERATIVO DE CÓDIGO | Demanda deduplica RUT + fecha + servicio y usa reservas activas. |
| Producción inicio/cierre | OPERATIVO CON PRUEBA REAL PENDIENTE | Inicio crea detalle y descuenta insumos si hay receta/stock; cierre exige producidas/entregadas y justificación de diferencias. |
| PDF Producción | OPERATIVO DE BUILD | PDF Carta, por servicio, dos columnas, institución, comensales, totales y casilla Entregado. |
| Bodega | PARCIAL RESPECTO RC8 | La vista web actual es principalmente consulta; el descuento automático sí existe dentro de `iniciarJornada()`, pero no reproduce toda la gestión física del producto original. |
| Gerencia | OPERATIVO DE CÓDIGO | Indicadores, finanzas, producción, resumen de estados y `MinutaPublicada` común. |
| Usuarios / permisos administrables | INACTIVO RESPECTO RC8 | La matriz de migración los contempla, pero el build actual no expone módulo `/usuarios`; hoy los permisos están definidos en código. |
| Motor interno de correos | PARCIAL | Existe SMTP y plantillas específicas, pero no existe todavía una fuente única administrable evento → TO/CC/CCO/activo/plantilla. |
| Reclamos | PARCIAL | Guarda caso/adjuntos y confirma al comensal. Aún no deriva el reclamo a destinatarios internos configurables. |

## Hallazgos nuevos de esta ronda

### 1. Reserva guardada podía responder como fallida si el correo/PDF fallaba — CORREGIDO

Antes:

1. `saveReservation()` confirmaba la transacción.
2. `notificarReservaConfirmada()` generaba PDF y enviaba SMTP.
3. Si ese segundo paso lanzaba excepción, el `catch` general devolvía HTTP 400 con mensaje de fallo de reserva.

Riesgo: reintentos innecesarios, falsa percepción de pérdida de reserva y posible modificación/duplicación de una reserva ya existente.

Corrección: el correo quedó aislado en un `try/catch` posterior al commit. La API devuelve `ok:true` si PostgreSQL confirmó la reserva aunque el correo falle. Commit `898c79d5`.

### 2. Corte horario usa offset fijo `-04:00` — PENDIENTE PRIORIDAD ALTA

`lib/reservation.ts` construye la hora del servicio como `YYYY-MM-DDTHH:00:00-04:00`. Esto no sigue automáticamente `America/Santiago` cuando cambia el horario de verano. Para fechas de septiembre posteriores al cambio de hora puede desplazar en una hora la regla de anticipación/cancelación.

No se cambió en esta ronda porque afecta reglas de negocio temporales y debe corregirse con una conversión robusta de zona horaria y prueba específica antes de desplegar.

### 3. Motor de correo todavía no resuelve destinatarios por evento

- Reserva: destinatario directo = correo del comensal.
- Comprobante recibido: destinatario directo = correo del comensal.
- Reclamos: actualmente se confirma solo al comensal desde el mismo action.
- Finanzas: no dispara notificación posterior al estado Pagado/Observado/Rechazado.
- No existe todavía configuración central `evento / TO / CC / CCO / activo / plantilla`.

Esto coincide con el próximo cierre solicitado: Admin Total debe poder asignar a qué correo va cada función y a quién se copia sin modificar código.

### 4. Banner septiembre aún no está desplegado como activo real

`public/email/septiembre/` contiene únicamente `README.txt`. La plantilla usa `SEPTEMBER_EMAIL_BANNER_URL`; por tanto, mientras no exista un archivo gráfico público o una URL absoluta válida, el diseño con mascota/logo no puede considerarse cerrado.

### 5. Diferencia RC8 → Next confirmada en administración de usuarios

La matriz RC8 contempla Usuarios/Auditoría como parte de AdminTotal, pero el build actual no tiene una ruta de administración de usuarios. La auditoría sí existe como registro/consulta, pero la administración de credenciales/permisos continúa fuera del circuito visible actual.

## Pruebas y verificaciones realizadas

1. Confirmación de rama y head previo: `725486d3`.
2. Revisión de deployment `725486d3`: `READY`.
3. Revisión de build: compilación, TypeScript y listado de rutas correctos.
4. Revisión runtime Vercel: sin errores en la ventana revisada.
5. Verificación HTTP `/login`: 200.
6. Inspección de `session.ts` y matriz `MODULES_BY_ROLE`.
7. Inspección de `saveReservation()` y API `/api/comensal/confirm`.
8. Inspección de carga de comprobante y límites de archivo.
9. Inspección de Finanzas: agrupación, filtros, estados, historial y transacciones.
10. Inspección de publicación directa de minuta y flujo opcional de Coordinación.
11. Inspección de Cocina/Producción, descuentos por receta/stock y cierre de jornada.
12. Inspección del PDF de Producción.
13. Inspección de Bodega y comparación con matriz RC8.
14. Inspección de Gerencia/Coordinación con visual común de minuta.
15. Corrección post-commit Reserva → Correo en `898c79d5`.
16. Build posterior a la corrección: correcto; deployment `READY`; sin errores runtime nuevos.

## Pendientes obligatorios antes de limpiar datos de prueba

1. Prueba autenticada real de cada rol: AdminTotal, AdminCasino, Finanzas, Cocina, Coordinación, Gerencia, Bodega y Operaciones.
2. Prueba completa Comensal → Reserva con una minuta PUBLICADA y confirmación en Mis Reservas.
3. Confirmar recepción de correo de reserva con PDF adjunto y monto correcto.
4. Cargar comprobante real desde móvil y PC.
5. Validar/observar/rechazar en Finanzas y confirmar consistencia de deuda y desbloqueo del RUT.
6. Ejecutar jornada de Cocina con reserva real: Pendiente → En producción → Finalizado.
7. Abrir y revisar PDF real de Producción con los datos creados en la prueba.
8. Corregir zona horaria de cutoff para usar `America/Santiago` sin offset fijo.
9. Implementar y probar motor de destinatarios administrable por evento.
10. Cargar el activo gráfico definitivo de septiembre con URL absoluta pública y probar Gmail/Outlook.
11. Solo después de estas pruebas: congelar checkpoint y preparar limpieza controlada de reservas/comprobantes/producción de prueba.

## Regla de cierre

No borrar todavía reservas, comprobantes, jornadas ni minutas usadas para prueba. La limpieza de datos debe hacerse después de que el circuito completo quede probado con evidencia y el motor de correos tenga al menos su configuración de destinatarios definida.
