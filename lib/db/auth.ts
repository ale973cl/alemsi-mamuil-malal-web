import 'server-only';
import crypto from 'node:crypto';
import { query } from '@/lib/db/pool';
import { registrarAuditoria } from '@/lib/db/auditoria';
import type { Rol, SessionUser } from '@/lib/auth/session';
export function hashPwd(value:string){ return crypto.createHash('sha256').update(value).digest('hex'); }
export async function authenticate(username:string,password:string):Promise<SessionUser|null>{ const rows=await query<{username:string;rol:Rol;nombre:string;correo:string|null;activo:number}>(`SELECT username,rol,nombre,correo,COALESCE(activo,1) activo FROM usuarios WHERE LOWER(username)=LOWER($1) AND pwd=$2 LIMIT 1`,[username.trim(),hashPwd(password)]); const u=rows[0]; if(!u||Number(u.activo)!==1) return null; return {username:u.username,nombre:u.nombre||u.username,rol:u.rol,correo:u.correo||undefined}; }
export async function registrarLogin(username:string,exitoso:boolean):Promise<void>{ await registrarAuditoria({usuario:username.trim(),accion:exitoso?'LOGIN_EXITOSO':'LOGIN_FALLIDO'}); }
