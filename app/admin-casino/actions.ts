'use server';

import { requireUser } from '@/lib/auth/session';
import {
  enviarCoordinacion,
  getReglas,
  guardarMinuta,
  guardarMinutas,
  publicarMinuta,
  registrarAutorizacionExterna,
  setReglas,
} from '@/lib/db/admin';
import { publicarMinutaDirecta } from '@/lib/db/publicacion-directa-minuta';
import { resolverSolicitudExtraordinaria } from '@/lib/db/solicitudes-extraordinarias';
import type { FilaMinutaInput } from '@/lib/reglas/minutas';
import { revalidatePath } from 'next/cache';

function numeroEntero(fd:FormData,nombre:string,porDefecto:number,min:number,max:number){
  const raw=String(fd.get(nombre)??'').trim();
  const valor=raw===''?porDefecto:Number(raw);
  if(!Number.isInteger(valor)||valor<min||valor>max) throw new Error(`Valor inválido para ${nombre}.`);
  return valor;
}

export async function reglasAction(fd: FormData) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  const valores={
    a:numeroEntero(fd,'a',48,0,720),
    c:numeroEntero(fd,'c',24,0,720),
    m:numeroEntero(fd,'m',7,1,31),
    e:fd.get('e')?1:0,
  };
  await setReglas(valores,u.username);
  const guardadas=await getReglas();
  if(
    Number(guardadas.anticipacion_reserva_horas)!==valores.a||
    Number(guardadas.cancelacion_directa_horas)!==valores.c||
    Number(guardadas.max_dias_consecutivos)!==valores.m||
    Number(guardadas.excepciones_habilitadas)!==valores.e
  ) throw new Error('La configuración no quedó guardada. No se aplicaron cambios parciales.');
  revalidatePath('/admin-casino');
  revalidatePath('/reserva');
}

export async function minutaAction(fd: FormData) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  const fecha=String(fd.get('fecha')||'');
  await guardarMinuta({id:fd.get('id')?Number(fd.get('id')):undefined,fecha,servicio:String(fd.get('servicio')||''),tipo_opcion:String(fd.get('tipo_opcion')||''),plato:String(fd.get('plato')||'')},u.username);
  if(fecha) await publicarMinutaDirecta(fecha,fecha,u.username,u.rol);
  revalidatePath('/admin-casino');
  revalidatePath('/cocina');
  revalidatePath('/gerencia');
  revalidatePath('/reserva');
}

// Se conserva por compatibilidad histórica, pero Coordinación ya no es requisito operativo.
export async function enviarAction(fd: FormData) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  await enviarCoordinacion(String(fd.get('inicio')),String(fd.get('fin')),u.username);
  revalidatePath('/admin-casino');
}

export async function publicarAction(fd: FormData) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  if(fd.get('confirmar')!=='PUBLICAR') throw new Error('Debes confirmar la publicación.');
  await publicarMinuta(String(fd.get('inicio')),String(fd.get('fin')),u.username,u.rol);
  revalidatePath('/admin-casino');
}

export async function publicarDirectoAction(fd:FormData){
  const u=await requireUser(['AdminCasino','AdminTotal']);
  if(fd.get('confirmar')!=='PUBLICAR_DIRECTO') throw new Error('Debes confirmar la publicación directa.');
  await publicarMinutaDirecta(String(fd.get('inicio')||''),String(fd.get('fin')||''),u.username,u.rol);
  revalidatePath('/admin-casino');
  revalidatePath('/cocina');
  revalidatePath('/gerencia');
  revalidatePath('/reserva');
}

export async function guardarMinutasAction(rows: FilaMinutaInput[]) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  const result=await guardarMinutas(rows,u.username);
  if(!result.ok) return result;

  const fechas=[...new Set(rows.map(row=>String(row.fecha||'')).filter(Boolean))].sort();
  if(!fechas.length) return {ok:false as const,errores:[{fila:0,campo:'fecha',mensaje:'No hay fechas válidas para publicar.'}]};

  await publicarMinutaDirecta(fechas[0],fechas[fechas.length-1],u.username,u.rol);
  revalidatePath('/admin-casino');
  revalidatePath('/cocina');
  revalidatePath('/gerencia');
  revalidatePath('/reserva');
  return {...result,publicada:true as const};
}

export async function autorizacionExternaAction(fd: FormData) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  await registrarAutorizacionExterna(String(fd.get('inicio')),String(fd.get('fin')),u.username,String(fd.get('observacion')||''));
  revalidatePath('/admin-casino');
}

export async function resolverSolicitudExtraordinariaAction(fd:FormData){
  const u=await requireUser(['AdminCasino','AdminTotal']);
  const decision=String(fd.get('decision')||'');
  if(decision!=='AUTORIZAR'&&decision!=='RECHAZAR') throw new Error('Decisión inválida.');
  await resolverSolicitudExtraordinaria({id:Number(fd.get('id')||0),decision,usuario:u.username,observacion:String(fd.get('observacion')||'')});
  revalidatePath('/admin-casino');
  revalidatePath('/mis-reservas');
  revalidatePath('/cocina');
}
