-- Configuración central de responsables y permisos de Reclamos.
-- Es aditiva e idempotente: no modifica ni elimina expedientes existentes.
CREATE TABLE IF NOT EXISTS reclamo_areas_responsables (
  area_key TEXT PRIMARY KEY,
  area_nombre TEXT NOT NULL,
  rol TEXT NOT NULL,
  responsable TEXT NOT NULL DEFAULT '',
  correo TEXT NOT NULL DEFAULT '',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER NOT NULL DEFAULT 0,
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por TEXT
);

CREATE TABLE IF NOT EXISTS reclamo_permisos (
  categoria_key TEXT NOT NULL,
  area_key TEXT NOT NULL REFERENCES reclamo_areas_responsables(area_key),
  puede_ver BOOLEAN NOT NULL DEFAULT FALSE,
  puede_solucionar BOOLEAN NOT NULL DEFAULT FALSE,
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por TEXT,
  PRIMARY KEY (categoria_key,area_key)
);

INSERT INTO reclamo_areas_responsables (area_key,area_nombre,rol,orden) VALUES
  ('ADMIN_CASINO','Administración Casino','AdminCasino',1),
  ('CASINO','Casino','Casino',2),
  ('COORDINACION','Coordinación','Coordinacion',3),
  ('FINANZAS','Finanzas','Finanzas',4),
  ('GERENCIA','Gerencia','Gerencia',5),
  ('COCINA','Cocina','Cocina',6)
ON CONFLICT (area_key) DO NOTHING;

INSERT INTO reclamo_permisos (categoria_key,area_key,puede_ver,puede_solucionar)
SELECT categoria.key,area.area_key,
       area.area_key='ADMIN_CASINO',area.area_key='ADMIN_CASINO'
FROM (VALUES ('COMIDA_SERVICIO'),('PREPARACION_ALIMENTACION'),('PAGO_DEUDA'),('OTROS_SUGERENCIAS')) AS categoria(key)
CROSS JOIN reclamo_areas_responsables area
WHERE area.area_key IN ('ADMIN_CASINO','CASINO','COORDINACION','FINANZAS','GERENCIA','COCINA')
ON CONFLICT (categoria_key,area_key) DO NOTHING;
