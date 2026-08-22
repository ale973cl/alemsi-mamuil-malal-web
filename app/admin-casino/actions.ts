'use server';
import { requireUser } from '@/lib/auth/session';
import { enviarCoordinacion, guardarMinuta, guardarMinutas, publicarMinuta, registrarAutorizacionExterna, setReglas } from '@/lib/db/admin';
import type { FilaMinutaInput } from '@/lib/reglas/minutas';
import { revalidatePath } from 'next/cache';
export async function reglasAction(fd:FormData){ const u=await requireUser(['AdminCasino','AdminTotal']); await setReglas({a:Number(fd.get('a')||48),c:Number(fd.get('c')||24),m:Number(fd.get('m')||7),e:fd.get('e')?1:0},u.username); revalidatePath('/admin-casino'); }
export async function minutaAction(fd:FormData){ const u=await requireUser(['AdminCasino','AdminTotal']); await guardarMinuta({id:fd.get('id')?Number(fd.get('id')):undefined,fecha:String(fd.get('fecha')||''),servicio:String(fd.get('servicio')||''),tipo_opcion:String(fd.get('tipo_opcion')||''),plato:String(fd.get('plato')||'')},u.username); revalidatePath('/admin-casino'); }
export async function enviarAction(fd:FormData){ const u=await requireUser(['AdminCasino','AdminTotal']); await enviarCoordinacion(String(fd.get('inicio')),String(fd.get('fin')),u.username); revalidatePath('/admin-casino'); }
export async function publicarAction(fd:FormData){ const u=await requireUser(['AdminCasino','AdminTotal']); if(fd.get('confirmar')!=='PUBLICAR') throw new Error('Debes confirmar la publicación.'); await publicarMinuta(String(fd.get('inicio')),String(fd.get('fin')),u.username,u.rol); revalidatePath('/admin-casino'); }
export async function guardarMinutasAction(rows:FilaMinutaInput[]){ const u=await requireUser(['AdminCasino','AdminTotal']); const result=await guardarMinutas(rows,u.username); if(result.ok) revalidatePath('/admin-casino'); return result; }
export async function autorizacionExternaAction(fd:FormData){ const u=await requireUser(['AdminCasino','AdminTotal']); await registrarAutorizacionExterna(String(fd.get('inicio')),String(fd.get('fin')),u.username,String(fd.get('observacion')||'')); revalidatePath('/admin-casino'); }
