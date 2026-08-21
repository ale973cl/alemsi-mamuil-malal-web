import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
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
            SUM(COALESCE(s.precio_aplicado,s.precio,0)) total,
            MAX(cp.id) comprobante_id,
            MAX(cp.nombre_archivo) comprobante_archivo,
            MAX(cp.estado) comprobante_estado
       FROM solicitudes s
       LEFT JOIN comensales c ON c.rut=s.rut
       LEFT JOIN LATERAL (
         SELECT id,nombre_archivo,estado
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
    await c.query(
      `UPDATE solicitudes SET estado_pago=$1,motivo_estado_pago=$2,fecha_modificacion=$3,modificado_por=$4 WHERE referencia_reserva=$5`,
      [estado,motivoLimpio,ahora,usuario,ref],
    );
    await c.query(
      `UPDATE comprobantes_pago
          SET estado=$1,validado_por=$2,fecha_validacion=$3,observacion_validacion=$4
        WHERE id=(SELECT id FROM comprobantes_pago WHERE referencia_reserva=$5 ORDER BY id DESC LIMIT 1)`,
      [estado==='Pagado'?'VALIDADO':'RECHAZADO',usuario,ahora,motivoLimpio,ref],
    );
    await c.query(
      `INSERT INTO auditoria_acciones (fecha,usuario,accion) VALUES ($1,$2,$3)`,
      [ahora,usuario,estado==='Pagado'?'PAGO_VALIDADO':'PAGO_RECHAZADO'],
    );
  });
}
