import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { normalizarSesion, type RolInterno } from '@/lib/auth/core';

export type Rol = RolInterno;
export type SessionUser = { username:string; nombre:string; rol:Rol; correo?:string; debeCambiarPassword:boolean };
const COOKIE='alemsi_session';
function secret(){ const s=process.env.SESSION_SECRET?.trim(); if(!s) throw new Error('SESSION_SECRET no configurada.'); return s; }
function sign(payload:string){ return crypto.createHmac('sha256',secret()).update(payload).digest('base64url'); }
export async function setSession(user:SessionUser){ const body=Buffer.from(JSON.stringify(user)).toString('base64url'); const value=`${body}.${sign(body)}`; (await cookies()).set(COOKIE,value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*10}); }
export async function clearSession(){ (await cookies()).delete(COOKIE); }
export async function getSession():Promise<SessionUser|null>{ try{ const raw=(await cookies()).get(COOKIE)?.value; if(!raw) return null; const [body,sig]=raw.split('.'); if(!body||!sig) return null; const expected=sign(body); if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) return null; const parsed=JSON.parse(Buffer.from(body,'base64url').toString()) as Record<string,unknown>;return normalizarSesion(parsed); }catch{return null;} }
export async function requireUser(roles?:Rol[]){ const u=await getSession(); if(!u) redirect('/login'); if(roles && !roles.includes(u.rol)) redirect('/'); return u; }
