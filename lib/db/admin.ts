import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';

export async function getReglas(){
  const r=await query<any>(`SELECT * FROM configuracion_reservas WHERE id=1`);
  return r[0]||{anticipacion_reserva_horas:48,cancelacion_directa_horas:24,max_dias_consecutivos:7,excepciones_habilitadas:1};
}
export async function setReglas(v:any,u:string){
  await inTransaction(async c=>{
    await c.query(`INSERT INTO configuracion_reservas (id,anticipacion_reserva_horas,cancelacion_directa_horas,max_dias_consecutivos,excepciones_habilitadas) VALUES (1,$1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET anticipacion_reserva_horas=EXCLUDED.anticipacion_reserva_horas,cancelacion_directa_horas=EXCLUDED.cancelacion_directa_horas,max_dias_consecutivos=EXCLUDED.max_dias_consecutivos,excepciones_habilitadas=EXCLUDED.excepciones_habilitadas`,[v.a,v.c,v.m,v.e]);
    await c.query(`INSERT INTO auditoria_acciones (fecha,usuario,accion,tabla,registro_id,valor_anterior,valor_nuevo,detalle) VALUES ($1,$2,'ACTUALIZAR_REGLAS_RESERVA','configuracion_reservas','1','',$3,'')`,[new Date().toISOString(),u,JSON.stringify(v)]);
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
      await c.query(`UPDATE minutas SET fecha=$1,servicio=$2,tipo_opcion=$3,plato=$4,activo=1 WHERE id=$5`,[v.fecha,v.servicio,v.tipo_opcion,v.plato,v.id]);
    }else{
      await c.query(`INSERT INTO minutas (fecha,dia_semana,servicio,tipo_opcion,plato,activo,estado) VALUES ($1,'',$2,$3,$4,1,'PUBLICABLE')`,[v.fecha,v.servicio,v.tipo_opcion,v.plato]);
    }
    await c.query(`UPDATE minuta_flujo_coordinacion SET estado='REQUIERE_REVALIDACION',observacion=CASE WHEN COALESCE(observacion,'')='' THEN $1 ELSE observacion||' | '||$1 END WHERE COALESCE(activo,1)=1 AND fecha_desde<=$2 AND fecha_hasta>=$2 AND estado IN ('EN_REVISION','AUTORIZADA','PUBLICADA')`,['Minuta editada después de revisión',v.fecha]);
    await c.query(`INSERT INTO auditoria_acciones (fecha,usuario,accion,tabla,registro_id,valor_anterior,valor_nuevo,detalle) VALUES ($1,$2,'EDITAR_MINUTA','minutas',$3,'',$4,$5)`,[new Date().toISOString(),u,String(v.id||'nuevo'),v.plato,`${v.fecha}|${v.servicio}|${v.tipo_opcion}`]);
  });
}
export async function enviarCoordinacion(inicio:string,fin:string,u:string){
  return inTransaction(async c=>{
    const prev=await c.query<{version:number}>(`SELECT version FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1`,[inicio,fin]);
    const version=Number(prev.rows[0]?.version||0)+1;
    await c.query(`INSERT INTO minuta_flujo_coordinacion (fecha_desde,fecha_hasta,version,estado,observacion,enviado_por,enviado_at,activo) VALUES ($1,$2,$3,'EN_REVISION','',$4,$5,1)`,[inicio,fin,version,u,new Date().toISOString()]);
    await c.query(`INSERT INTO auditoria_acciones (fecha,usuario,accion,tabla,registro_id,valor_anterior,valor_nuevo,detalle) VALUES ($1,$2,'ENVIAR_MINUTA_COORDINACION','minuta_flujo_coordinacion',$3,'',$4,'Envío formal a Coordinación')`,[new Date().toISOString(),u,`${inicio}..${fin}`,`EN_REVISION v${version}`]);
    return version;
  });
}
export async function flujoActual(inicio:string,fin:string){
  const r=await query<any>(`SELECT * FROM minuta_flujo_coordinacion WHERE fecha_desde=$1 AND fecha_hasta=$2 AND COALESCE(activo,1)=1 ORDER BY version DESC,id DESC LIMIT 1`,[inicio,fin]);
  return r[0]||null;
}
