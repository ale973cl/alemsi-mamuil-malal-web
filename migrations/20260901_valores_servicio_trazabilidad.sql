ALTER TABLE instituciones ADD COLUMN IF NOT EXISTS actualizado_por text;
ALTER TABLE instituciones ADD COLUMN IF NOT EXISTS actualizado_at text;
ALTER TABLE excepciones_personas ADD COLUMN IF NOT EXISTS actualizado_por text;
ALTER TABLE excepciones_personas ADD COLUMN IF NOT EXISTS actualizado_at text;
CREATE UNIQUE INDEX IF NOT EXISTS excepciones_personas_rut_uidx ON excepciones_personas (rut) WHERE rut IS NOT NULL;
