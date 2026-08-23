import 'server-only';
import { query } from '@/lib/db/pool';

export type DemandaRangoRow={
  fecha:string;
  servicio:string;
  tipo_opcion:string;
  plato:string;
  institucion:string;
  cantidad:number;
  comensales:string[];
};

export async function demandaRango(inicio:string,fin:string):Promise<DemandaRangoRow[]>{
  return query<DemandaRangoRow>(
    `WITH base AS (
       SELECT DISTINCT ON (s.rut,s.fecha,s.servicio)
              s.id,s.rut,s.fecha,s.servicio,
              COALESCE(NULLIF(TRIM(s.institucion),''),'Sin institución') institucion,
              COALESCE(NULLIF(TRIM(c.nombre),''),s.rut) nombre,
              COALESCE(s.plato_reservado,s.plato) AS plato,
              COALESCE(NULLIF(TRIM(s.tipo_opcion),''),
                (SELECT m.tipo_opcion FROM minutas m
                  WHERE m.fecha=s.fecha AND m.servicio=s.servicio
                    AND COALESCE(m.activo,1)=1
                    AND UPPER(TRIM(m.plato))=UPPER(TRIM(COALESCE(s.plato_reservado,s.plato)))
                  ORDER BY m.id DESC LIMIT 1),'') AS tipo_opcion
         FROM solicitudes s
         LEFT JOIN comensales c ON c.rut=s.rut
        WHERE s.fecha BETWEEN $1 AND $2
          AND COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA'
          AND (COALESCE(s.tipo_registro,'RESERVA_COMERCIAL') <> 'CONSUMO_INTERNO' OR s.estado_consumo='Consumirá')
        ORDER BY s.rut,s.fecha,s.servicio,s.id DESC
     )
     SELECT fecha,servicio,tipo_opcion,COALESCE(plato,'') plato,institucion,
            COUNT(*)::int cantidad,
            ARRAY_AGG(nombre ORDER BY nombre) comensales
       FROM base
      WHERE COALESCE(TRIM(plato),'')<>''
      GROUP BY fecha,servicio,tipo_opcion,plato,institucion
      ORDER BY fecha,CASE servicio WHEN 'Desayuno' THEN 1 WHEN 'Almuerzo' THEN 2 WHEN 'Once' THEN 3 WHEN 'Cena' THEN 4 ELSE 5 END,tipo_opcion,plato,institucion`,
    [inicio,fin],
  );
}
