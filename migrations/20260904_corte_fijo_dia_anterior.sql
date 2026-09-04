ALTER TABLE configuracion_reservas
  ADD COLUMN IF NOT EXISTS hora_corte_dia_anterior integer NOT NULL DEFAULT 15;

ALTER TABLE configuracion_reservas
  DROP CONSTRAINT IF EXISTS configuracion_reservas_hora_corte_dia_anterior_check;

ALTER TABLE configuracion_reservas
  ADD CONSTRAINT configuracion_reservas_hora_corte_dia_anterior_check
  CHECK (hora_corte_dia_anterior BETWEEN 0 AND 23);
