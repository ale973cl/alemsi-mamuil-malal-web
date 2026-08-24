'use server';

import { clearComensalSession } from '@/lib/auth/comensal-session';
import { redirect } from 'next/navigation';

export async function cerrarSesionComensalAction(){
  await clearComensalSession();
  redirect('/reserva');
}
