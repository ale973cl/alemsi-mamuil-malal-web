import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';
export { resumenFinanzas } from '@/lib/reglas/finanzas';

export async function listarFinanzas(){
  return query<any>(
    `SELECT s.codigo_reserva,
            MAX(s.rut) rut,
            MIN(s.fecha) primera_fecha,
            MAX(s.fecha) ultima_fecha,
            MIN(s.fecha_creacion) fecha_reserva,
            MAX(c.nombre) nombre,
            MAX(s.institucion) institucion,
            MAX(s.metodo_pago) metodo_pago,
            MAX(s.estado_pago) estado_pago,
            MAX(s.motivo_estado_pago) motivo_estado_pago,
            SUM(COALESCE(s.precio_aplicado,s.precio,0)) total,
            JSON_AGG(JSON_BUILD_OBJECT('id',s.id,'fecha',s.fecha,'servicio',s.servicio,'plato',COALESCE(s.plato_reservado,s.plato),'opcion',s.tipo_opcion,'monto',COALESCE(s.precio_aplicado,s.precio,0)) ORDER BY s.fecha,s.servicio,s.id) servicios,
            MAX(cp.id) comprobante_id,
            MAX(cp.nombre_archivo) comprobante_archivo,
            MAX(cp.estado) comprobante_estado,
            MAX(cp.observacion_validacion) comprobante_motivo,
            (SELECT JSON_AGG(JSON_BUILD_OBJECT('id',h.id,'archivo',h.nombre_archivo,'estado',h.estado,'motivo',h.observacion_validacion,'fecha',h.fecha_carga) ORDER BY h.id DESC)
               FROM comprobantes_pago h
              WHERE h.referencia_reserva=s.codigo_reserva) comprobantes_historial
       FROM solicitudes s
       LEFT JOIN comensales c ON c.rut=s.rut
       LEFT JOIN LATERAL (
         SELECT id,nombre_archivo,estado,observacion_validacion
           FROM comprobantes_pago
          WHERE referencia_reserva=s.codigo_reserva
          ORDER BY id DESC
          LIMIT 1
       ) cp ON TRUE
      WHERE COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA'
        AND COALESCE(NULLIF(s.codigo_reserva,''), '')<>''
      GROUP BY s.codigo_reserva
      ORDER BY MAX(s.fecha) DESC
      LIMIT 250`,
  );
}

export async function obtenerDatosNotificacionFinanzas(codigo:string){
  const rows=await query<{
    codigo_reserva:string;
    rut:string;
    nombre:string;
    institucion:string;
    correo:string;
    pago_token:string;
    metodo_pago:string;
    total:number;
  }>(
    `SELECT s.codigo_reserva,
            MAX(s.rut) rut,
            COALESCE(MAX(c.nombre),'') nombre,
            COALESCE(MAX(s.institucion),'') institucion,
            COALESCE(NULLIF(MAX(s.correo),''),MAX(c.correo),'') correo,
            COALESCE(MAX(s.pago_token),'') pago_token,
            COALESCE(MAX(s.metodo_pago),'') metodo_pago,
            SUM(COALESCE(s.precio_aplicado,s.precio,0))::numeric total
       FROM solicitudes s
       LEFT JOIN comensales c ON c.rut=s.rut
      WHERE s.codigo_reserva=$1
        AND COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA'
      GROUP BY s.codigo_reserva
      LIMIT 1`,
    [codigo],
  );
  return rows[0]??null;
}

export async function validarPago(codigo:string,estado:'Pagado'|'Rechazado',usuario:string,motivo:string){
  const motivoLimpio=motivo.trim();
  if(estado==='Rechazado'&&!motivoLimpio) throw new Error('Debes indicar el motivo del rechazo.');
  await inTransaction(async c=>{
    const ahora=new Date().toISOString();
    const comprobante=await c.query<{id:number;estado:string}>(
      `SELECT id,estado FROM comprobantes_pago WHERE referencia_reserva=$1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [codigo],
    );
    if(!comprobante.rows[0]) throw new Error('La reserva no tiene un comprobante para validar.');
    if(String(comprobante.rows[0].estado).toUpperCase()!=='RECIBIDO') throw new Error('El comprobante ya fue procesado o no está pendiente de validación.');
    await c.query(
      `UPDATE solicitudes SET estado_pago=$1,motivo_estado_pago=$2,fecha_modificacion=$3,modificado_por=$4 WHERE codigo_reserva=$5`,
      [estado,motivoLimpio,ahora,usuario,codigo],
    );
    await c.query(
      `UPDATE comprobantes_pago SET estado=$1,validado_por=$2,fecha_validacion=$3,observacion_validacion=$4 WHERE id=$5`,
      [estado==='Pagado'?'VALIDADO':'RECHAZADO',usuario,ahora,motivoLimpio,comprobante.rows[0].id],
    );
    await registrarAuditoriaTx(c,{fecha:ahora,usuario,accion:estado==='Pagado'?'PAGO_VALIDADO':'PAGO_RECHAZADO'});
  });
}

export async function validarPagoSinComprobante(codigo:string,usuario:string,medio:string,motivo:string){
  const medioLimpio=medio.trim();
  const motivoLimpio=motivo.trim();
  if(!codigo.trim()) throw new Error('Reserva inválida.');
  if(!medioLimpio) throw new Error('Debes indicar el medio utilizado para verificar el pago.');
  if(!motivoLimpio) throw new Error('Debes dejar una observación que respalde la validación manual.');
  await inTransaction(async c=>{
    const ahora=new Date().toISOString();
    const reserva=await c.query<{estado_pago:string|null}>(
      `SELECT estado_pago FROM solicitudes WHERE codigo_reserva=$1 LIMIT 1 FOR UPDATE`,
      [codigo],
    );
    if(!reserva.rows[0]) throw new Error('Reserva no encontrada.');
    const detalle=`Validación manual (${medioLimpio}): ${motivoLimpio}`;
    await c.query(
      `UPDATE solicitudes SET estado_pago='Pagado',motivo_estado_pago=$1,fecha_modificacion=$2,modificado_por=$3 WHERE codigo_reserva=$4`,
      [detalle,ahora,usuario,codigo],
    );
    await registrarAuditoriaTx(c,{fecha:ahora,usuario,accion:'PAGO_VALIDADO_SIN_COMPROBANTE'});
  });
}
