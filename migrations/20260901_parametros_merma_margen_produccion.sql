CREATE TABLE IF NOT EXISTS parametros_produccion (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  margen_produccion_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (margen_produccion_pct >= 0 AND margen_produccion_pct <= 100),
  merma_promedio_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (merma_promedio_pct >= 0 AND merma_promedio_pct < 100),
  actualizado_por TEXT,
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO parametros_produccion (id, margen_produccion_pct, merma_promedio_pct)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;
