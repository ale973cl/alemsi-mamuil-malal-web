# Prueba aislada — Configurador central de correos

## Objetivo
Probar un único configurador de comunicaciones en Admin Total sin modificar los motores operativos actuales ni reemplazar los envíos que ya funcionan.

## Regla
Cada módulo dispara un evento. El configurador central resuelve quién debe recibirlo.

Evento → Área/Responsable → PARA → CC → CCO → Plantilla → Activo → Trazabilidad

## Eventos iniciales a cubrir
- RESERVA_CONFIRMADA → comensal
- COMPROBANTE_RECIBIDO → comensal
- PAGO_APROBADO → comensal
- PAGO_RECHAZADO → comensal
- SOLICITUD_INFO_PAGO → comensal
- SOLICITUD_EXCEPCION_RESERVA → Admin Casino / encargado configurable
- RECLAMO_RECIBIDO → confirmación al comensal + derivación interna configurable
- RECLAMO_DERIVADO_CASINO → Admin Casino / encargado configurable
- CIERRE_JORNADA_COCINA → encargado configurable
- INCIDENCIA_COCINA → responsable configurable

## Alcance de esta rama
1. No tocar tablas ni estados productivos mientras no se confirme el esquema real.
2. No sustituir `enviarCorreoSmtp` ni las notificaciones actuales durante la primera prueba.
3. Prototipar en Admin Total la matriz de eventos y responsables.
4. Después conectar una sola acción de prueba, sin impacto operacional, antes de migrar eventos reales.
5. Registrar enviado/error sin invalidar la operación principal.

## Criterio de aprobación
- Un cambio de responsable o destinatario se realiza desde Admin Total sin modificar código.
- PARA/CC/CCO son configurables por evento.
- Un evento puede activarse/desactivarse.
- El sistema conserva trazabilidad de envío.
- Si el correo falla, la operación de negocio ya persistida no se revierte.
- Ningún módulo crea un motor paralelo.

## Estado al iniciar
Los correos funcionales actuales están implementados en `lib/email/notificaciones.ts` sobre `lib/email/smtp.ts`. El Centro de Administración ya identifica Comunicaciones y Responsables operativos como pendientes de conexión. Esta rama existe únicamente para experimentar con esa centralización y no debe fusionarse hasta completar una prueba funcional.