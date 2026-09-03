'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { guardarCorreoRecuperacion } from '@/lib/db/admin';

export async function guardarCorreoRecuperacionAction(formData:FormData){
  const actor=await requireUser(['AdminTotal']);const username=String(formData.get('username')||'');const correo=String(formData.get('correo')||'');
  try{await guardarCorreoRecuperacion(username,correo,actor.username);}catch(error){redirect(`/admin-total?usuarios=error&mensaje=${encodeURIComponent(error instanceof Error?error.message:'No fue posible guardar el correo.') }#usuarios`);}
  revalidatePath('/admin-total');redirect('/admin-total?usuarios=guardado#usuarios');
}
