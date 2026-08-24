# Auditoría operativa ALEMSI Mamuil Malal — Ronda 2

Fecha: 24-08-2026
Rama: `stable-accepted-20260824`
Commit base auditado: `900282c488572a93dd8408da199ce1629c344084`

## Resultado ejecutivo

Esta ronda confirmó que la estabilización del pool de PostgreSQL quedó desplegada y que no aparecieron nuevos errores runtime en la ventana revisada. También se identificaron dos diferencias de arquitectura que deben tratarse como pendientes reales y no como fallas de compilación: el motor interno de correos todavía no resuelve destinatarios por evento desde una configuración única, y la visual de minuta sigue siendo distinta en Coordinación/Admin Casino porque esas vistas contienen controles operativos propios.

## Infraestructura / Vercel

- Deployment más reciente de la rama: `dpl_Afjinbbdp6qJbiEyi1yKa12qKhRE`.
- Commit desplegado: `900282c488572a93dd8408da199ce1629c344084`.
- Estado: `READY`.
- Build: completado sin errores.
- Runtime errors en las últimas 2 horas: ninguno.
- `/login`: HTTP 200 y render correcto.
- Las rutas de Preview distintas de `/login` están detrás de Vercel Authentication/SSO, por lo que una prueba HTTP anónima directa sobre `/reserva` recibe redirección de protección de Vercel. Esto no se clasifica como error de la aplicación.

## Rutas y perfiles

### OPERATIVO DE CÓDIGO

La matriz central de permisos define rutas separadas y acceso por rol:

- AdminTotal: Admin Casino, Producción Admin, Finanzas, Coordinación, Cocina, Bodega, Operaciones y Gerencia.
- AdminCasino: Admin Casino, Producción Admin y Cocina.
- Finanzas: solo Finanzas.
- Coordinación: solo Coordinación.
- Cocina: solo Cocina.
- Gerencia: solo Gerencia.
- Bodega: solo Bodega.
- Operaciones: solo Operaciones.

No se detectó en esta ronda una ampliación accidental de permisos entre Finanzas, Coordinación, Gerencia y Cocina.

## Comensal / Reserva

### OPERATIVO DE CÓDIGO — PENDIENTE DE PRUEBA REAL AUTENTICADA

El árbol actual contiene rutas activas para:

- perfil de comensal;
- registro;
- menú/calendario;
- confirmación de reserva;
- listado de reservas;
- cancelación;
- comprobante por token.

La prueba completa de navegador no pudo ejecutarse desde el Preview anónimo por la protección SSO del deployment. Debe completarse con sesión real en la siguiente ronda o mediante el dominio operativo que no esté protegido por Preview Authentication.

## Comprobante

### OPERATIVO DE CÓDIGO

La ruta pública por token y la vista de comprobante siguen presentes. Se mantiene como pendiente la prueba real de subida de PDF/JPG/PNG y posterior lectura desde Finanzas en una misma transacción de prueba.

## Finanzas

### OPERATIVO DE CÓDIGO / PARCIAL EN NOTIFICACIONES

- Las acciones financieras están protegidas para `Finanzas` y `AdminTotal`.
- Validar, observar y rechazar persisten en la capa DB y auditan los cambios.
- La vista conserva estados operativos y acceso al comprobante.
- Los tests existentes validan principalmente estructura de código y reglas, no sustituyen una prueba end-to-end real.
- Hallazgo pendiente confirmado: después de `Pagado`, `Observado` o `Rechazado`, `app/finanzas/actions.ts` actualiza datos y revalida vistas, pero no dispara todavía una notificación al comensal.

No se añadió un correo hardcodeado en esta ronda porque el requisito actual es centralizar primero los destinatarios por evento.

## Minuta / Admin Casino

### OPERATIVO CON INCONSISTENCIA DE INTERFAZ

La publicación directa existe y ya está conectada a la carga/corrección:

- `minutaAction()` guarda una fila y llama `publicarMinutaDirecta()`.
- `guardarMinutasAction()` guarda el lote y publica directamente el rango.

Por lo tanto, Coordinación ya no es un bloqueo técnico para la publicación real al guardar/cargar una minuta.

Sin embargo, la pestaña visual `Coordinación` de Admin Casino conserva el formulario histórico de publicación visible solo cuando `flujo.estado === 'AUTORIZADA'`. Esto es una regresión de UX/flujo heredado: puede hacer creer al operador que la autorización sigue siendo obligatoria aunque la publicación directa ya haya ocurrido.

