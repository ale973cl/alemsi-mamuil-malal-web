# ALEMSI Mamuil Malal — Front Maestro V2

Checkpoint acumulativo construido sobre `ALEMSI_MAMUIL_FRONT_MAESTRO_V1`.

## Implementado en este checkpoint

- Formato visual global de fechas `DD-MM-AAAA` y fecha/hora `DD-MM-AAAA HH:mm` mediante utilitario reutilizable.
- Minuta semanal reutilizable y desplegable: día → servicio → plato/opción → institución → comensales.
- Cantidades de demanda calculadas desde reservas activas; no se crean contadores paralelos.
- Admin Casino mantiene minuta central y añade salida imprimible/Guardar PDF desde navegador.
- Cocina muestra ventana de planificación de hasta 72 horas, minuta/demanda y cierre diario separado.
- Cocina muestra receta/ingredientes teóricos cuando existe receta activa/aprobada; inventario solo se descuenta al iniciar producción, conservando la regla existente.
- Gerencia incorpora selector de período y métricas: reservas, raciones, pagos pendientes de validación, recaudado, pendiente por recaudar y valorización de costo asumido.
- Valorización ejecutiva distingue costo asumido ALEMSI y Coordinación usando valores institucionales cuando la reserva interna está en $0.
- Finanzas muestra N.º de reserva amigable, fechas visuales normalizadas, total recaudado, pendiente por recaudar y costo asumido valorizado.
- Nuevas acciones de Finanzas siguen limitadas a Aceptar/Rechazar; se elimina Observado de la función de validación nueva.
- Sesión simple de comensal con cookie httpOnly de 4 horas tras identificación; Mis reservas reutiliza esa identidad sin volver a pedir RUT.
- Comprobante muestra N.º de reserva amigable y botones Volver a Mis reservas / Salir del portal.
- SMTP recupera función de envío real y sanitiza espacios de `EMAIL_PASS`.
- Al cargar comprobante se intenta enviar correo de recepción y se registran trazas `COMPROBANTE_EMAIL_START/OK/ERROR`.
- Al confirmar reserva se intenta enviar correo de confirmación sin anular la reserva si SMTP falla.

## Conservado sin eliminar

- Autenticación y roles.
- Reserva y referencia técnica interna.
- Producción e inicio/cierre de jornada.
- Auditoría.
- Bodega/recetas existentes, aunque no se convierten en navegación principal.
- Estados históricos antiguos pueden seguir existiendo en BD; la interfaz nueva de pagos no promueve Observado.

## Pendiente para siguientes checkpoints

- Circuito completo de turnos ALEMSI 7x7 configurable.
- Atención al comensal con folio, notificaciones y seguimiento transversal.
- Carga de minuta PDF con parser de formatos históricos y conciliación difusa del maestro de platos.
- Editor manual de minuta en matriz completa y carga masiva con vista previa de conciliación.
- Datos bancarios editables/copiar todo + plantilla corporativa HTML completa de correos.
- Informes PDF institucionales dedicados y snapshots históricos de cierre de producción.
- Alertas por excepciones vía correo a Admin Casino y Cocina.

## QA ejecutado en este entorno

- Parseo sintáctico TS/TSX: 78 archivos, 0 errores sintácticos.
- `test:smtp`: aprobado 3/3 después de separar correctamente prueba de verificación y función de envío.
- `npm install` no terminó dentro del tiempo disponible; por ello `next build` y typecheck con dependencias completas deben ejecutarse en Node/Vercel antes de declarar el checkpoint estable.
