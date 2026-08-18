import 'server-only';
import { query } from '@/lib/db/pool';

export type MinutaRow = {
  fecha: string;
  dia_semana: string | null;
  servicio: string;
  tipo_opcion: string | null;
  plato: string;
};

export async function obtenerMinutasRango(inicio: string, fin: string): Promise<MinutaRow[]> {
  return query<MinutaRow>(
    `SELECT fecha,dia_semana,servicio,tipo_opcion,plato
       FROM minutas
      WHERE activo=1
        AND COALESCE(estado,'PUBLICABLE')='PUBLICABLE'
        AND fecha BETWEEN $1 AND $2
      ORDER BY fecha,
        CASE servicio WHEN 'Desayuno' THEN 1 WHEN 'Almuerzo' THEN 2 WHEN 'Once' THEN 3 WHEN 'Cena' THEN 4 ELSE 5 END,
        CASE UPPER(REPLACE(tipo_opcion,'Ó','O')) WHEN 'OPCION 1' THEN 1 WHEN 'OPCION 2' THEN 2 WHEN 'OPCION 3' THEN 3 WHEN 'HIPOCALORICO' THEN 4 ELSE 5 END,
        id`,
    [inicio, fin],
  );
}

export async function validarPlatoPublicado(item: { fecha: string; servicio: string; plato: string }): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `SELECT id
       FROM minutas
      WHERE activo=1
        AND COALESCE(estado,'PUBLICABLE')='PUBLICABLE'
        AND fecha=$1 AND servicio=$2 AND plato=$3
      LIMIT 1`,
    [item.fecha, item.servicio, item.plato],
  );
  return Boolean(rows[0]);
}