Se clasifica como **PARCIAL / CORREGIR INTERFAZ**, no como bloqueo backend.

## Coordinación

### OPERATIVO COMO REVISIÓN NO EDITABLE

Coordinación mantiene un circuito propio de revisión por día con `RevisionDia`, observaciones y finalización de revisión. No edita la minuta oficial ni Finanzas/Producción.

Hallazgo de visual: esta vista no usa `MinutaPublicada`; por eso no puede verse idéntica a Cocina/Gerencia sin incorporar un bloque read-only común adicional. No debe reemplazarse `RevisionDia`, porque eso eliminaría el circuito de revisión. La corrección segura futura es añadir una visual común de minuta y mantener debajo los controles de revisión.

## Cocina / Producción

### OPERATIVO DE CÓDIGO / PENDIENTE DE TRANSACCIÓN REAL

- Cocina consulta demanda por fecha.
- Existe inicio/cierre de jornada.
- Existe detalle por comensal/institución.
- Existe ruta de reporte PDF real.
- El PDF está conectado a Cocina y Admin Casino.

Pendiente: ejecutar una reserva real, verificar que aparezca en demanda y completar `Pendiente → En producción → Finalizado` con una fecha de prueba controlada.

## Gerencia

### OPERATIVO DE CÓDIGO

Gerencia ya usa el componente compartido `MinutaPublicada` para la minuta oficial. Además mantiene el bloque ejecutivo `Minutas oficiales` con conteos por estado. Ese bloque adicional explica la percepción de una lista distinta: no reemplaza la minuta, sino que aparece junto a ella.

Si se busca uniformidad visual total, se debe conservar el KPI ejecutivo pero diferenciarlo claramente de la sección de minuta publicada.

## Motor interno de correos

### PARCIAL / NO CENTRALIZADO

Estado actual:

- existe SMTP único;
- existen plantillas de reserva/comprobante;
- existe PDF adjunto de reserva;
- no existe aún una fuente única `evento → TO/CC/CCO/activo/plantilla` administrable desde la aplicación.

Esto impide cumplir todavía el requisito de asignar correos por función sin tocar código, por ejemplo:

- reclamo → destinatario principal + CC;
- comprobante recibido → Finanzas + reglas de copia;
- comprobante aprobado/rechazado → comensal;
- minuta publicada/modificada → destinatarios configurados;
- reporte de producción → correos configurados;
- solicitudes comerciales → correos comerciales.

La implementación futura debe resolver primero la estructura/configuración y después conectar cada evento; no se deben agregar destinatarios nuevos hardcodeados.

## Correo de reserva / imágenes

### PARCIAL

La plantilla usa HTML con tablas y CSS inline, compatible con clientes de correo. El banner depende de `SEPTEMBER_EMAIL_BANNER_URL`, pero el repositorio solo contiene `public/email/septiembre/README.txt`; no existe todavía el activo gráfico real dentro de `public/email/septiembre/`.

Mientras no exista el archivo real y una URL absoluta pública, Gmail/Outlook no podrán renderizar correctamente ese banner.

## Correcciones aplicadas en esta ronda

No se realizaron cambios funcionales destructivos ni cambios de flujo de negocio. La estabilización crítica del pool PostgreSQL ya estaba aplicada en `ffc9cbce` y se verificó que el deployment posterior continúa `READY` y sin errores runtime nuevos.

Se optó por no modificar durante esta ronda:

1. destinatarios de correo, porque deben centralizarse por evento;
2. datos de reserva/minuta, porque aún son necesarios para E2E;
3. controles de Coordinación, porque deben conservarse aunque se iguale la visual;
4. limpieza de datos, porque corresponde después de la auditoría final.

## Prioridad de la siguiente ronda

1. Prueba autenticada Comensal → Reserva con datos de prueba existentes.
2. Verificar recepción real del correo + PDF adjunto + enlace de comprobante.
3. Subir comprobante y verificar aparición inmediata en Finanzas.
4. Validar/observar/rechazar y comprobar estados/deuda.
5. Confirmar minuta publicada en Cocina, Gerencia y Coordinación sin duplicar lógica.
6. Ejecutar Producción sobre una fecha controlada y validar reporte PDF.
7. Diseñar la tabla/configuración única del motor de correos sin conectar aún destinatarios no confirmados.
