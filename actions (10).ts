'use server';
import { requireUser } from '@/lib/auth/session';
import { finalizarRevision, guardarDia } from '@/lib/db/coordinacion';
import { revalidatePath } from 'next/cache';
export async function guardarDiaAction(input:{flujoId:number;fecha:string;decisiones:Array<{servicio:string;tipo_opcion:string;plato:string;accion:'SIN_OBSERVACION'|'CON_OBSERVACION';observacion:string}>}){ const u=await requireUser(['Coordinacion','AdminTotal']); await guardarDia(input.flujoId,input.fecha,input.decisiones,u.username); revalidatePath('/coordinacion'); }
export async function finalizarAction(fd:FormData){ const u=await requireUser(['Coordinacion','AdminTotal']); await finalizarRevision(Number(fd.get('flujoId')),u.username); revalidatePath('/coordinacion'); }
