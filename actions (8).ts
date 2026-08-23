'use server';
import { requireUser } from '@/lib/auth/session';
import { validarPago } from '@/lib/db/finanzas';
import { revalidatePath } from 'next/cache';
export async function pagoAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const ref=String(fd.get('ref')||'');
  const estado=String(fd.get('estado')||'') as 'Pagado'|'Rechazado';
  const motivo=String(fd.get('motivo')||'');
  if(!['Pagado','Rechazado'].includes(estado)) throw new Error('Estado financiero no permitido.');
  if(estado==='Rechazado'&&!motivo.trim()) throw new Error('Debes indicar el motivo del rechazo.');
  await validarPago(ref,estado,u.username,motivo);
  revalidatePath('/finanzas');
}
