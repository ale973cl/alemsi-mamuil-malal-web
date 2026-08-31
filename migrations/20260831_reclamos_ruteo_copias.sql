-- Completa la configuración central de Reclamos con responsable principal y copias.
-- Aditiva e idempotente: no elimina ni modifica expedientes existentes.
ALTER TABLE reclamo_permisos
  ADD COLUMN IF NOT EXISTS recibe_copia BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS reclamo_categorias_config (
  categoria_key TEXT PRIMARY KEY,
  area_principal TEXT REFERENCES reclamo_areas_responsables(area_key),
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por TEXT
);

INSERT INTO reclamo_categorias_config (categoria_key)
VALUES
  ('COMIDA_SERVICIO'),
  ('PREPARACION_ALIMENTACION'),
  ('PAGO_DEUDA'),
  ('OTROS_SUGERENCIAS')
ON CONFLICT (categoria_key) DO NOTHING;
