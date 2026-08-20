import 'server-only'; import { query,inTransaction } from '@/lib/db/pool';
export async function listarFinanzas(){ return query<any>(`SELECT s.referencia_reserva,MAX(s.codigo_reserva) codigo_reserva,MIN(s.fecha) primera_fecha,MAX(s.fecha) ultima_fecha,MAX(c.nombre) nombre,MAX(s.institucion) institucion,MAX(s.metodo_pago) metodo_pago,MAX(s.estado_pago) estado_pago,SUM(COALESCE(s.precio_aplicado,s.precio,0)) total,MAX(cp.id) comprobante_id,MAX(cp.nombre_archivo) comprobante_archivo,MAX(cp.estado) comprobante_estado FROM solicitudes s LEFT JOIN comensales c ON c.rut=s.rut LEFT JOIN comprobantes_pago cp ON cp.referencia_reserva=s.referencia_reserva WHERE COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA' GROUP BY s.referencia_reserva ORDER BY MAX(s.fecha) DESC LIMIT 250`); }
export async function validarPago(ref:string,estado:'Pagado'|'Rechazado',usuario:string,obs:string){ await inTransaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`PAGO|${ref}`]);
  const actual=await c.query<{estado_pago:string|null}>(`SELECT estado_pago FROM solicitudes WHERE referencia_reserva=$1 LIMIT 1 FOR UPDATE`,[ref]);
  if(!actual.rows[0]) throw new Error('Reserva no encontrada.');
  if(actual.rows[0].estado_pago===estado) return;
  const comprobante=await c.query(`SELECT id FROM comprobantes_pago WHERE referencia_reserva=$1 ORDER BY id DESC LIMIT 1 FOR UPDATE`,[ref]);
  if(estado==='Pagado'&&!comprobante.rows[0]) throw new Error('No se puede validar un pago sin comprobante recibido.');
  const ahora=new Date().toISOString();
  await c.query(`UPDATE solicitudes SET estado_pago=$1,motivo_estado_pago=$2,fecha_modificacion=$3,modificado_por=$4 WHERE referencia_reserva=$5`,[estado,obs,ahora,usuario,ref]);
  await c.query(`UPDATE comprobantes_pago SET estado=$1,validado_por=$2,fecha_validacion=$3,observacion_validacion=$4 WHERE referencia_reserva=$5`,[estado==='Pagado'?'VALIDADO':'RECHAZADO',usuario,ahora,obs,ref]);
  await c.query(`INSERT INTO auditoria_acciones (fecha,usuario,accion,tabla,registro_id,valor_anterior,valor_nuevo,detalle) VALUES ($1,$2,'VALIDAR_PAGO','solicitudes',$3,$4,$5,$6)`,[ahora,usuario,ref,actual.rows[0].estado_pago||'',estado,obs]);
}); }
