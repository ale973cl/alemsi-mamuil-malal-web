# ALEMSI Mamuil Malal — Línea evolutiva usada para el port Vercel

Esta candidata **no deriva de RC10**. Se reconstruye desde el histórico v39→RC9/RC8 FAST, conservando las reglas aprobadas y corrigiendo incompatibilidades detectadas por comparación estática.

## Versiones inspeccionadas
- `ALEMSI_v2.1.3.39_CIERRE_REVISION.zip` — 4558 líneas · 63 funciones.
- `ALEMSI_v2.1.3.40_CIERRE_ARQUITECTURA_CORREGIDA.zip` — 4838 líneas · 71 funciones.
- `ALEMSI_v2.1.3.40_COCINA_FINAL_PRESENTACION.zip` — 5326 líneas · 77 funciones.
- `ALEMSI_v2.1.3.40_COORDINACION_CORREOS.zip` — 5698 líneas · 84 funciones.
- `ALEMSI_v2.1.3.40_RC2_INTEGRADA.zip` — 5736 líneas · 84 funciones.
- `ALEMSI_v2.1.3.40_RC3_ESTABILIZADA.zip` — 5777 líneas · 84 funciones.
- `ALEMSI_v2.1.3.41_RC4_MINUTAS_PERFILES.zip` — 6134 líneas · 94 funciones.
- `ALEMSI_v2.1.3.42_RC5_PRUEBA.zip` — 6150 líneas · 94 funciones.
- `ALEMSI_v2.1.3.43_RC6_CORREGIDA.zip` — 6194 líneas · 95 funciones.
- `ALEMSI_v2.1.3.44_RC7_MINUTAS_RESTAURADAS.zip` — 6179 líneas · 95 funciones.
- `ALEMSI_v2.1.3.45_RC8_CIRCUITOS_FUNCIONALES.zip` — 6370 líneas · 103 funciones.
- `ALEMSI_v2.1.3.45_RC8_FAST_CALENDARIO.zip` — 6402 líneas · 103 funciones.
- `ALEMSI_v2.1.3.46_RC9_PRESENTACION_ESTABLE.zip` — 6341 líneas · 109 funciones.

## Invariantes preservados
- Reserva = demanda; nunca descuenta Bodega.
- Producción consolida y deduplica por RUT + fecha + servicio.
- Bodega solo descuenta una vez al iniciar jornada y únicamente con minuta vigente + receta aprobada.
- Coordinación revisa/observa/autoriza; no edita la minuta oficial.
- Finanzas valida/rechaza comprobantes y deja trazabilidad.
- AdminCasino administra reglas y minutas; editar una minuta invalida una autorización previa.
- Gerencia es lectura/consulta.
- Login interno conserva SHA-256 para compatibilidad con la tabla histórica `usuarios`.

## Correcciones aplicadas en el port
- Se eliminó el valor fijo de 48 h en modificación de reservas; ahora usa `configuracion_reservas.anticipacion_reserva_horas`.
- Producción usa exactamente los estados históricos `Pendiente → En producción → Finalizado` y las columnas reales de `jornadas_produccion`.
- Inicio de jornada usa `pg_advisory_xact_lock` para impedir doble descuento.
- Descuento de Bodega replica receta aprobada + merma + margen + FIFO por caducidad.
- Coordinación crea de forma idempotente `flujo_id` y `version` en la tabla de revisión, porque RC9 los usa aunque no estaban garantizados en su inicializador.
- Acceso a PostgreSQL queda exclusivamente bajo `lib/db/`.
