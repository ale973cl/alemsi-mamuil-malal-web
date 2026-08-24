'use server';
import { requireUser } from '@/lib/auth/session';
import { finalizarRevision, guardarDia } from '@/lib/db/coordinacion';
import { revalidatePath } from 'next/cache';
export async function guardarDiaAction(fd:FormData){ const u=await requireUser(['Coordinacion','AdminTotal']); const count=Number(fd.get('count')||0); const decisiones=Array.from({length:count},(_,index)=>({servicio:String(fd.get(`servicio_${index}`)||''),tipo_opcion:String(fd.get(`tipo_opcion_${index}`)||''),plato:String(fd.get(`plato_${index}`)||''),accion:String(fd.get(`accion_${index}`)||'SIN_OBSERVACION') as 'SIN_OBSERVACION'|'CON_OBSERVACION',observacion:String(fd.get(`observacion_${index}`)||'')})); await guardarDia(Number(fd.get('flujoId')),String(fd.get('fecha')),decisiones,u.username); revalidatePath('/coordinacion'); }
export async function finalizarAction(fd:FormData){ const u=await requireUser(['Coordinacion','AdminTotal']); await finalizarRevision(Number(fd.get('flujoId')),u.username); revalidatePath('/coordinacion'); }
