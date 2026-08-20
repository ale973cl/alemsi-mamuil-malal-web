import 'server-only';
import { authenticate as canonicalAuthenticate } from '@/lib/db/auth';
import { clearSession, getSession, setSession, type SessionUser } from '@/lib/auth/session';

// Compatibilidad para consumidores RC8: todos usan la sesión canónica.
export type LegacySessionUser = SessionUser & { role:SessionUser['rol']; name:string; email:string; mustChangePassword:boolean };
function legacy(user:SessionUser):LegacySessionUser{return {...user,role:user.rol,name:user.nombre,email:user.correo||'',mustChangePassword:user.debeCambiarPassword};}
export async function authenticate(username:string,password:string){const user=await canonicalAuthenticate(username,password);return user?legacy(user):null;}
export async function getLegacySession(){const user=await getSession();return user?legacy(user):null;}
export { clearSession, setSession };
export { getLegacySession as getSession };
