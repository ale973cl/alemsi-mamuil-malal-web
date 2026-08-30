import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';

export type DemandaProduccion = {
  servicio: string;
  tipo_opcion: string;
  plato: string;
  reservadas: number;
};

const demandaSql = `WITH base AS (
  SELECT DISTINCT ON (s.rut,s.fecha,s.servicio)
         s.id,s.rut,s.fecha,s.servicio,s.institucion,s.tipo_registro,s.estado_consumo,
         TRIM(COALESCE(s.plato_reservado,s.plato)) AS plato,
         COALESCE(
           NULLIF(UPPER(TRIM(s.tipo_opcion)),''),
           (SELECT UPPER(TRIM(m.tipo_opcion))
              FROM minutas m
             WHERE m.fecha=s.fecha AND m.servicio=s.servicio
               AND m.activo=1 AND m.estado='PUBLICADA'
               AND UPPER(TRIM(m.plato))=UPPER(TRIM(COALESCE(s.plato_reservado,s.plato)))
             ORDER BY m.id DESC LIMIT 1),
           (SELECT CASE WHEN COUNT(DISTINCT UPPER(TRIM(m2.tipo_opcion)))=1
                        THEN MAX(UPPER(TRIM(m2.tipo_opcion))) END
              FROM minutas m2
             WHERE m2.fecha=s.fecha AND m2.servicio=s.servicio
               AND m2.activo=1 AND m2.estado='PUBLICADA'),
           'SIN OPCION'
         ) AS tipo_opcion
    FROM solicitudes s
   WHERE s.fecha=$1
     AND COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA'
     AND (COALESCE(s.tipo_registro,'RESERVA_COMERCIAL') <> 'CONSUMO_INTERNO'
          OR s.estado_consumo='Consumirá')
   ORDER BY s.rut,s.fecha,s.servicio,s.id DESC
)
SELECT servicio,tipo_opcion,MIN(plato) AS plato,COUNT(*)::int AS reservadas
  FROM base
 WHERE COALESCE(TRIM(plato),'')<>''
 GROUP BY servicio,tipo_opcion,UPPER(TRIM(plato))`;

export async function demandaFecha(fecha: string): Promise<DemandaProduccion[]> {
  return query<DemandaProduccion>(
    `${demandaSql}
     ORDER BY CASE servicio WHEN 'Desayuno' THEN 1 WHEN 'Almuerzo' THEN 2 WHEN 'Once' THEN 3 WHEN 'Cena' THEN 4 ELSE 5 END,
              tipo_opcion,plato`,
    [fecha],
  );
}

export async function jornada(fecha: string) {
  const rows = await query<any>(`SELECT * FROM jornadas_produccion WHERE fecha=$1 LIMIT 1`, [fecha]);
  return rows[0] ?? null;
}

export async function detalleJornada(fecha: string) {
  return query<any>(
    `SELECT id,servicio,tipo_opcion,plato,reservadas,producidas,entregadas,motivo_diferencia,observaciones
       FROM jornada_detalle
      WHERE fecha=$1
      ORDER BY CASE servicio WHEN 'Desayuno' THEN 1 WHEN 'Almuerzo' THEN 2 WHEN 'Once' THEN 3 WHEN 'Cena' THEN 4 ELSE 5 END,id`,
    [fecha],
  );
}

function requerimientoReceta(cantidadBase: number, porciones: number, mermaPct: number, margenPct: number) {
  const base = Math.max(Number(cantidadBase || 0), 0) * Math.max(Number(porciones || 0), 0);
  const merma = Math.min(Math.max(Number(mermaPct || 0), 0), 95) / 100;
  const margen = Math.max(Number(margenPct || 0), 0) / 100;
  const bruto = merma > 0 ? base / (1 - merma) : base;
  return bruto * (1 + margen);
}

