 'use server';
import { authenticate } from '@/lib/db/auth';
import { registrarAcceso } from '@/lib/db/auth';
import { clearSession, setSession } from '@/lib/auth/session';
import { HOME_BY_ROLE } from '@/lib/reglas/permisos';
import { redirect } from 'next/navigation';
export async function loginAction(formData:FormData){ const u=String(formData.get('username')||''); const p=String(formData.get('password')||''); const user=await authenticate(u,p); if(!user) redirect('/login?error=1'); await setSession(user); redirect(HOME_BY_ROLE[user.rol]); }
export async function logoutAction(){ const user=await import('@/lib/auth/session').then(m=>m.getSession()); try{if(user) await registrarAcceso(user.username,'LOGOUT');}finally{await clearSession();} redirect('/login'); }
