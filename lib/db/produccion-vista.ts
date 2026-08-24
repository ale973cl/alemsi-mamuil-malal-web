import 'server-only';
import { query } from '@/lib/db/pool';

export type ProduccionComensalRow={
  rut:string;
  nombre:string;
  institucion:string;
  fecha:string;
  servicio:string;
  tipo_opcion:string;
  plato:string;
};

export async function detalleProduccionFecha(fecha:string):Promise<ProduccionComensalRow[]>{
  return query<ProduccionComensalRow>(`
    WITH base AS (
      SELECT DISTINCT ON (s.rut,s.fecha,s.servicio)
             s.id,s.rut,s.fecha,s.servicio,
             COALESCE(NULLIF(TRIM(s.institucion),''),'SIN INSTITUCIÓN') AS institucion,
             COALESCE(NULLIF(TRIM(c.nombre),''),s.rut) AS nombre,
             TRIM(COALESCE(s.plato_reservado,s.plato)) AS plato,
             COALESCE(
               NULLIF(UPPER(TRIM(s.tipo_opcion)),''),
               (SELECT UPPER(TRIM(m.tipo_opcion))
                  FROM minutas m
                 WHERE m.fecha::text=s.fecha::text
                   AND m.servicio=s.servicio
                   AND COALESCE(m.activo,1)=1
                   AND m.estado='PUBLICADA'
                   AND UPPER(TRIM(m.plato))=UPPER(TRIM(COALESCE(s.plato_reservado,s.plato)))
                 ORDER BY m.id DESC LIMIT 1),
               'SIN OPCION'
             ) AS tipo_opcion
        FROM solicitudes s
        LEFT JOIN comensales c ON c.rut=s.rut
       WHERE s.fecha::text=$1
         AND COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA'
         AND (COALESCE(s.tipo_registro,'RESERVA_COMERCIAL')<>'CONSUMO_INTERNO' OR s.estado_consumo='Consumirá')
       ORDER BY s.rut,s.fecha,s.servicio,s.id DESC
    )
    SELECT rut,nombre,institucion,fecha::text AS fecha,servicio,tipo_opcion,plato
      FROM base
     WHERE COALESCE(TRIM(plato),'')<>''
     ORDER BY CASE servicio WHEN 'Desayuno' THEN 1 WHEN 'Almuerzo' THEN 2 WHEN 'Once' THEN 3 WHEN 'Cena' THEN 4 ELSE 5 END,
              tipo_opcion,plato,institucion,nombre
  `,[fecha]);
}