export async function iniciarJornada(fecha: string, usuario: string) {
  return inTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`PRODUCCION|${fecha}`]);

    const actual = await client.query<{ estado: string }>(
      `SELECT estado FROM jornadas_produccion WHERE fecha=$1 FOR UPDATE`,
      [fecha],
    );
    if (actual.rows[0] && String(actual.rows[0].estado) !== 'Pendiente') {
      return { yaIniciada: true, sinMinuta: [], sinReceta: [], faltantesStock: [] };
    }

    const demanda = await client.query<DemandaProduccion>(demandaSql, [fecha]);

    await client.query(
      `INSERT INTO jornadas_produccion (fecha,estado,inicio_at,usuario_inicio)
       VALUES ($1,'En producción',$2,$3)
       ON CONFLICT (fecha) DO UPDATE
       SET estado='En producción',inicio_at=EXCLUDED.inicio_at,usuario_inicio=EXCLUDED.usuario_inicio`,
      [fecha, new Date().toISOString(), usuario],
    );

    const sinMinuta: string[] = [];
    const sinReceta: string[] = [];
    const faltantesStock: string[] = [];

    for (const row of demanda.rows) {
      const plato = String(row.plato || '').trim();
      const porciones = Number(row.reservadas || 0);
      await client.query(
        `INSERT INTO jornada_detalle (fecha,servicio,tipo_opcion,plato,reservadas,producidas,entregadas)
         VALUES ($1,$2,$3,$4,$5,NULL,NULL)
         ON CONFLICT (fecha,servicio,tipo_opcion,plato)
         DO UPDATE SET reservadas=EXCLUDED.reservadas,producidas=NULL,entregadas=NULL,motivo_diferencia=NULL`,
        [fecha, row.servicio, row.tipo_opcion || 'SIN OPCION', plato, porciones],
      );

      const minuta = await client.query(
        `SELECT id FROM minutas
          WHERE fecha=$1 AND servicio=$2 AND activo=1
            AND estado='PUBLICADA'
            AND LOWER(TRIM(plato))=LOWER(TRIM($3))
          LIMIT 1`,
        [fecha, row.servicio, plato],
      );
      if (!minuta.rows[0]) {
        sinMinuta.push(plato);
        continue;
      }

      const recetas = await client.query<{
        insumo: string;
        cantidad: number;
        merma_pct: number;
        margen_produccion_pct: number;
      }>(
        `SELECT insumo,cantidad,COALESCE(merma_pct,0) merma_pct,
                COALESCE(margen_produccion_pct,0) margen_produccion_pct
           FROM recetas
          WHERE LOWER(TRIM(plato))=LOWER(TRIM($1))
            AND UPPER(TRIM(COALESCE(estado,''))) IN ('ACTIVA','ACTIVO','APROBADA','APROBADO')
            AND COALESCE(version,1)=(
              SELECT MAX(COALESCE(version,1)) FROM recetas
               WHERE LOWER(TRIM(plato))=LOWER(TRIM($1))
                 AND UPPER(TRIM(COALESCE(estado,''))) IN ('ACTIVA','ACTIVO','APROBADA','APROBADO')
            )`,
        [plato],
      );
      if (!recetas.rows.length) {
        sinReceta.push(plato);
        continue;
      }

      for (const receta of recetas.rows) {
        let pendiente = requerimientoReceta(
          Number(receta.cantidad),
          porciones,
          Number(receta.merma_pct),
          Number(receta.margen_produccion_pct),
        );
        if (pendiente <= 0) continue;

        const lotes = await client.query<{ id: number; stock: number; nombre_articulo: string }>(
          `SELECT id,stock,nombre_articulo
             FROM bodega_inventario
            WHERE nombre_articulo ILIKE $1 AND COALESCE(stock,0)>0
            ORDER BY caduca ASC NULLS LAST,id ASC
            FOR UPDATE`,
          [`%${receta.insumo}%`],
        );
        for (const lote of lotes.rows) {
          if (pendiente <= 0) break;
          const disponible = Number(lote.stock || 0);
          const uso = Math.min(disponible, pendiente);
          await client.query(
            `UPDATE bodega_inventario SET stock=GREATEST(COALESCE(stock,0)-$1,0) WHERE id=$2`,
            [uso, lote.id],
          );
          pendiente -= uso;
        }
        if (pendiente > 0.0001) faltantesStock.push(`${receta.insumo} (${pendiente.toFixed(2)} pendiente)`);
      }
    }

    await registrarAuditoriaTx(client,{usuario,accion:'INICIAR_JORNADA'});
    return { yaIniciada: false, sinMinuta, sinReceta, faltantesStock };
  });
}

export type CierreItem = {
  id: number;
  reservadas: number;
  producidas: number;
  entregadas: number;
  motivo: string;
};

export async function cerrarJornada(fecha: string, usuario: string, novedades: string, items: CierreItem[]) {
  for (const item of items) {
    if (![item.reservadas,item.producidas,item.entregadas].every(Number.isFinite)) {
      throw new Error('Debes ingresar cantidades válidas antes de cerrar la jornada.');
    }
    if ((item.producidas !== item.reservadas || item.entregadas !== item.producidas) && !item.motivo.trim()) {
      throw new Error('Hay diferencias sin motivo. Debes justificarlas antes de cerrar la jornada.');
    }
  }
  await inTransaction(async (client) => {
    const instanteCierre = new Date().toISOString();
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`CIERRE|${fecha}`]);
    for (const item of items) {
      await client.query(
        `UPDATE jornada_detalle SET producidas=$1,entregadas=$2,motivo_diferencia=$3 WHERE id=$4 AND fecha=$5`,
        [item.producidas, item.entregadas, item.motivo, item.id, fecha],
      );
    }
    await client.query(
      `UPDATE jornadas_produccion
          SET estado='Finalizado',fin_at=$1,usuario_fin=$2,novedades=$3,reporte_enviado_at=$1
        WHERE fecha=$4`,
      [instanteCierre, usuario, novedades, fecha],
    );
    await registrarAuditoriaTx(client,{usuario,accion:'FINALIZAR_JORNADA'});
  });
}
