ALTER TABLE configuracion_reservas
  ADD COLUMN IF NOT EXISTS modalidad_cierre text NOT NULL DEFAULT 'DIA_COMPLETO',
  ADD COLUMN IF NOT EXISTS anticipacion_oficina_horas integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS anticipacion_paso_horas integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS anticipacion_otros_horas integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS ventana_maxima_dias integer NOT NULL DEFAULT 31;

UPDATE configuracion_reservas
SET anticipacion_oficina_horas = 24,
    anticipacion_paso_horas = 24,
    modalidad_cierre = COALESCE(NULLIF(modalidad_cierre,''),'DIA_COMPLETO'),
    ventana_maxima_dias = COALESCE(ventana_maxima_dias,31)
WHERE id = 1;
