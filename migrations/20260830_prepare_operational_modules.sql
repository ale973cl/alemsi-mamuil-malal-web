-- Migración idempotente para Preview. Ejecutar una sola vez durante el despliegue,
-- nunca desde una petición HTTP. Solo crea objetos ausentes; no elimina ni renombra datos.

CREATE TABLE IF NOT EXISTS configuracion_reservas (
  id INTEGER PRIMARY KEY DEFAULT 1,
  anticipacion_reserva_horas INTEGER DEFAULT 48,
  cancelacion_directa_horas INTEGER DEFAULT 24,
  max_dias_consecutivos INTEGER DEFAULT 7,
  excepciones_habilitadas INTEGER DEFAULT 1
);
ALTER TABLE configuracion_reservas ADD COLUMN IF NOT EXISTS modalidad_cierre TEXT DEFAULT 'DIA_COMPLETO';
ALTER TABLE configuracion_reservas ADD COLUMN IF NOT EXISTS anticipacion_oficina_horas INTEGER DEFAULT 48;
ALTER TABLE configuracion_reservas ADD COLUMN IF NOT EXISTS anticipacion_otros_horas INTEGER DEFAULT 48;
ALTER TABLE configuracion_reservas ADD COLUMN IF NOT EXISTS ventana_maxima_dias INTEGER DEFAULT 31;

CREATE TABLE IF NOT EXISTS minuta_flujo_coordinacion (
  id SERIAL PRIMARY KEY, fecha_desde TEXT NOT NULL, fecha_hasta TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, estado TEXT NOT NULL DEFAULT 'EN_REVISION',
  observacion TEXT, enviado_por TEXT, enviado_at TEXT, coordinador TEXT,
  coordinacion_at TEXT, activo INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS minuta_revision_coordinacion (
  id SERIAL PRIMARY KEY, fecha TEXT NOT NULL, servicio TEXT NOT NULL,
  tipo_opcion TEXT NOT NULL, plato_actual TEXT, accion TEXT NOT NULL,
  observacion TEXT, plato_propuesto TEXT, usuario TEXT, fecha_accion TEXT,
  estado TEXT DEFAULT 'Pendiente'
);
ALTER TABLE minuta_revision_coordinacion ADD COLUMN IF NOT EXISTS flujo_id INTEGER;
ALTER TABLE minuta_revision_coordinacion ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS solicitudes_extraordinarias (
  id BIGSERIAL PRIMARY KEY, rut TEXT NOT NULL, referencia_reserva TEXT,
  solicitud_id BIGINT, fecha DATE NOT NULL, servicio TEXT, plato TEXT,
  tipo TEXT NOT NULL, motivo TEXT NOT NULL, estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  creada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resuelta_at TIMESTAMPTZ,
  resuelta_por TEXT, observacion_resolucion TEXT,
  cantidad_afectada INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_extraordinarias_estado ON solicitudes_extraordinarias(estado,fecha);
CREATE INDEX IF NOT EXISTS idx_solicitudes_extraordinarias_rut ON solicitudes_extraordinarias(rut,fecha);

-- Reclamos: la tabla de ingreso ya existe; se amplía sin sobrescribir sus filas.
ALTER TABLE reclamos_sugerencias ADD COLUMN IF NOT EXISTS area_actual TEXT DEFAULT 'AdminCasino';
ALTER TABLE reclamos_sugerencias ADD COLUMN IF NOT EXISTS actualizado_por TEXT;
ALTER TABLE reclamos_sugerencias ADD COLUMN IF NOT EXISTS fecha_actualizacion TEXT;
CREATE TABLE IF NOT EXISTS reclamo_movimientos (
  id BIGSERIAL PRIMARY KEY, reclamo_id BIGINT NOT NULL,
  actor TEXT NOT NULL, actor_rol TEXT NOT NULL, accion TEXT NOT NULL,
  destino_rol TEXT, mensaje TEXT, estado_resultante TEXT, fecha TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reclamo_adjuntos (
  id BIGSERIAL PRIMARY KEY, reclamo_id BIGINT NOT NULL, movimiento_id BIGINT,
  nombre_archivo TEXT NOT NULL, mime_type TEXT, contenido BYTEA NOT NULL,
  cargado_por TEXT, cargado_rol TEXT, fecha_carga TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reclamos_area_estado ON reclamos_sugerencias(area_actual,estado,id DESC);
CREATE INDEX IF NOT EXISTS idx_reclamo_movimientos_caso ON reclamo_movimientos(reclamo_id,id);
CREATE INDEX IF NOT EXISTS idx_reclamo_adjuntos_caso ON reclamo_adjuntos(reclamo_id,id);

-- Encuesta de satisfacción preparada para carga diferida por pestaña.
CREATE TABLE IF NOT EXISTS encuestas_satisfaccion (
  id BIGSERIAL PRIMARY KEY, rut TEXT, nombre TEXT, puntuacion INTEGER NOT NULL,
  comentario TEXT, fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado TEXT NOT NULL DEFAULT 'RECIBIDA'
);
CREATE INDEX IF NOT EXISTS idx_encuestas_satisfaccion_fecha ON encuestas_satisfaccion(fecha DESC,id DESC);
