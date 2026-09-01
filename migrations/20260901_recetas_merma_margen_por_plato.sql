ALTER TABLE recetas_estandar
  ADD COLUMN IF NOT EXISTS margen_produccion_pct NUMERIC(6,2) NOT NULL DEFAULT 0
    CHECK (margen_produccion_pct >= 0 AND margen_produccion_pct <= 100),
  ADD COLUMN IF NOT EXISTS merma_pct NUMERIC(6,2) NOT NULL DEFAULT 0
    CHECK (merma_pct >= 0 AND merma_pct < 100);
