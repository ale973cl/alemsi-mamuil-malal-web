'use server';
import { cancelarServicio } from '@/lib/db/comensal-gestion';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function cancelarAction(fd:FormData){
  await cancelarServicio(String(fd.get('rut')||''),Number(fd.get('id')));
  revalidatePath('/mis-reservas');
}

export async function salirComensalAction(){
  const jar=await cookies();
  jar.delete('alemsi_comensal_rut');
  redirect('/');
}
