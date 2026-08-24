'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { validarPago, validarPagoSinComprobante } from '@/lib/db/finanzas';

export async function pagoAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const ref=String(fd.get('ref')||'');
  const estado=String(fd.get('estado')||'') as 'Pagado'|'Observado'|'Rechazado';
  const motivo=String(fd.get('motivo')||'');
  if(!ref||!['Pagado','Observado','Rechazado'].includes(estado)) return;
  if(estado!=='Pagado'&&!motivo.trim()) throw new Error(`Debes indicar el motivo de ${estado==='Observado'?'la observación':'el rechazo'}.`);
  await validarPago(ref,estado,u.username,motivo);
  revalidatePath('/finanzas');
  revalidatePath('/reserva');
}

export async function validarSinComprobanteAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const ref=String(fd.get('ref')||'');
  const medio=String(fd.get('medio')||'');
  const motivo=String(fd.get('motivo')||'');
  await validarPagoSinComprobante(ref,u.username,medio,motivo);
  revalidatePath('/finanzas');
  revalidatePath('/reserva');
}
