'use server';
import { cancelarServicio } from '@/lib/db/comensal-gestion';
import { crearSolicitudExtraordinaria } from '@/lib/db/solicitudes-extraordinarias';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { revalidatePath } from 'next/cache';
import { guardarEncuesta } from '@/lib/db/satisfaccion';

export async function cancelarAction(fd:FormData){
  await cancelarServicio(String(fd.get('rut')||''),Number(fd.get('id')));
  revalidatePath('/mis-reservas');
  revalidatePath('/cocina');
}

export async function solicitarAnulacionExtraordinariaAction(fd:FormData){
  await crearSolicitudExtraordinaria({
    rut:String(fd.get('rut')||''),
    tipo:'ANULACION_SERVICIO',
    solicitudId:Number(fd.get('id')||0),
    motivo:String(fd.get('motivo')||''),
  });
  revalidatePath('/mis-reservas');
  revalidatePath('/admin-casino');
}

export async function solicitarNoConsumoDiaAction(fd:FormData){
  await crearSolicitudExtraordinaria({
    rut:String(fd.get('rut')||''),
    tipo:'NO_CONSUMIRA_DIA',
    fecha:String(fd.get('fecha')||''),
    motivo:String(fd.get('motivo')||''),
  });
  revalidatePath('/mis-reservas');
  revalidatePath('/admin-casino');
}

export async function encuestaAction(fd:FormData){
  const session=await getComensalSession();
  const rut=session?.rut||String(fd.get('rut')||'');
  const nota=(nombre:string)=>Number(fd.get(nombre)||0);
  await guardarEncuesta({
    rut,codigo:String(fd.get('codigo')||''),fecha:String(fd.get('fecha')||''),
    servicioGeneral:nota('servicio_general'),comida:nota('comida'),presentacion:nota('presentacion'),
    temperatura:nota('temperatura'),atencion:nota('atencion'),facilidad:nota('facilidad'),
    claridad:nota('claridad'),agilidad:nota('agilidad'),observacion:String(fd.get('observacion')||''),
    mejora:String(fd.get('mejora')||''),
  });
  revalidatePath('/mis-reservas');
}
