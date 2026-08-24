'use server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { obtenerDatosNotificacionFinanzas, validarPago, validarPagoSinComprobante } from '@/lib/db/finanzas';
import { notificarComprobanteRechazado, notificarSolicitudInformacionPago } from '@/lib/email/notificaciones';

async function originActual(){
  const h=await headers();
  const host=h.get('x-forwarded-host')||h.get('host');
  const proto=h.get('x-forwarded-proto')||'https';
  return host?`${proto}://${host}`:'';
}

export async function pagoAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const codigo=String(fd.get('codigo')||'');
  const estado=String(fd.get('estado')||'') as 'Pagado'|'Rechazado';
  const motivo=String(fd.get('motivo')||'');
  if(!codigo||!['Pagado','Rechazado'].includes(estado)) return;
  if(estado==='Rechazado'&&!motivo.trim()) throw new Error('Debes indicar el motivo del rechazo.');
  await validarPago(codigo,estado,u.username,motivo);

  if(estado==='Rechazado'){
    const datos=await obtenerDatosNotificacionFinanzas(codigo);
    const origin=await originActual();
    if(datos?.correo&&origin){
      after(async()=>{
        try{
          const envio=await notificarComprobanteRechazado({correo:datos.correo,codigo,total:Number(datos.total||0),motivo,pagoToken:datos.pago_token,origin});
          if(!envio.ok) console.error('FINANZAS_RECHAZO_EMAIL_ERROR',envio.errorType);
        }catch{console.error('FINANZAS_RECHAZO_EMAIL_ERROR','protocol');}
      });
    }else{
      console.error('FINANZAS_RECHAZO_EMAIL_ERROR','configuration');
    }
  }

  revalidatePath('/finanzas');
  revalidatePath('/reserva');
}

export async function solicitarInformacionPagoAction(fd:FormData){
  await requireUser(['Finanzas','AdminTotal']);
  const codigo=String(fd.get('codigo')||'').trim();
  if(!codigo) throw new Error('Reserva inválida.');
  const datos=await obtenerDatosNotificacionFinanzas(codigo);
  if(!datos) throw new Error('Reserva no encontrada.');
  if(!datos.correo) throw new Error('El comensal no tiene un correo registrado.');
  const origin=await originActual();
  if(!origin) throw new Error('No fue posible determinar la dirección de la aplicación.');
  const envio=await notificarSolicitudInformacionPago({correo:datos.correo,codigo,total:Number(datos.total||0),pagoToken:datos.pago_token,origin});
  if(!envio.ok) throw new Error('No fue posible enviar la solicitud de información de pago.');
  revalidatePath('/finanzas');
}

export async function validarSinComprobanteAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const codigo=String(fd.get('codigo')||'');
  const medio=String(fd.get('medio')||'');
  const motivo=String(fd.get('motivo')||'');
  await validarPagoSinComprobante(codigo,u.username,medio,motivo);
  revalidatePath('/finanzas');
  revalidatePath('/reserva');
}
