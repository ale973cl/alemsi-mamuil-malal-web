CREATE TABLE IF NOT EXISTS recetas_estandar (
  id BIGSERIAL PRIMARY KEY,
  plato TEXT NOT NULL UNIQUE,
  porciones_base INTEGER NOT NULL CHECK (porciones_base > 0),
  preparacion TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por TEXT,
  creado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por TEXT,
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id BIGSERIAL PRIMARY KEY,
  receta_id BIGINT NOT NULL REFERENCES recetas_estandar(id) ON DELETE CASCADE,
  ingrediente TEXT NOT NULL,
  cantidad NUMERIC(14,4) NOT NULL CHECK (cantidad >= 0),
  unidad TEXT NOT NULL DEFAULT '',
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS receta_ingredientes_receta_idx ON receta_ingredientes(receta_id, orden, id);
