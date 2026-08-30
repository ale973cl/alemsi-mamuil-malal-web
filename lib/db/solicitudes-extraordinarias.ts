import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';
import { normalizarRutDb, validarRutM11 } from '@/lib/reglas/reserva';

export type TipoSolicitudExtraordinaria = 'ANULACION_SERVICIO' | 'NO_CONSUMIRA_DIA';
export type EstadoSolicitudExtraordinaria = 'PENDIENTE' | 'AUTORIZADA' | 'RECHAZADA';

export async function crearSolicitudExtraordinaria(input:{
  rut:string;
  tipo:TipoSolicitudExtraordinaria;
  motivo:string;
  solicitudId?:number;
  fecha?:string;
}) {
  if (!validarRutM11(input.rut)) throw new Error('RUT inválido.');
  const rut=normalizarRutDb(input.rut);
  const motivo=String(input.motivo||'').trim();
  if (motivo.length < 5) throw new Error('Indica el motivo de la solicitud extraordinaria.');
  if (input.tipo==='ANULACION_SERVICIO') {
    const rows=await query<any>(`SELECT id,rut,referencia_reserva,fecha,servicio,COALESCE(plato_reservado,plato) plato,COALESCE(estado_reserva,'ACTIVA') estado_reserva FROM solicitudes WHERE id=$1 AND rut=$2 LIMIT 1`,[Number(input.solicitudId||0),rut]);
    const row=rows[0];
    if(!row||row.estado_reserva!=='ACTIVA') throw new Error('Ese servicio ya no está activo.');
    const dup=await query<any>(`SELECT id FROM solicitudes_extraordinarias WHERE rut=$1 AND solicitud_id=$2 AND tipo='ANULACION_SERVICIO' AND estado='PENDIENTE' LIMIT 1`,[rut,row.id]);
    if(dup[0]) throw new Error('Ya existe una solicitud extraordinaria pendiente para ese servicio.');
    await query(`INSERT INTO solicitudes_extraordinarias (rut,referencia_reserva,solicitud_id,fecha,servicio,plato,tipo,motivo) VALUES ($1,$2,$3,$4,$5,$6,'ANULACION_SERVICIO',$7)`,[rut,row.referencia_reserva,row.id,row.fecha,row.servicio,row.plato,motivo]);
    return;
  }

  const fecha=String(input.fecha||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Fecha inválida.');
  const lineas=await query<any>(`SELECT id,referencia_reserva,fecha,servicio,COALESCE(plato_reservado,plato) plato FROM solicitudes WHERE rut=$1 AND fecha=$2 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA' ORDER BY servicio,id`,[rut,fecha]);
  if(!lineas.length) throw new Error('No hay servicios activos para esa fecha.');
  const dup=await query<any>(`SELECT id FROM solicitudes_extraordinarias WHERE rut=$1 AND fecha=$2 AND tipo='NO_CONSUMIRA_DIA' AND estado='PENDIENTE' LIMIT 1`,[rut,fecha]);
  if(dup[0]) throw new Error('Ya existe una solicitud pendiente para no consumir ese día.');
  const refs=[...new Set(lineas.map((x:any)=>String(x.referencia_reserva||'')))].filter(Boolean).join(', ');
  await query(`INSERT INTO solicitudes_extraordinarias (rut,referencia_reserva,fecha,tipo,motivo) VALUES ($1,$2,$3,'NO_CONSUMIRA_DIA',$4)`,[rut,refs,fecha,motivo]);
}

export async function listarSolicitudesExtraordinarias(estado:EstadoSolicitudExtraordinaria|'TODAS'='PENDIENTE') {
  const where=estado==='TODAS'?'':'WHERE se.estado=$1';
  const params=estado==='TODAS'?[]:[estado];
  return query<any>(`
    SELECT se.*,c.nombre,
           CASE WHEN EXISTS(SELECT 1 FROM jornadas_produccion jp WHERE jp.fecha=se.fecha::text AND jp.estado='En producción') THEN 'EN_PRODUCCION'
                WHEN EXISTS(SELECT 1 FROM jornadas_produccion jp WHERE jp.fecha=se.fecha::text AND jp.estado='Finalizado') THEN 'FINALIZADA'
                ELSE 'PENDIENTE' END AS estado_jornada
      FROM solicitudes_extraordinarias se
      LEFT JOIN comensales c ON c.rut=se.rut
      ${where}
      ORDER BY CASE se.estado WHEN 'PENDIENTE' THEN 1 ELSE 2 END,se.fecha,se.creada_at
      LIMIT 100
  `,params);
}

async function descontarProduccion(client:any,row:any,solicitudExtraId:number,usuario:string){
  const jornada=await client.query(`SELECT estado FROM jornadas_produccion WHERE fecha=$1 LIMIT 1`,[row.fecha]);
  const estado=String(jornada.rows[0]?.estado||'');
  if(estado==='Finalizado') throw new Error(`La jornada ${row.fecha} ya está finalizada y no puede modificarse.`);
  if(estado!=='En producción') {
    await registrarAuditoriaTx(client,{usuario,accion:`ANULACION_EXTRA|${solicitudExtraId}|${row.referencia_reserva}|${row.fecha}|${row.servicio}|${row.plato}|conteo_dinamico`});
    return;
  }

  const detalle=await client.query(`
    SELECT id,reservadas
      FROM jornada_detalle
     WHERE fecha=$1 AND servicio=$2 AND LOWER(TRIM(plato))=LOWER(TRIM($3))
     ORDER BY CASE WHEN NULLIF(TRIM(tipo_opcion),'')=NULLIF(TRIM($4),'') THEN 0 ELSE 1 END,id
     LIMIT 1
     FOR UPDATE
  `,[row.fecha,row.servicio,row.plato||'',row.tipo_opcion||'']);
  if(!detalle.rows[0]) {
    await registrarAuditoriaTx(client,{usuario,accion:`ANULACION_EXTRA|${solicitudExtraId}|${row.referencia_reserva}|${row.fecha}|${row.servicio}|${row.plato}|sin_detalle`});
    return;
  }
  const antes=Number(detalle.rows[0].reservadas||0);
  const despues=Math.max(antes-1,0);
  await client.query(`UPDATE jornada_detalle SET reservadas=$1 WHERE id=$2`,[despues,detalle.rows[0].id]);
  await registrarAuditoriaTx(client,{usuario,accion:`ANULACION_EXTRA|${solicitudExtraId}|${row.referencia_reserva}|${row.fecha}|${row.servicio}|${row.plato}|${antes}->${despues}`});
}

export async function resolverSolicitudExtraordinaria(input:{id:number;decision:'AUTORIZAR'|'RECHAZAR';usuario:string;observacion?:string}){
  return inTransaction(async client=>{
    const sr=await client.query(`SELECT * FROM solicitudes_extraordinarias WHERE id=$1 FOR UPDATE`,[input.id]);
    const sol=sr.rows[0];
    if(!sol||sol.estado!=='PENDIENTE') throw new Error('La solicitud ya fue resuelta o no existe.');
    const ahora=new Date().toISOString();
    if(input.decision==='RECHAZAR'){
      await client.query(`UPDATE solicitudes_extraordinarias SET estado='RECHAZADA',resuelta_at=$1,resuelta_por=$2,observacion_resolucion=$3 WHERE id=$4`,[ahora,input.usuario,String(input.observacion||'').trim(),input.id]);
      await registrarAuditoriaTx(client,{usuario:input.usuario,accion:`RECHAZAR_ANULACION_EXTRA|${input.id}|${sol.rut}|${sol.fecha}`});
      return {cantidad:0};
    }

    let lineas:any[]=[];
    if(sol.tipo==='ANULACION_SERVICIO'){
      const r=await client.query(`SELECT id,rut,referencia_reserva,fecha,servicio,COALESCE(plato_reservado,plato) plato,COALESCE(tipo_opcion,'') tipo_opcion,COALESCE(estado_reserva,'ACTIVA') estado_reserva FROM solicitudes WHERE id=$1 AND rut=$2 FOR UPDATE`,[sol.solicitud_id,sol.rut]);
      if(r.rows[0]&&r.rows[0].estado_reserva==='ACTIVA') lineas=r.rows;
    }else{
      const r=await client.query(`SELECT id,rut,referencia_reserva,fecha,servicio,COALESCE(plato_reservado,plato) plato,COALESCE(tipo_opcion,'') tipo_opcion,COALESCE(estado_reserva,'ACTIVA') estado_reserva FROM solicitudes WHERE rut=$1 AND fecha=$2 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA' FOR UPDATE`,[sol.rut,sol.fecha]);
      lineas=r.rows;
    }
    if(!lineas.length) throw new Error('No quedan servicios activos asociados a esta solicitud.');

    for(const row of lineas){
      await client.query(`UPDATE solicitudes SET estado_reserva='CANCELADA',fecha_modificacion=$1,modificado_por=$2 WHERE id=$3 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'`,[ahora,input.usuario,row.id]);
      await descontarProduccion(client,row,input.id,input.usuario);
    }

    const resumen=`Autorizada. ${lineas.length} servicio(s) anulados y descontados del motor de demanda${input.observacion?`. ${String(input.observacion).trim()}`:''}`;
    await client.query(`UPDATE solicitudes_extraordinarias SET estado='AUTORIZADA',resuelta_at=$1,resuelta_por=$2,observacion_resolucion=$3,cantidad_afectada=$4 WHERE id=$5`,[ahora,input.usuario,resumen,lineas.length,input.id]);
    await registrarAuditoriaTx(client,{usuario:input.usuario,accion:`AUTORIZAR_ANULACION_EXTRA|${input.id}|${sol.rut}|${sol.fecha}|-${lineas.length}`});
    return {cantidad:lineas.length};
  });
}
