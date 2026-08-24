'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { validarPago, validarPagoSinComprobante } from '@/lib/db/finanzas';

export async function pagoAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const codigo=String(fd.get('codigo')||'');
  const estado=String(fd.get('estado')||'') as 'Pagado'|'Rechazado';
  const motivo=String(fd.get('motivo')||'');
  if(!codigo||!['Pagado','Rechazado'].includes(estado)) return;
  if(estado==='Rechazado'&&!motivo.trim()) throw new Error('Debes indicar el motivo del rechazo.');
  await validarPago(codigo,estado,u.username,motivo);
  revalidatePath('/finanzas');
  revalidatePath('/reserva');
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
