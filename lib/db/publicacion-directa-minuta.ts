import 'server-only';
import { inTransaction } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';

export async function publicarMinutaDirecta(inicio:string,fin:string,usuario:string,rol:string){
  if(!['AdminCasino','AdminTotal'].includes(rol)) throw new Error('No tienes autorización para publicar minutas.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(inicio)||!/^\d{4}-\d{2}-\d{2}$/.test(fin)||fin<inicio) throw new Error('Período inválido.');

  return inTransaction(async c=>{
    await c.query(`CREATE TABLE IF NOT EXISTS minuta_flujo_coordinacion (id SERIAL PRIMARY KEY,fecha_desde TEXT NOT NULL,fecha_hasta TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,estado TEXT NOT NULL DEFAULT 'EN_REVISION',observacion TEXT,enviado_por TEXT,enviado_at TEXT,coordinador TEXT,coordinacion_at TEXT,activo INTEGER DEFAULT 1)`);

    const conflicto=await c.query(`SELECT fecha,servicio,UPPER(TRIM(tipo_opcion)) opcion,COUNT(*) cantidad FROM minutas WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 GROUP BY fecha,servicio,UPPER(TRIM(tipo_opcion)) HAVING COUNT(*)>1 LIMIT 1`,[inicio,fin]);
    if(conflicto.rows[0]) throw new Error('La minuta contiene combinaciones duplicadas. Corrígelas antes de publicar.');

    const repetido=await c.query(`SELECT a.fecha,a.servicio FROM minutas a JOIN minutas b ON b.fecha=a.fecha AND b.servicio=a.servicio AND UPPER(TRIM(b.tipo_opcion))='OPCION 2' AND LOWER(TRIM(b.plato))=LOWER(TRIM(a.plato)) AND b.id<>a.id WHERE COALESCE(a.activo,1)=1 AND COALESCE(b.activo,1)=1 AND UPPER(TRIM(a.tipo_opcion))='OPCION 1' AND a.fecha BETWEEN $1 AND $2 LIMIT 1`,[inicio,fin]);
    if(repetido.rows[0]) throw new Error('Opción 1 y Opción 2 repiten un plato. Corrige la minuta antes de publicar.');

    const actualizadas=await c.query(`UPDATE minutas SET estado='PUBLICADA' WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 RETURNING id`,[inicio,fin]);
    if(!actualizadas.rowCount) throw new Error('No existen filas de minuta activas para publicar en el período.');

    const previa=await c.query<{version:number}>(`SELECT version FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1 FOR UPDATE`,[inicio,fin]);
    const version=Number(previa.rows[0]?.version||0)+1;
    const ahora=new Date().toISOString();
    await c.query(`INSERT INTO minuta_flujo_coordinacion (fecha_desde,fecha_hasta,version,estado,observacion,enviado_por,enviado_at,coordinador,coordinacion_at,activo) VALUES ($1,$2,$3,'PUBLICADA',$4,$5,$6,$5,$6,1)`,[inicio,fin,version,'Publicación directa posterior a previsualización y confirmación.',usuario,ahora]);
    await registrarAuditoriaTx(c,{fecha:ahora,usuario,accion:'PUBLICAR_MINUTA_DIRECTA'});
    return actualizadas.rowCount;
  });
}
