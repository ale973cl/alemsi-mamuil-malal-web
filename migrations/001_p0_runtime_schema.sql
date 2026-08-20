-- P0 Next.js: ejecutar manualmente contra una réplica y revisar antes de producción.
-- Este archivo reemplaza el DDL que anteriormente se ejecutaba durante requests.
BEGIN;
CREATE TABLE IF NOT EXISTS configuracion_reservas (
  id INTEGER PRIMARY KEY DEFAULT 1,
  anticipacion_reserva_horas INTEGER DEFAULT 48,
  cancelacion_directa_horas INTEGER DEFAULT 24,
  max_dias_consecutivos INTEGER DEFAULT 7,
  excepciones_habilitadas INTEGER DEFAULT 1
);
INSERT INTO configuracion_reservas (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

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
  estado TEXT DEFAULT 'Pendiente', flujo_id INTEGER, version INTEGER DEFAULT 1
);
ALTER TABLE minuta_revision_coordinacion ADD COLUMN IF NOT EXISTS flujo_id INTEGER;
ALTER TABLE minuta_revision_coordinacion ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Índices para locks/búsquedas. Revisar duplicados históricos antes de convertirlos en UNIQUE.
CREATE INDEX IF NOT EXISTS idx_solicitudes_rut_fecha_servicio ON solicitudes(rut,fecha,servicio);
CREATE INDEX IF NOT EXISTS idx_solicitudes_referencia ON solicitudes(referencia_reserva);
CREATE INDEX IF NOT EXISTS idx_solicitudes_pago_token ON solicitudes(pago_token);
CREATE INDEX IF NOT EXISTS idx_comprobantes_pago_token ON comprobantes_pago(pago_token);
CREATE INDEX IF NOT EXISTS idx_minutas_publicables ON minutas(fecha,servicio,activo,estado);
COMMIT;
