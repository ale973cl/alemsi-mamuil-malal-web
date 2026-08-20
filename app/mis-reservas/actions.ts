'use server';
import { cancelarServicio } from '@/lib/db/comensal-gestion';
import { redirect } from 'next/navigation';
export async function cancelarAction(fd:FormData){
  const rut=String(fd.get('rut')||''),codigo=String(fd.get('codigo')||'');
  const base=`/mis-reservas?rut=${encodeURIComponent(rut)}&codigo=${encodeURIComponent(codigo)}`;
  let destino:string;
  try{await cancelarServicio(rut,Number(fd.get('id')),String(fd.get('capacidad')||''));destino=`${base}&cancelada=1`;}
  catch(error){destino=`${base}&cancel_error=${encodeURIComponent(error instanceof Error?error.message:'No fue posible cancelar.')}`;}
  redirect(destino);
}
