'use server';

import { requireUser } from '@/lib/auth/session';
import {
  enviarCoordinacion,
  guardarMinuta,
  guardarMinutas,
  publicarMinuta,
  registrarAutorizacionExterna,
  setReglas,
} from '@/lib/db/admin';
import { publicarMinutaDirecta } from '@/lib/db/publicacion-directa-minuta';
import { resolverSolicitudExtraordinaria } from '@/lib/db/solicitudes-extraordinarias';
import { AREAS_RECLAMOS, CATEGORIAS_RECLAMOS, guardarPermisosReclamos, guardarResponsableReclamo, guardarRuteoCategoriasReclamos } from '@/lib/db/reclamos';
import type { FilaMinutaInput } from '@/lib/reglas/minutas';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function reglasAction(fd: FormData) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  await setReglas({a:Number(fd.get('otros')||48),c:Number(fd.get('c')||24),m:Number(fd.get('m')||7),e:fd.get('e')?1:0,modalidad:fd.get('modalidad')==='HORAS_EXACTAS'?'HORAS_EXACTAS':'DIA_COMPLETO',oficina:Number(fd.get('oficina')||48),otros:Number(fd.get('otros')||48),ventana:Number(fd.get('ventana')||31)},u.username);
  revalidatePath('/admin-casino');
}

export async function minutaAction(fd: FormData) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  const fecha=String(fd.get('fecha')||'');
  await guardarMinuta({id:fd.get('id')?Number(fd.get('id')):undefined,fecha,servicio:String(fd.get('servicio')||''),tipo_opcion:String(fd.get('tipo_opcion')||''),plato:String(fd.get('plato')||'')},u.username);
  if(fecha) await publicarMinutaDirecta(fecha,fecha,u.username,u.rol);
  revalidatePath('/admin-casino'); revalidatePath('/cocina'); revalidatePath('/gerencia'); revalidatePath('/reserva');
}

export async function enviarAction(fd: FormData) {const u=await requireUser(['AdminCasino','AdminTotal']);await enviarCoordinacion(String(fd.get('inicio')),String(fd.get('fin')),u.username);revalidatePath('/admin-casino');}
export async function publicarAction(fd: FormData) {const u=await requireUser(['AdminCasino','AdminTotal']);if(fd.get('confirmar')!=='PUBLICAR') throw new Error('Debes confirmar la publicación.');await publicarMinuta(String(fd.get('inicio')),String(fd.get('fin')),u.username,u.rol);revalidatePath('/admin-casino');}
export async function publicarDirectoAction(fd:FormData){const u=await requireUser(['AdminCasino','AdminTotal']);if(fd.get('confirmar')!=='PUBLICAR_DIRECTO') throw new Error('Debes confirmar la publicación directa.');await publicarMinutaDirecta(String(fd.get('inicio')||''),String(fd.get('fin')||''),u.username,u.rol);revalidatePath('/admin-casino');revalidatePath('/cocina');revalidatePath('/gerencia');revalidatePath('/reserva');}
export async function guardarMinutasAction(rows: FilaMinutaInput[]) {const u=await requireUser(['AdminCasino','AdminTotal']);const result=await guardarMinutas(rows,u.username);if(!result.ok) return result;const fechas=[...new Set(rows.map(row=>String(row.fecha||'')).filter(Boolean))].sort();if(!fechas.length) return {ok:false as const,errores:[{fila:0,campo:'fecha',mensaje:'No hay fechas válidas para publicar.'}]};await publicarMinutaDirecta(fechas[0],fechas[fechas.length-1],u.username,u.rol);revalidatePath('/admin-casino');revalidatePath('/cocina');revalidatePath('/gerencia');revalidatePath('/reserva');return {...result,publicada:true as const};}
export async function autorizacionExternaAction(fd: FormData) {const u=await requireUser(['AdminCasino','AdminTotal']);await registrarAutorizacionExterna(String(fd.get('inicio')),String(fd.get('fin')),u.username,String(fd.get('observacion')||''));revalidatePath('/admin-casino');}
export async function resolverSolicitudExtraordinariaAction(fd:FormData){const u=await requireUser(['AdminCasino','AdminTotal']);const decision=String(fd.get('decision')||'');if(decision!=='AUTORIZAR'&&decision!=='RECHAZAR') throw new Error('Decisión inválida.');await resolverSolicitudExtraordinaria({id:Number(fd.get('id')||0),decision,usuario:u.username,observacion:String(fd.get('observacion')||'')});revalidatePath('/admin-casino');revalidatePath('/mis-reservas');revalidatePath('/cocina');}

// Gobierno de Reclamos: Gerencia define responsables, ruteo y permisos.
// AdminTotal se conserva como respaldo técnico. AdminCasino administra la operación,
// pero no puede ampliar ni modificar permisos de los demás perfiles.
export async function guardarResponsableReclamoAction(fd:FormData){
  const u=await requireUser(['Gerencia','AdminTotal']);
  const areaKey=String(fd.get('area_key')||'');
  await guardarResponsableReclamo({areaKey,responsable:String(fd.get('responsable')||''),correo:String(fd.get('correo')||''),activo:fd.get('activo')==='on'},u.username);
  revalidatePath('/admin-casino'); revalidatePath('/gerencia'); revalidatePath('/reclamos-gestion');
  redirect(`/reclamos-gestion?guardado=responsable&detalle=${encodeURIComponent(areaKey)}#configuracion`);
}

export async function guardarRuteoReclamosAction(fd:FormData){
  const u=await requireUser(['Gerencia','AdminTotal']);
  const items=CATEGORIAS_RECLAMOS.map(categoria=>({categoriaKey:categoria.key,areaPrincipal:String(fd.get(`principal__${categoria.key}`)||'').trim()||null}));
  await guardarRuteoCategoriasReclamos(items,u.username);
  revalidatePath('/admin-casino'); revalidatePath('/gerencia'); revalidatePath('/reclamos-gestion');
  redirect('/reclamos-gestion?guardado=ruteo#configuracion');
}

export async function guardarMatrizReclamosAction(fd:FormData){
  const u=await requireUser(['Gerencia','AdminTotal']);
  const permisos=CATEGORIAS_RECLAMOS.flatMap(categoria=>AREAS_RECLAMOS.map(area=>{
    const puedeSolucionar=fd.get(`solucionar__${categoria.key}__${area.key}`)==='on';
    return {
      categoriaKey:categoria.key,
      areaKey:area.key,
      recibeCopia:fd.get(`copia__${categoria.key}__${area.key}`)==='on',
      puedeVer:puedeSolucionar||fd.get(`ver__${categoria.key}__${area.key}`)==='on',
      puedeSolucionar,
    };
  }));
  await guardarPermisosReclamos(permisos,u.username);
  revalidatePath('/admin-casino'); revalidatePath('/gerencia'); revalidatePath('/reclamos-gestion');
  redirect('/reclamos-gestion?guardado=matriz#configuracion');
}
