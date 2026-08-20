import 'server-only';
import { query } from '@/lib/db/pool';
import type { Rol, SessionUser } from '@/lib/auth/session';
import { esRolInterno, hashPasswordHistorico } from '@/lib/auth/core';
export const hashPwd=hashPasswordHistorico;
export async function registrarAcceso(usuario:string,accion:'LOGIN_EXITOSO'|'LOGIN_FALLIDO'|'LOGOUT',detalle=''){
  await query(`INSERT INTO auditoria_acciones (fecha,usuario,accion,tabla,registro_id,valor_anterior,valor_nuevo,detalle) VALUES ($1,$2,$3,'usuarios',$2,'',$4,$5)`,[new Date().toISOString(),usuario||'desconocido',accion,accion,detalle]);
}
export async function authenticate(username:string,password:string):Promise<SessionUser|null>{
  const normalized=username.trim();
  const rows=await query<{username:string;rol:string;nombre:string;correo:string|null;activo:number;debe_cambiar_password:number}>(`SELECT username,rol,nombre,correo,COALESCE(activo,1) activo,COALESCE(debe_cambiar_password,0) debe_cambiar_password FROM usuarios WHERE LOWER(username)=LOWER($1) AND pwd=$2 LIMIT 1`,[normalized,hashPwd(password)]);
  const u=rows[0];
  if(!u||Number(u.activo)!==1||!esRolInterno(u.rol)){ await registrarAcceso(normalized,'LOGIN_FALLIDO','Credenciales, estado o rol no válidos'); return null; }
  await registrarAcceso(u.username,'LOGIN_EXITOSO',`rol=${u.rol}`);
  return {username:u.username,nombre:u.nombre||u.username,rol:u.rol as Rol,correo:u.correo||undefined,debeCambiarPassword:Number(u.debe_cambiar_password)===1};
}
