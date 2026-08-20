import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { normalizarRutDb, validarRutM11 } from '@/lib/reglas/reserva';
import { obtenerReglasReserva } from '@/lib/db/reservas';
import { firmarCancelacion, validarCancelacionDirecta, verificarCancelacion } from '@/lib/reglas/acceso-comensal';

function secret(){const value=process.env.SESSION_SECRET?.trim();if(!value) throw new Error('SESSION_SECRET no configurada.');return value;}
function firma(rut:string,id:number,referencia:string){return firmarCancelacion(secret(),rut,id,referencia);}

export async function listarMisReservas(rutInput:string,codigoInput:string){
  if(!validarRutM11(rutInput)) throw new Error('RUT inválido.');
  const rut=normalizarRutDb(rutInput),codigo=codigoInput.trim();
  if(!codigo) throw new Error('Ingresa el código de reserva.');
  const lineas=await query<any>(`SELECT id,referencia_reserva,fecha,servicio,plato_reservado,estado_reserva,COALESCE(NULLIF(estado_pago,''),'Pendiente') estado_pago FROM solicitudes WHERE rut=$1 AND (codigo_reserva=$2 OR referencia_reserva=$2) ORDER BY fecha DESC,servicio,id`,[rut,codigo]);
  if(!lineas.length) throw new Error('No se encontró una reserva para esos datos.');
  const refs=[...new Set<string>(lineas.map(r=>String(r.referencia_reserva)))];
  const cab=await query<any>(`SELECT referencia_reserva,COALESCE(MAX(NULLIF(codigo_reserva,'')),referencia_reserva) codigo_reserva,MIN(fecha) desde,MAX(fecha) hasta,COUNT(*) FILTER (WHERE COALESCE(estado_reserva,'ACTIVA')='ACTIVA') servicios_activos,STRING_AGG(DISTINCT COALESCE(NULLIF(estado_pago,''),'Pendiente'), ', ') estado_pago,STRING_AGG(DISTINCT COALESCE(NULLIF(estado_reserva,''),'ACTIVA'), ', ') estado_reserva FROM solicitudes WHERE rut=$1 AND referencia_reserva=ANY($2::text[]) GROUP BY referencia_reserva ORDER BY MAX(fecha) DESC`,[rut,refs]);
  return {rut,cab,lineas:lineas.map(r=>({...r,capacidad:firma(rut,Number(r.id),String(r.referencia_reserva))}))};
}

export async function cancelarServicio(rutInput:string,id:number,capacidad:string){
  if(!validarRutM11(rutInput)) throw new Error('RUT inválido.');
  const rut=normalizarRutDb(rutInput);
  const reglas=await obtenerReglasReserva();
  await inTransaction(async c=>{
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`CANCELAR|${rut}|${id}`]);
    const result=await c.query<any>(`SELECT id,fecha,servicio,referencia_reserva,COALESCE(estado_reserva,'ACTIVA') estado_reserva FROM solicitudes WHERE id=$1 AND rut=$2 LIMIT 1 FOR UPDATE`,[id,rut]);
    const r=result.rows[0];
    if(!r||!verificarCancelacion(capacidad,firma(rut,id,String(r.referencia_reserva)))) throw new Error('Autorización de cancelación no válida.');
    if(validarCancelacionDirecta(String(r.estado_reserva),String(r.fecha),String(r.servicio),Number(reglas.cancelacion_directa_horas))==='YA_CANCELADA') return;
    const ahora=new Date().toISOString();
    const updated=await c.query(`UPDATE solicitudes SET estado_reserva='CANCELADA',fecha_modificacion=$1,modificado_por=$2 WHERE id=$3 AND rut=$2 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'`,[ahora,rut,id]);
    if(updated.rowCount===1) await c.query(`INSERT INTO auditoria_acciones (fecha,usuario,accion,tabla,registro_id,valor_anterior,valor_nuevo,detalle) VALUES ($1,$2,'CANCELAR_SERVICIOS','solicitudes',$3,'ACTIVA','CANCELADA','Cancelación dentro de ventana')`,[ahora,rut,String(id)]);
  });
}

export async function guardarReclamo(rutInput:string,tipo:string,categoria:string,mensaje:string){ if(!validarRutM11(rutInput)) throw new Error('RUT inválido.'); if(!mensaje.trim()) throw new Error('Escribe un mensaje.'); const rut=normalizarRutDb(rutInput); const c=(await query<any>(`SELECT nombre FROM comensales WHERE rut=$1`,[rut]))[0]; if(!c) throw new Error('Comensal no encontrado.'); await query(`INSERT INTO reclamos_sugerencias (rut,nombre,tipo,categoria,mensaje,fecha,estado) VALUES ($1,$2,$3,$4,$5,$6,'Pendiente')`,[rut,c.nombre,tipo,categoria,mensaje.trim(),new Date().toISOString()]); }
