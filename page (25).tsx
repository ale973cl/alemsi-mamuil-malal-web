import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { HOME_BY_ROLE } from '@/lib/reglas/permisos';

export default async function Portal(){
  const user=await getSession();
  redirect(user?HOME_BY_ROLE[user.rol]:'/login');
}
