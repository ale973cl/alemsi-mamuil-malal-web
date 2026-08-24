# Auditoría operativa ALEMSI Mamuil Malal — 24-08-2026

Rama auditada: `stable-accepted-20260824`

Objetivo: determinar qué circuitos del producto original se conservaron correctamente en la migración, cuáles quedaron degradados, parciales o ausentes, y cuáles fueron reconstruidos durante esta etapa. La auditoría debe priorizar recuperación de funcionalidad existente antes de agregar funciones nuevas.

## Estado base confirmado

- Último commit funcional previo a la auditoría nocturna: `d91eac6bf20c69622848ecb59473819b128f5481` — vista compacta semanal de minuta en Cocina.
- Los módulos principales ya cuentan con funciones reconstruidas o mejoradas de forma incremental.
- Las minutas de prueba ya fueron publicadas y el calendario de reserva aparece, por lo que esos datos se mantienen durante la auditoría para permitir pruebas punta a punta.
- No borrar datos de prueba hasta terminar la última revisión funcional.

## Objetivo específico de esta auditoría

1. Comparar los circuitos actuales con el comportamiento esperado del producto original/Streamlit y detectar regresiones de migración.
2. Identificar por qué funciones que existían en el producto original no quedaron activas u operativas en la versión Next.js/Vercel.
3. Distinguir entre función inexistente, función presente pero desconectada, función visual sin lógica, función parcialmente operativa y función completamente operativa.
4. Probar de punta a punta usando los datos de prueba actualmente cargados.
5. Corregir solo regresiones y fallas seguras, sin eliminar ni degradar circuitos ya operativos.
6. Mantener las minutas y reservas de prueba hasta completar toda la revisión.
7. Después de la última revisión aprobada, preparar una limpieza controlada de datos transaccionales de prueba antes de pasar a modo de prueba operativa real.
8. Configurar y centralizar el motor interno de correos para que cada evento tenga destinatarios definidos desde una configuración administrable, evitando correos codificados directamente en múltiples archivos.

## Matriz de circuitos

| Circuito | Estado inicial | Evidencia / alcance | Prueba pendiente |
|---|---|---|---|
| Login / roles internos | OPERATIVO CON REVISIÓN | `requireUser()` protege Cocina, Gerencia y módulos internos. | Recorrer todos los perfiles y verificar redirecciones/permisos. |
| Comensal / sesión | PARCIALMENTE VERIFICADO | Se han corregido sesión persistente, navegación y reanudación del wizard en commits recientes. | Prueba completa móvil + PC desde login/RUT hasta reserva y salida. |
| Reserva | OPERATIVO CON ALERTA | La reserva genera código, payment token y notificación; hubo correcciones de duplicidad y fechas. | Confirmar creación real, persistencia, calendario completo y deuda calculada. |
| Correo de reserva | OPERATIVO CON ALERTA | SMTP HTML y PDF adjunto compilados y desplegados. | Confirmar recepción real: banner septiembre, monto correcto, datos bancarios, PDF adjunto y botón de comprobante. |
| Motor interno de correos | PARCIAL / REQUIERE CENTRALIZACIÓN | Existen SMTP y plantillas, pero debe auditarse cómo se resuelven destinatarios por evento. | Crear mapa evento → destinatario/CC/CCO/activo y conectarlo a configuración administrable. |
| PDF detalle reserva | OPERATIVO DE BUILD | Generador agregado y deployment READY. | Abrir adjunto real recibido y revisar fechas, servicios, opciones, platos, código y monto. |
| Carga de comprobante | PARCIALMENTE VERIFICADO | Flujo existente y probado manualmente previamente con PDF/PNG; hubo lentitud móvil. | Probar teléfono y PC, PDF/PNG/JPG según contrato vigente, persistencia y consulta posterior. |
| Finanzas | OPERATIVO CON ALERTA | Vista de pagos/comprobantes existe y procesa estados. | Confirmar que una reserva nueva aparece inmediatamente, filtro RUT funciona y deuda total coincide. |
| Minuta / Admin Casino | OPERATIVO CON ALERTA | Carga, guardado publicable y publicación directa ya implementados; Coordinación no bloquea publicación. | Cargar minuta de prueba, sobreescribir sin reservas, publicar y comprobar consumo. Mantener datos hasta auditoría final. |
| Minuta publicada / Cocina | OPERATIVO DE BUILD | Vista semanal compacta desplegada, usa `MinutaPublicada`. | Validar datos reales y responsive móvil/PC. |
| Minuta publicada / Gerencia | OPERATIVO DE CÓDIGO | Gerencia obtiene `obtenerMinutasRango()` y renderiza `MinutaPublicada`. | Igualar visual final y verificar que no quede presentación alternativa/listado aislado. |
| Minuta publicada / otros perfiles | PENDIENTE DE AUDITORÍA | Debe identificarse cada perfil que consume minuta y unificar componente/visual. | Revisar Coordinación, Finanzas, Comensal y Admin Casino y eliminar divergencias visuales sin cambiar permisos. |
| Cocina / demanda diaria | OPERATIVO CON REVISIÓN | `demandaFecha`, jornada y detalle por comensal/institución están conectados. | Crear reservas reales y comprobar suma por plato/tipo e institución. |
| Producción / jornada | PARCIALMENTE VERIFICADO | Inicio/cierre y estado de jornada existen. | Ejecutar punta a punta: Pendiente → En producción → Finalizado sin romper reservas. |
| Reporte PDF Producción | OPERATIVO DE BUILD | Endpoint PDF real conectado desde Cocina/Admin Casino y builds posteriores READY. | Abrir PDF real: Carta, distribución compacta, dos columnas, hipocalórico, comensales, institución y casilla de entrega. |
| Admin Casino / Producción | OPERATIVO DE CÓDIGO | Acceso a supervisión y reporte diario implementado. | Verificar misma fuente de datos que Cocina y regreso conservando fecha. |
| Gerencia / indicadores | OPERATIVO CON REVISIÓN | Dashboard muestra reservas, raciones, valor, finanzas, producción, minutas y auditoría. | Verificar cifras contra datos reales de prueba. |
| Coordinación | NO BLOQUEANTE / REVISAR | Ya no debe ser requisito para publicar minuta. | Confirmar que ningún flujo operativo dependa todavía de una autorización de Coordinación. |
| Recuperar clave | PENDIENTE | Requerimiento registrado y existía funcionalidad equivalente en versiones previas. | Comparar con Streamlit e implementar sin romper login. |
| Reclamos | FUERA DEL CIERRE ACTUAL | Circuito existente parcialmente; destinatario de Coordinación registrado para futura implementación oficial. | Auditar en etapa posterior. |

