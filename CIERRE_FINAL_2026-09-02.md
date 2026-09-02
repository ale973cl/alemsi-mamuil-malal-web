# ALEMSI · Casino Mamuil Malal — Cierre final local 2026-09-02

## Integración incluida
- Reclamos: ficha única para Admin Casino, Admin Total, Coordinación, Gerencia y Finanzas.
- Cocina: consolidación servicio → opción/plato → institución → comensales, con raciones.
- PDF Producción: formato diario consolidado, con raciones e instituciones.
- Minutas: publicación directa; no se incorpora columna “Correo” en la planilla operativa.
- Perfiles: Admin Total utiliza /admin-casino como entrada operativa canónica.
- Sub-namespace /admin-total eliminado del paquete.
- Reserva: persistencia ocurre antes de programar el correo de confirmación; prueba actualizada a la implementación diferida actual.

## Pruebas ejecutadas y aprobadas
- tests/perfiles.test.mjs: 4/4
- tests/publicacion-minuta.test.mjs: 5/5
- tests/auditoria-runtime.test.mjs: 5/5
- tests/smtp.test.mjs: 3/3
- tests/comprobantes-mis-reservas.test.mjs: 3/3
- tests/correo-runtime.test.mjs: 3/3
- tests/cierre-final.test.mjs: 6/6

## Limitación del entorno local
El ZIP fuente no contiene node_modules y no fue posible instalar dependencias desde Internet.
Por ello, los tests que importan .ts directamente y `tsc --noEmit` no son certificación válida en este entorno:
faltan Next.js, React, pg, pdf-lib y @types/node. La validación definitiva de build debe realizarla Vercel al desplegar este paquete.

## Pendiente externo
- Comparación byte a byte con la rama Preview remota: no disponible en esta sesión porque los conectores GitHub/Vercel quedaron deshabilitados.
- Limpieza/corrección de usuarios y datos de prueba en Supabase: requiere conexión activa al proyecto; no se ejecutó desde este paquete.
