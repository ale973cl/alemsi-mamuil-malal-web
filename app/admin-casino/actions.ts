'use server';
import { requireUser } from '@/lib/auth/session';
import { enviarCoordinacion, guardarMinuta, setReglas } from '@/lib/db/admin';
import { revalidatePath } from 'next/cache';
export async function reglasAction(fd:FormData){ const u=await requireUser(['AdminCasino','AdminTotal']); await setReglas({a:Number(fd.get('a')||48),c:Number(fd.get('c')||24),m:Number(fd.get('m')||7),e:fd.get('e')?1:0},u.username); revalidatePath('/admin-casino'); }
export async function minutaAction(fd:FormData){ const u=await requireUser(['AdminCasino','AdminTotal']); await guardarMinuta({id:fd.get('id')?Number(fd.get('id')):undefined,fecha:String(fd.get('fecha')||''),servicio:String(fd.get('servicio')||''),tipo_opcion:String(fd.get('tipo_opcion')||''),plato:String(fd.get('plato')||'')},u.username); revalidatePath('/admin-casino'); }
export async function enviarAction(fd:FormData){ const u=await requireUser(['AdminCasino','AdminTotal']); await enviarCoordinacion(String(fd.get('inicio')),String(fd.get('fin')),u.username); revalidatePath('/admin-casino'); }
