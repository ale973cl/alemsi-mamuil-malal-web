ALTER TABLE reclamos_sugerencias
  ADD COLUMN IF NOT EXISTS consulta_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS reclamos_sugerencias_consulta_token_uidx
  ON reclamos_sugerencias (consulta_token);
