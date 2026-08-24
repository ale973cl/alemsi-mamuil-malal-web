# Auditoría operativa ALEMSI Mamuil Malal — Ronda 3

Fecha: 24-08-2026
Rama: `stable-accepted-20260824`
Commit base al inicio: `c7f23b9e6257c8d5f40a11d323b2ed0ad45a990b`

## Resultado ejecutivo

La aplicación continúa estable después de la corrección del pool PostgreSQL: el deployment de `c7f23b9e` estaba `READY`, el build no mostró errores y Vercel no registró errores runtime en las últimas 3 horas. `/login` respondió HTTP 200. Las rutas internas del Preview continúan protegidas por Vercel SSO, por lo que no se puede completar una transacción autenticada desde una petición HTTP anónima.

Esta ronda añadió una comparación explícita con el inventario funcional del producto RC8/Streamlit. El hallazgo principal es que varios circuitos no están rotos: simplemente todavía no fueron migrados a Next.js o fueron reducidos a una versión de consulta. Deben quedar diferenciados de las regresiones reales.

## Estado actual por circuito

| Circuito | Estado | Resultado de esta ronda |
|---|---|---|
| Vercel / build | OPERATIVO REAL | Deployment `c7f23b9e` READY; build sin errores; sin errores runtime recientes. |
| Login interno | OPERATIVO REAL DE RUTA | `/login` HTTP 200 y formulario disponible. |
| Roles/permisos | OPERATIVO DE CÓDIGO | Las páginas internas mantienen `requireUser()` por perfil. |
| Comensal / sesión | OPERATIVO DE CÓDIGO, E2E PENDIENTE | Registro, perfil, menú, confirmación, reservas y cancelación siguen presentes. |
| Reserva | OPERATIVO DE CÓDIGO | Conserva validación RUT, deuda pasada, minuta PUBLICADA, referencia, código y token. |
| Correo reserva | PARCIAL | SMTP + HTML + PDF adjunto existen; falta prueba real de recepción y banner gráfico público definitivo. |
| Comprobante | OPERATIVO DE CÓDIGO, E2E PENDIENTE | Ruta por token, carga y persistencia existen. |
| Finanzas | OPERATIVO / NOTIFICACIÓN PARCIAL | Validar/observar/rechazar, historial y auditoría existen; aún no envía estado al comensal. |
| Admin Casino / minuta | OPERATIVO CON UX HEREDADA | Guardar/cargar publica directo, pero queda interfaz histórica de Coordinación que puede inducir a error. |
| Coordinación | OPERATIVO | Revisión por día permanece; en esta ronda se agregó además la misma visual común de minuta publicada sin retirar los controles. |
| Cocina / demanda | OPERATIVO DE CÓDIGO | Demanda, detalle por comensal e institución, jornada y PDF siguen conectados. |
| Producción / PDF | OPERATIVO DE BUILD | Endpoint y enlaces reales presentes; falta validación con una reserva transaccional controlada. |
| Gerencia | OPERATIVO | Mantiene KPIs y `MinutaPublicada`; se aclaró visualmente que la lista superior es un resumen de estados, no la minuta. |
| Bodega | PARCIAL / REDUCIDA | La página Next actual es de consulta de inventario y stock; no equivale al circuito completo del producto original. |
| Motor de correos por evento | NO MIGRADO COMPLETO | SMTP existe, pero falta fuente única administrable evento → PARA/CC/CCO/activo/plantilla. |

## Comparación con el producto original RC8/Streamlit

`docs/SOURCE_INVENTORY.json` registra capacidades del producto original que deben considerarse en la recuperación funcional. Entre ellas:

- configuración bancaria y cache de banco;
- subida/descarga de comprobantes en Drive;
- generación de respaldo lógico y respaldo en Drive;
- administración de usuarios/permisos, clave temporal y correos de acceso;
- encuestas y satisfacción;
- reglas avanzadas de reserva, reserva comercial, cancelación directa y excepciones;
- modalidades de pago por institución y gráficos;
- resumen financiero compacto;
- minuta semanal;
- deuda vencida bloqueante;
- recetas, ingredientes y PDF de ingredientes del día;
- inventario de Bodega, inventarios físicos y tareas de inventario de Cocina;
- documentos fuente de minuta y extracción PDF;
- observaciones de Gerencia por rango;
- flujo/notificaciones de Coordinación;
- actividad general del sistema y auditoría/login.