## Comparación obligatoria con el producto original

La auditoría debe buscar específicamente funciones que existían en la versión original y que en la migración quedaron:

- omitidas;
- convertidas en botones sin acción;
- convertidas en vistas sin persistencia;
- desconectadas de la base de datos;
- duplicadas en una lógica nueva que no utiliza el circuito real;
- ocultas por permisos o navegación;
- dependientes de rutas/columnas/tablas que cambiaron durante la migración.

Cada hallazgo debe registrar: módulo original, comportamiento esperado, estado actual, causa probable, corrección realizada o pendiente y evidencia de prueba.

## Plan posterior a la auditoría final

No ejecutar antes de terminar todas las pruebas.

### A. Congelar checkpoint funcional

- Confirmar último commit estable y deployment READY.
- Registrar matriz final de módulos OPERATIVO / PARCIAL / INACTIVO / PENDIENTE.
- Conservar respaldo de los datos de prueba antes de cualquier limpieza.

### B. Limpieza controlada de datos de prueba

La limpieza debe afectar solo datos transaccionales de pruebas, después de revisar dependencias y claves foráneas. Deben preservarse usuarios, roles, configuraciones, maestros, recetas/platos que se decida conservar, parámetros y estructura de base de datos.

Candidatos a limpiar, previa revisión de esquema real:
- reservas de prueba;
- selecciones/detalles asociados;
- comprobantes y pagos de prueba;
- estados financieros derivados de esas reservas;
- jornadas/producción originadas por reservas de prueba;
- auditoría puramente de prueba si se decide reiniciar historial operativo.

Las minutas publicadas se decidirán por separado: no se eliminan automáticamente con las reservas.

### C. Motor interno de correos

Objetivo: un único motor de salida y una única configuración de destinatarios.

La configuración debe permitir, como mínimo:
- evento/tipo de notificación;
- destinatario TO;
- CC;
- CCO;
- activo/inactivo;
- descripción;
- plantilla asociada;
- remitente o alias si corresponde.

Eventos a mapear durante la auditoría:
- reserva confirmada → comensal;
- comprobante recibido → comensal y/o Finanzas según regla final;
- comprobante aprobado/rechazado → comensal;
- minuta publicada/modificada → perfiles que corresponda;
- cambio de minuta con reservas existentes → comensales afectados;
- reporte de producción → destinatarios configurables;
- reclamo → Coordinación (`jlabbe@interior.gob.cl`) cuando ese circuito sea habilitado oficialmente.

No hardcodear destinatarios nuevos mientras no se confirme la configuración final.

## Reglas de auditoría nocturna

1. No borrar ni degradar funciones operativas.
2. No limpiar datos de prueba antes de la última revisión.
3. No fusionar a `main` mientras existan fallas críticas sin identificar.
4. Cada corrección debe compilar y tener deployment `READY` antes de continuar.
5. Distinguir siempre entre: `OPERATIVO REAL`, `OPERATIVO DE BUILD`, `PARCIAL`, `PENDIENTE`, `ROTO`.
6. No declarar un circuito punta a punta como operativo solo porque compile.
7. Registrar cada prueba con fecha/hora, perfil, ruta, dato utilizado, resultado y commit si hubo corrección.
8. Priorizar recuperar circuitos del producto original antes de incorporar nuevas funciones.

## Rondas nocturnas

### Ronda inicial — 03:58–04:00 Chile

- Branch confirmada en `d91eac6b`.
- Deployment correspondiente confirmado `READY`.
- Gerencia ya usa `MinutaPublicada` con rango de fechas; no es un módulo sin minuta, aunque conserva bloques de resumen/listado ejecutivo además de la vista publicada.
- Pendiente principal inmediato: unificar la presentación semanal de minuta en todos los perfiles que la consumen y realizar pruebas reales punta a punta de Reserva → Correo/PDF → Comprobante → Finanzas → Cocina/Producción → Reporte.

### Ajuste de alcance — 04:10 Chile

- La auditoría se redefine para determinar por qué funcionalidades que existían en el producto original no se conservaron íntegramente durante la migración.
- Se mantiene la información de prueba cargada hasta finalizar todas las validaciones.
- Después de la última revisión se ejecutará, previa aprobación, una limpieza controlada de reservas y datos transaccionales de prueba.
- El cierre incluirá diseño del motor interno de correos configurable por evento y destinatario.

> Las siguientes rondas nocturnas deben anexarse debajo de esta sección.
