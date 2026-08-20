import crypto from 'node:crypto';
import { cancelacionDirectaHabilitada } from './reserva.ts';

export function firmarCancelacion(secret:string,rut:string,id:number,referencia:string){
  if(!secret.trim()) throw new Error('SESSION_SECRET no configurada.');
  return crypto.createHmac('sha256',secret).update(`${rut}|${id}|${referencia}`).digest('base64url');
}
export function verificarCancelacion(actual:string,esperada:string){
  return actual.length===esperada.length&&crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(esperada));
}
export function validarCancelacionDirecta(estado:string,fecha:string,servicio:string,horas:number,ahora=new Date()){
  if(estado==='CANCELADA') return 'YA_CANCELADA' as const;
  if(estado!=='ACTIVA') throw new Error('Servicio no disponible para cancelar.');
  if(!cancelacionDirectaHabilitada(fecha,servicio,horas,ahora)) throw new Error('El servicio está fuera de la ventana de cancelación directa.');
  return 'CANCELABLE' as const;
}
