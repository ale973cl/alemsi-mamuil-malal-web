import crypto from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import type { Role } from "@/lib/roles";

export type SessionUser = { username:string; role:Role; name:string; email:string; mustChangePassword:boolean };
const COOKIE = "alemsi_session";
function secret(){ return process.env.SESSION_SECRET || "DEV_ONLY_CHANGE_ME"; }
function hashPwd(value:string){ return crypto.createHash("sha256").update(value).digest("hex"); }
function sign(payload:string){ return crypto.createHmac("sha256", secret()).update(payload).digest("base64url"); }
function encode(user:SessionUser){ const payload=Buffer.from(JSON.stringify(user)).toString("base64url"); return `${payload}.${sign(payload)}`; }
function decode(raw?:string):SessionUser|null { if(!raw) return null; const [payload,sig]=raw.split("."); if(!payload||!sig) return null; const expected=sign(payload); if(sig.length!==expected.length || !crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return null; try{return JSON.parse(Buffer.from(payload,"base64url").toString())}catch{return null} }

export async function authenticate(username:string,password:string):Promise<SessionUser|null>{
  const rows=await query<any>(`SELECT username,rol,nombre,correo,COALESCE(activo,1) AS activo,COALESCE(debe_cambiar_password,0) AS debe_cambiar_password FROM usuarios WHERE username=$1 AND pwd=$2 LIMIT 1`,[username.trim().toLowerCase(),hashPwd(password.trim())]);
  const r=rows[0]; if(!r || Number(r.activo)!==1) return null;
  return {username:r.username,role:r.rol as Role,name:r.nombre||r.username,email:r.correo||"",mustChangePassword:Number(r.debe_cambiar_password)===1};
}
export async function setSession(user:SessionUser){ const c=await cookies(); c.set(COOKIE,encode(user),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*10}); }
export async function clearSession(){ const c=await cookies(); c.delete(COOKIE); }
export async function getSession(){ const c=await cookies(); return decode(c.get(COOKIE)?.value); }