### Clasificación de paridad encontrada

**Migrado o reconstruido en Next:** login/roles básicos, Comensal, Reserva, deuda temporal, minuta publicada, comprobantes, Finanzas, Coordinación, Cocina/Producción, PDF de producción, Gerencia y auditoría básica.

**Migrado parcialmente:** correo, Bodega, reglas de reserva, minutas/Coordinación, reportes ejecutivos, recetas/ingredientes.

**No comprobado o no migrado como circuito equivalente:** respaldo Drive, administración completa de usuarios/permisos desde interfaz, encuestas/satisfacción, configuración central de destinatarios de correo, documentos fuente de minuta/PDF original, inventario físico y tareas de Bodega/Cocina, observaciones formales de Gerencia por rango y algunas modalidades/reglas comerciales del RC8.

Esto explica por qué ciertas funciones recordadas del producto original no aparecen o no actúan en la web actual: parte del alcance se reconstruyó por módulos y no toda la lógica RC8 fue portada.

## Correcciones seguras aplicadas

### 1. Coordinación — visual común de minuta

Commit: `9e99751715ede5cc5354b748250500b4962805cc`

Se agregó `MinutaPublicada` a Coordinación como bloque de solo lectura, conservando íntegramente `RevisionDia`, observaciones y finalización de revisión. No se eliminó ninguna función del circuito de Coordinación.

### 2. Gerencia — diferenciación de KPI y minuta real

Commit: `1bcbde20a9e332ca8bdbd43a618fdc8b4e9abf2a`

El bloque que decía `Minutas oficiales` se renombró a `Resumen de estados de minuta` y ahora aclara que el documento oficial completo se muestra más abajo con el componente común. No se alteraron consultas ni indicadores.

## Correo e imágenes

La plantilla de reserva ya utiliza HTML con tablas y CSS inline. Sin embargo, `public/email/septiembre/` contiene únicamente `README.txt`; no existe el banner oficial real en ese directorio. Por lo tanto, no se debe declarar el banner como resuelto hasta incorporar el activo aprobado y usar una URL absoluta pública.

El problema central del motor de correo sigue siendo funcional: la aplicación aún no posee una configuración única administrable de destinatarios por evento. No se agregaron correos hardcodeados durante esta ronda.

## Limitaciones de prueba E2E

La rama auditada se despliega como Preview con Vercel Authentication. `web_fetch_vercel_url` puede comprobar `/login`, pero las rutas internas devuelven el redireccionamiento de SSO antes de que una petición anónima alcance una sesión de usuario de la aplicación. Por ello, siguen pendientes las pruebas de navegador con credenciales reales para:

1. Comensal → Reserva;
2. recepción del correo y PDF;
3. carga de comprobante;
4. Finanzas → validar/observar/rechazar;
5. demanda en Cocina;
6. inicio/cierre de Producción;
7. apertura y revisión del PDF de Producción.

## Datos de prueba y limpieza final

No borrar reservas, comprobantes, minutas ni jornadas todavía. Esos datos son necesarios para terminar la última prueba punta a punta. La limpieza debe ejecutarse solo después del checkpoint final, preservando usuarios, roles, configuraciones, maestros y la minuta oficial que deba quedar vigente.

## Prioridad siguiente

1. Esperar y verificar que los deployments de `9e997517` y `1bcbde20` terminen READY.
2. Revisar errores runtime posteriores a ambos cambios.
3. Completar la matriz de paridad RC8 → Next para motor de correos, Bodega, usuarios/permisos, encuestas y documentos de minuta.
4. No iniciar migraciones grandes todavía: primero cerrar la prueba E2E del circuito principal.
5. Después del E2E, definir limpieza controlada y estructura definitiva del motor de correos por evento.
