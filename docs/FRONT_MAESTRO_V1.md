# Front Maestro V1 — checkpoint de implementación

Base: ZIP estable entregado por el usuario el 23-08-2026.

## Principios preservados

- Una sola fuente transaccional: reservas/demanda y sus estados.
- No se duplican tablas para dashboards.
- SMTP, autenticación, reservas y producción conservan su lógica base.
- Bodega/recetas/inventario no se eliminan; se ocultan de la navegación principal del Administrador Total.
- Coordinación sigue siendo una revisión separada de la minuta.
- Gerencia queda como consulta.

## Front reorganizado

- Shell corporativo común ALEMSI / Casino Mamuil Malal, sticky y responsive.
- Componentes reutilizables: PageHeader, StatCard, SectionCard, StatusBadge y WeeklyMenuCalendar.
- Admin Casino: minuta por rango + demanda real por plato/institución + reglas y gestión en segundo nivel.
- Cocina: minuta del día + raciones + preparaciones + jornada.
- Finanzas: Inicio / Por validar / Validados / Pagos / Comensales / Informes; solo Aceptar/Rechazar en nuevas acciones de UI.
- Coordinación: revisión simplificada y orientada a pendientes.
- Gerencia: resumen ejecutivo, estados de pago, producción, minutas y auditoría bajo demanda.
- Admin Total: nueva ruta /admin-total como acceso de gobierno y supervisión.

## Pendiente para el bloque funcional siguiente

- Sesión persistente de Comensal entre Reservar / Mis reservas / Comprobante / Atención.
- Bloqueo por reserva activa pendiente de regularización.
- Corrección definitiva del uploader de comprobante.
- Turnos ALEMSI Paso Fronterizo 7x7 configurables.
- Modalidades ALEMSI Oficina/Visita y perfiles especiales.
- Atención al comensal con folio, seguimiento y matriz de notificaciones.
- Cambios extraordinarios de minuta y reselección/actualización automática según modalidad.
- Datos bancarios editables + copiar datos / monto+referencia / todo para pagar.
- Branding HTML de correos e informes con logo oficial cuando el asset sea incorporado.

## Validación en este entorno

- `npm install` no finalizó dentro del tiempo disponible, por lo que no se certifica `next build` aquí.
- Pruebas estructurales sin dependencias: publicación de minutas, auditoría runtime y SMTP pasaron.
- El test histórico de perfiles espera que Bodega siga visible para Admin Total; el Front Maestro V1 la oculta deliberadamente sin eliminar la ruta/código.
- Algunos tests Node que importan `.ts` directamente no pueden ejecutarse con el Node 22 de este entorno sin loader TypeScript; no se modificaron artificialmente para hacerlos pasar.
