'use server';
import { cancelarServicio } from '@/lib/db/comensal-gestion';
import { crearSolicitudExtraordinaria } from '@/lib/db/solicitudes-extraordinarias';
import { revalidatePath } from 'next/cache';

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
