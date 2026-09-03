import 'server-only';
import crypto from 'node:crypto';
import { query } from '@/lib/db/pool';
import { registrarAuditoria } from '@/lib/db/auditoria';
import type { Rol, SessionUser } from '@/lib/auth/session';
export function hashPwd(value:string){ return crypto.createHash('sha256').update(value).digest('hex'); }
function passwordHash(value:string){const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync(value,salt,64).toString('hex');return`scrypt:${salt}:${hash}`;}
function passwordMatches(value:string,stored:string){
 if(!stored.startsWith('scrypt:')) return crypto.timingSafeEqual(Buffer.from(hashPwd(value)),Buffer.from(stored));
 const [,salt,expected]=stored.split(':');if(!salt||!expected)return false;const actual=crypto.scryptSync(value,salt,64);const expectedBuffer=Buffer.from(expected,'hex');return actual.length===expectedBuffer.length&&crypto.timingSafeEqual(actual,expectedBuffer);
}
export async function authenticate(username:string,password:string):Promise<SessionUser|null>{ const rows=await query<{username:string;pwd:string;rol:Rol;nombre:string;correo:string|null;activo:number}>(`SELECT username,pwd,rol,nombre,correo,COALESCE(activo,1) activo FROM usuarios WHERE LOWER(username)=LOWER($1) LIMIT 1`,[username.trim()]); const u=rows[0]; if(!u||Number(u.activo)!==1||!passwordMatches(password,u.pwd)) return null; return {username:u.username,nombre:u.nombre||u.username,rol:u.rol,correo:u.correo||undefined}; }
export async function crearTokenRecuperacion(identificador:string){
 const rows=await query<{username:string;correo:string}>(`SELECT username,correo FROM usuarios WHERE activo=1 AND correo IS NOT NULL AND btrim(correo)<>'' AND (LOWER(username)=LOWER($1) OR LOWER(correo)=LOWER($1)) LIMIT 1`,[identificador.trim()]);
 const user=rows[0];if(!user)return null;const token=crypto.randomBytes(32).toString('base64url');const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
 await query(`UPDATE password_reset_tokens SET usado_at=NOW() WHERE username=$1 AND usado_at IS NULL`,[user.username]);
 await query(`INSERT INTO password_reset_tokens(username,token_hash,expira_at) VALUES($1,$2,NOW()+INTERVAL '30 minutes')`,[user.username,tokenHash]);
 return{token,correo:user.correo};
}
export async function restablecerPassword(token:string,nuevaPassword:string){
 const tokenHash=crypto.createHash('sha256').update(token).digest('hex');const rows=await query<{id:number;username:string}>(`SELECT id,username FROM password_reset_tokens WHERE token_hash=$1 AND usado_at IS NULL AND expira_at>NOW() LIMIT 1`,[tokenHash]);const reset=rows[0];if(!reset)return false;
 await query(`UPDATE usuarios SET pwd=$1,debe_cambiar_password=0 WHERE username=$2`,[passwordHash(nuevaPassword),reset.username]);await query(`UPDATE password_reset_tokens SET usado_at=NOW() WHERE id=$1`,[reset.id]);return true;
}
export async function registrarLogin(username:string,exitoso:boolean):Promise<void>{ await registrarAuditoria({usuario:username.trim(),accion:exitoso?'LOGIN_EXITOSO':'LOGIN_FALLIDO'}); }
