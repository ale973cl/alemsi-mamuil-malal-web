import 'server-only';
import { inTransaction, query } from '@/lib/db/pool';
import { registrarAuditoriaTx } from '@/lib/db/auditoria';
import { normalizarRutDb, validarRutM11 } from '@/lib/reglas/reserva';
import { obtenerReglasReserva } from '@/lib/db/reservas';
import { cancelacionDirectaHabilitada } from '@/lib/reglas/reserva';
import { agregarMovimientoReclamo } from '@/lib/db/reclamos';
import { obtenerDestinatariosConfigurados } from '@/lib/db/configuracion-operativa';
import { enviarCorreoSmtp } from '@/lib/email/smtp';

export async function listarMisReservas(rutInput:string){ if(!validarRutM11(rutInput)) throw new Error('RUT inválido.'); const rut=normalizarRutDb(rutInput); const [cab,lineas]=await Promise.all([query<any>(`SELECT s.codigo_reserva AS referencia_reserva,s.codigo_reserva,MIN(s.fecha) desde,MAX(s.fecha) hasta,COUNT(*) FILTER (WHERE COALESCE(s.estado_reserva,'ACTIVA')='ACTIVA') servicios_activos,STRING_AGG(DISTINCT COALESCE(NULLIF(s.estado_pago,''),'Pendiente'), ', ') estado_pago,STRING_AGG(DISTINCT COALESCE(NULLIF(s.estado_reserva,''),'ACTIVA'), ', ') estado_reserva,MAX(NULLIF(s.pago_token,'')) pago_token,(SELECT cp.estado FROM comprobantes_pago cp WHERE cp.referencia_reserva=s.codigo_reserva ORDER BY cp.id DESC LIMIT 1) comprobante_estado FROM solicitudes s WHERE s.rut=$1 AND COALESCE(NULLIF(s.codigo_reserva,''),'')<>'' GROUP BY s.codigo_reserva ORDER BY MAX(s.fecha) DESC`,[rut]),query<any>(`SELECT id,codigo_reserva AS referencia_reserva,codigo_reserva,fecha,servicio,plato_reservado,estado_reserva,COALESCE(NULLIF(estado_pago,''),'Pendiente') estado_pago FROM solicitudes WHERE rut=$1 ORDER BY fecha DESC,servicio,id`,[rut])]); return {rut,cab,lineas}; }
export async function cancelarServicio(rutInput:string,id:number){ if(!validarRutM11(rutInput)) throw new Error('RUT inválido.'); const rut=normalizarRutDb(rutInput); const rows=await query<any>(`SELECT id,fecha,servicio,codigo_reserva AS referencia_reserva,codigo_reserva,COALESCE(estado_reserva,'ACTIVA') estado_reserva FROM solicitudes WHERE id=$1 AND rut=$2 LIMIT 1`,[id,rut]); const r=rows[0]; if(!r||r.estado_reserva!=='ACTIVA') throw new Error('Servicio no disponible para cancelar.'); const reglas=await obtenerReglasReserva(); if(!cancelacionDirectaHabilitada(String(r.fecha),String(r.servicio),Number(reglas.cancelacion_directa_horas))) throw new Error('El servicio está fuera de la ventana de cancelación directa.'); await inTransaction(async c=>{await c.query(`UPDATE solicitudes SET estado_reserva='CANCELADA',fecha_modificacion=$1,modificado_por=$2 WHERE id=$3 AND rut=$2 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA'`,[new Date().toISOString(),rut,id]); await registrarAuditoriaTx(c,{usuario:rut,accion:'CANCELAR_SERVICIOS'});}); }

async function notificarIngresoInterno(registro:{id:number;rut:string;nombre:string;tipo:string;categoria:string;mensaje:string;fecha:string}){
  const base=await obtenerDestinatariosConfigurados('Reclamos');
  const pago=String(registro.categoria||'').toLocaleLowerCase('es-CL').includes('pago');
  const finanzas=pago?await obtenerDestinatariosConfigurados('Finanzas'):[];
  const destinatarios=[...new Set([...base,...finanzas])];
  if(!destinatarios.length){
    console.info('RECLAMO_INTERNAL_SMTP_SKIP','sin_destinatarios_configurados');
    return;
  }
  const folio=`R-${String(registro.id).padStart(6,'0')}`;
  const text=[
    `Nuevo caso ${folio}`,
    `Tipo: ${registro.tipo}`,
    `Categoría: ${registro.categoria}`,
    `Comensal: ${registro.nombre}`,
    `RUT: ${registro.rut}`,
    `Fecha: ${registro.fecha}`,
    `Mensaje: ${registro.mensaje}`,
    'El caso quedó registrado en ALEMSI Casino para seguimiento.',
  ].join('\n\n');
  for(const to of destinatarios){
    const result=await enviarCorreoSmtp({to,subject:`ALEMSI · Nuevo ${registro.tipo} · ${folio}`,text});
    if(result.ok) console.info('RECLAMO_INTERNAL_SMTP_OK',to,folio);
    else console.error('RECLAMO_INTERNAL_SMTP_ERROR',to,folio,result.errorType);
  }
}

export async function guardarReclamo(rutInput:string,tipo:string,categoria:string,mensaje:string){
  if(!validarRutM11(rutInput)) throw new Error('RUT inválido.'); if(!mensaje.trim()) throw new Error('Escribe un mensaje.');
  const rut=normalizarRutDb(rutInput); const c=(await query<any>(`SELECT nombre,correo FROM comensales WHERE rut=$1`,[rut]))[0]; if(!c) throw new Error('Comensal no encontrado.');
  const fecha=new Date().toISOString();
  const rows=await query<any>(`INSERT INTO reclamos_sugerencias (rut,nombre,tipo,categoria,mensaje,fecha,estado) VALUES ($1,$2,$3,$4,$5,$6,'Pendiente') RETURNING id`,[rut,c.nombre,tipo,categoria,mensaje.trim(),fecha]);
  const registro={id:Number(rows[0]?.id||0),rut,nombre:String(c.nombre||''),correo:String(c.correo||''),tipo,categoria,mensaje:mensaje.trim(),fecha,estado:'Pendiente' as const};
  try{
    await agregarMovimientoReclamo({reclamoId:registro.id,actor:'Sistema',actorRol:'AdminCasino',accion:'INGRESO_COMENSAL',mensaje:'Caso recibido desde portal de comensales.',estado:'Pendiente'});
  }catch(error){
    console.error('RECLAMO_MOVIMIENTO_INICIAL_ERROR',error instanceof Error?error.message:'unknown');
  }
  try{
    await notificarIngresoInterno(registro);
  }catch(error){
    console.error('RECLAMO_INTERNAL_SMTP_ERROR',error instanceof Error?error.message:'unknown');
  }
  return registro;
}
