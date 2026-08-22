import 'server-only';
import { enviarCorreoSmtp, type SmtpDelivery } from '@/lib/email/smtp';

function enlaceComprobante(origin:string,token:string){
  const base=new URL(origin);
  base.pathname=`/comprobante/${encodeURIComponent(token)}`;
  base.search=''; base.hash='';
  return base.toString();
}

export function notificarReservaConfirmada(input:{correo:string;codigo:string;referencia:string;pagoToken?:string;origin:string}):Promise<SmtpDelivery>{
  const lineas=[`Tu reserva ${input.codigo} fue confirmada.`,`Referencia: ${input.referencia}.`];
  if(input.pagoToken) lineas.push(`Gestiona el comprobante de esta misma reserva en: ${enlaceComprobante(input.origin,input.pagoToken)}`);
  return enviarCorreoSmtp({to:input.correo,subject:`Reserva confirmada ${input.codigo}`,text:lineas.join('\n\n')});
}

export function notificarComprobanteRecibido(input:{correo:string;referencia:string;pagoToken:string;origin:string}):Promise<SmtpDelivery>{
  return enviarCorreoSmtp({to:input.correo,subject:`Comprobante recibido ${input.referencia}`,text:`Recibimos el comprobante de la reserva ${input.referencia}.\n\nPuedes consultar el mismo recurso en: ${enlaceComprobante(input.origin,input.pagoToken)}`});
}
