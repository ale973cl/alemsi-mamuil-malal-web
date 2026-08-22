import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';
export { resumenFinanzas } from '@/lib/reglas/finanzas';

export async function listarFinanzas(){
  return query<any>(
    `SELECT s.referencia_reserva,
            MAX(s.codigo_reserva) codigo_reserva,
            MIN(s.fecha) primera_fecha,
            MAX(s.fecha) ultima_fecha,
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
            MAX(cp.observacion_validacion) comprobante_motivo
       FROM solicitudes s
       LEFT JOIN comensales c ON c.rut=s.rut
       LEFT JOIN LATERAL (
         SELECT id,nombre_archivo,estado,observacion_validacion
           FROM comprobantes_pago
          WHERE referencia_reserva=s.referencia_reserva
          ORDER BY id DESC
          LIMIT 1
       ) cp ON TRUE
      WHERE COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA'
      GROUP BY s.referencia_reserva
      ORDER BY MAX(s.fecha) DESC
      LIMIT 250`,
  );
}

export async function validarPago(ref:string,estado:'Pagado'|'Rechazado',usuario:string,motivo:string){
  const motivoLimpio=motivo.trim();
  if(estado==='Rechazado'&&!motivoLimpio) throw new Error('Debes indicar el motivo del rechazo.');
  await inTransaction(async c=>{
    const ahora=new Date().toISOString();
    const comprobante=await c.query<{id:number;estado:string}>(
      `SELECT id,estado FROM comprobantes_pago WHERE referencia_reserva=$1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [ref],
    );
    if(!comprobante.rows[0]) throw new Error('La reserva no tiene un comprobante para validar.');
    if(String(comprobante.rows[0].estado).toUpperCase()!=='RECIBIDO') throw new Error('El comprobante ya fue procesado o no está pendiente de validación.');
    await c.query(
      `UPDATE solicitudes SET estado_pago=$1,motivo_estado_pago=$2,fecha_modificacion=$3,modificado_por=$4 WHERE referencia_reserva=$5`,
      [estado,motivoLimpio,ahora,usuario,ref],
    );
    await c.query(
      `UPDATE comprobantes_pago
          SET estado=$1,validado_por=$2,fecha_validacion=$3,observacion_validacion=$4
        WHERE id=$5`,
      [estado==='Pagado'?'VALIDADO':'RECHAZADO',usuario,ahora,motivoLimpio,comprobante.rows[0].id],
    );
    await registrarAuditoriaTx(c,{fecha:ahora,usuario,accion:estado==='Pagado'?'PAGO_VALIDADO':'PAGO_RECHAZADO'});
  });
}
