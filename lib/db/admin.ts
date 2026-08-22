import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';

export async function getReglas(){
  const r=await query<any>(`SELECT * FROM configuracion_reservas WHERE id=1`);
  return r[0]||{anticipacion_reserva_horas:48,cancelacion_directa_horas:24,max_dias_consecutivos:7,excepciones_habilitadas:1};
}
export async function setReglas(v:any,u:string){
  await inTransaction(async c=>{
    await c.query(`CREATE TABLE IF NOT EXISTS configuracion_reservas (id INTEGER PRIMARY KEY DEFAULT 1,anticipacion_reserva_horas INTEGER DEFAULT 48,cancelacion_directa_horas INTEGER DEFAULT 24,max_dias_consecutivos INTEGER DEFAULT 7,excepciones_habilitadas INTEGER DEFAULT 1)`);
    await c.query(`INSERT INTO configuracion_reservas (id,anticipacion_reserva_horas,cancelacion_directa_horas,max_dias_consecutivos,excepciones_habilitadas) VALUES (1,$1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET anticipacion_reserva_horas=EXCLUDED.anticipacion_reserva_horas,cancelacion_directa_horas=EXCLUDED.cancelacion_directa_horas,max_dias_consecutivos=EXCLUDED.max_dias_consecutivos,excepciones_habilitadas=EXCLUDED.excepciones_habilitadas`,[v.a,v.c,v.m,v.e]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'ACTUALIZAR_REGLAS_RESERVA'});
  });
}
export async function resumenAdmin(){
  const [r,p,m]=await Promise.all([
    query<any>(`SELECT COUNT(DISTINCT referencia_reserva) reservas,COUNT(*) raciones FROM solicitudes WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND fecha>=CURRENT_DATE::text`),
    query<any>(`SELECT COUNT(*) pendientes FROM solicitudes WHERE LOWER(COALESCE(estado_pago,'pendiente')) NOT IN ('pagado','no aplica','costo asumido','costo asumido / no cobrable') AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'`),
    query<any>(`SELECT COUNT(*) minutas FROM minutas WHERE activo=1 AND COALESCE(estado,'PUBLICABLE')='PUBLICABLE' AND fecha>=CURRENT_DATE::text`)
  ]);
  return {...r[0],...p[0],...m[0]};
}
export async function minutasProximas(){
  return query<any>(`SELECT id,fecha,servicio,tipo_opcion,plato,COALESCE(estado,'PUBLICABLE') estado FROM minutas WHERE activo=1 AND fecha>=CURRENT_DATE::text ORDER BY fecha,CASE servicio WHEN 'Desayuno' THEN 1 WHEN 'Almuerzo' THEN 2 WHEN 'Once' THEN 3 WHEN 'Cena' THEN 4 ELSE 5 END,tipo_opcion LIMIT 300`);
}
export async function guardarMinuta(v:{id?:number;fecha:string;servicio:string;tipo_opcion:string;plato:string},u:string){
  await inTransaction(async c=>{
    if(v.id){
      await c.query(`UPDATE minutas SET fecha=$1,servicio=$2,tipo_opcion=$3,plato=$4,activo=1,estado='PUBLICABLE' WHERE id=$5`,[v.fecha,v.servicio,v.tipo_opcion,v.plato,v.id]);
    }else{
      await c.query(`INSERT INTO minutas (fecha,dia_semana,servicio,tipo_opcion,plato,activo,estado) VALUES ($1,'',$2,$3,$4,1,'PUBLICABLE')`,[v.fecha,v.servicio,v.tipo_opcion,v.plato]);
    }
    await c.query(`UPDATE minuta_flujo_coordinacion SET estado='REQUIERE_REVALIDACION',observacion=CASE WHEN COALESCE(observacion,'')='' THEN $1 ELSE observacion||' | '||$1 END WHERE COALESCE(activo,1)=1 AND fecha_desde<=$2 AND fecha_hasta>=$2 AND estado IN ('EN_REVISION','AUTORIZADA','PUBLICADA')`,['Minuta editada después de revisión',v.fecha]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'EDITAR_MINUTA'});
  });
}
export async function enviarCoordinacion(inicio:string,fin:string,u:string){
  return inTransaction(async c=>{
    await c.query(`CREATE TABLE IF NOT EXISTS minuta_flujo_coordinacion (id SERIAL PRIMARY KEY,fecha_desde TEXT NOT NULL,fecha_hasta TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,estado TEXT NOT NULL DEFAULT 'EN_REVISION',observacion TEXT,enviado_por TEXT,enviado_at TEXT,coordinador TEXT,coordinacion_at TEXT,activo INTEGER DEFAULT 1)`);
    const prev=await c.query<{version:number}>(`SELECT version FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1`,[inicio,fin]);
    const version=Number(prev.rows[0]?.version||0)+1;
    await c.query(`INSERT INTO minuta_flujo_coordinacion (fecha_desde,fecha_hasta,version,estado,observacion,enviado_por,enviado_at,activo) VALUES ($1,$2,$3,'EN_REVISION','',$4,$5,1)`,[inicio,fin,version,u,new Date().toISOString()]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'ENVIAR_MINUTA_COORDINACION'});
    return version;
  });
}
export async function flujoActual(inicio:string,fin:string){
  const r=await query<any>(`SELECT * FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1`,[inicio,fin]);
  return r[0]||null;
}
export async function publicarMinuta(inicio:string,fin:string,u:string,rol:string){
  if(!['AdminCasino','AdminTotal'].includes(rol)) throw new Error('No tienes autorización para publicar minutas.');
  return inTransaction(async c=>{
    const flujo=await c.query<{id:number;estado:string}>(`SELECT id,estado FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1 FOR UPDATE`,[inicio,fin]);
    const actual=flujo.rows[0];
    if(!actual||actual.estado!=='AUTORIZADA') throw new Error('La última revisión de Coordinación no está autorizada.');
    const minuta=await c.query(`UPDATE minutas SET estado='PUBLICADA' WHERE COALESCE(activo,1)=1 AND fecha BETWEEN $1 AND $2 RETURNING id`,[inicio,fin]);
    if(!minuta.rowCount) throw new Error('No existen filas de minuta activas para el período autorizado.');
    await c.query(`UPDATE minuta_flujo_coordinacion SET estado='PUBLICADA' WHERE id=$1 AND estado='AUTORIZADA'`,[actual.id]);
    await registrarAuditoriaTx(c,{usuario:u,accion:'PUBLICAR_MINUTA'});
    return minuta.rowCount;
  });
}
