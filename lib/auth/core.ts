import crypto from 'node:crypto';

export const ROLES_INTERNOS=['AdminTotal','AdminCasino','Finanzas','Cocina','Coordinacion','Gerencia','Bodega','Operaciones'] as const;
export type RolInterno=typeof ROLES_INTERNOS[number];
export function esRolInterno(value:unknown):value is RolInterno{return typeof value==='string'&&(ROLES_INTERNOS as readonly string[]).includes(value);}
export function hashPasswordHistorico(value:string){return crypto.createHash('sha256').update(value).digest('hex');}
export function usuarioActivo(value:unknown){return Number(value)===1;}
export const SQL_AUDITORIA_ACCESO='INSERT INTO auditoria_acciones (fecha,usuario,accion,detalle) VALUES ($1,$2,$3,$4)';
export async function auditarSinBloquearLogin(escribir:()=>Promise<unknown>,reportar:(error:unknown)=>void=console.error){
  try{await escribir();}catch(error){reportar(error);}
}
export type SesionNormalizada={username:string;nombre:string;rol:RolInterno;correo?:string;debeCambiarPassword:boolean};
export function normalizarSesion(parsed:Record<string,unknown>):SesionNormalizada|null{
  const username=typeof parsed.username==='string'?parsed.username:'';
  const rol=parsed.rol||parsed.role;
  if(!username||!esRolInterno(rol)) return null;
  const nombre=typeof parsed.nombre==='string'?parsed.nombre:typeof parsed.name==='string'?parsed.name:username;
  const correo=typeof parsed.correo==='string'?parsed.correo:typeof parsed.email==='string'?parsed.email:undefined;
  return {username,nombre,rol,correo,debeCambiarPassword:Boolean(parsed.debeCambiarPassword??parsed.mustChangePassword)};
}
