import 'server-only';
import { inTransaction } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';

export async function publicarMinutaDirecta(inicio:string,fin:string,usuario:string,rol:string){
  if(!['AdminCasino','AdminTotal'].includes(rol)) throw new Error('No tienes autorización para publicar minutas.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(inicio)||!/^\d{4}-\d{2}-\d{2}$/.test(fin)||fin<inicio) throw new Error('Período inválido.');

  return inTransaction(async c=>{
    const conflicto=await c.query(`SELECT fecha,servicio,UPPER(TRIM(tipo_opcion)) opcion,COUNT(*) cantidad FROM minutas WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 GROUP BY fecha,servicio,UPPER(TRIM(tipo_opcion)) HAVING COUNT(*)>1 LIMIT 1`,[inicio,fin]);
    if(conflicto.rows[0]) throw new Error(`Existen registros duplicados reales en ${conflicto.rows[0].fecha} · ${conflicto.rows[0].servicio} · ${conflicto.rows[0].opcion}. Corrige ese duplicado antes de publicar.`);

    // Repetir el mismo plato en OPCION 1 y OPCION 2 es una advertencia operativa,
    // no un bloqueo de publicación. Admin Casino conserva la decisión final.
    const actualizadas=await c.query(`UPDATE minutas SET estado='PUBLICADA' WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 RETURNING id`,[inicio,fin]);
    if(!actualizadas.rowCount) throw new Error('No existen filas de minuta activas para publicar en el período.');

    const previa=await c.query<{version:number}>(`SELECT version FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1 FOR UPDATE`,[inicio,fin]);
    const version=Number(previa.rows[0]?.version||0)+1;
    const ahora=new Date().toISOString();
    await c.query(`INSERT INTO minuta_flujo_coordinacion (fecha_desde,fecha_hasta,version,estado,observacion,enviado_por,enviado_at,coordinador,coordinacion_at,activo) VALUES ($1,$2,$3,'PUBLICADA',$4,$5,$6,$5,$6,1)`,[inicio,fin,version,'Publicación directa por Admin Casino. Coordinación no requerida.',usuario,ahora]);
    await registrarAuditoriaTx(c,{fecha:ahora,usuario,accion:'PUBLICAR_MINUTA_DIRECTA'});
    return Number(actualizadas.rowCount||0);
  });
}
