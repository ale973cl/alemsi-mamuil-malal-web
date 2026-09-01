'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { actualizarValorInstitucion,cambiarEstadoExcepcionPersona,guardarExcepcionPersona } from '@/lib/db/valores-servicio';

function numero(v:FormDataEntryValue|null){const n=Number(String(v??'').replace(/[^0-9-]/g,''));return Number.isFinite(n)?n:NaN;}

export async function guardarValorInstitucionAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const precioDia=numero(fd.get('precio_dia'));
  const especialRaw=String(fd.get('precio_especial')||'').trim();
  const precioEspecial=especialRaw===''?null:numero(fd.get('precio_especial'));
  if(!Number.isFinite(precioDia)||precioDia<0) throw new Error('Ingresa un valor de servicio válido.');
  if(precioEspecial!=null&&(!Number.isFinite(precioEspecial)||precioEspecial<0)) throw new Error('Ingresa un valor especial válido.');
  await actualizarValorInstitucion({nombre:String(fd.get('nombre')||''),precioDia,precioEspecial,reglaActiva:fd.get('regla_activa')==='1',descripcion:String(fd.get('descripcion')||''),usuario:u.username});
  revalidatePath('/valores-servicio');revalidatePath('/reserva');revalidatePath('/finanzas');
}

export async function guardarExcepcionPersonaAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const precio=numero(fd.get('precio_especial'));
  if(!Number.isFinite(precio)||precio<0) throw new Error('Ingresa un valor especial válido.');
  await guardarExcepcionPersona({rut:String(fd.get('rut')||''),precioEspecial:precio,descripcion:String(fd.get('descripcion')||''),activa:fd.get('activa')!=='0',usuario:u.username});
  revalidatePath('/valores-servicio');revalidatePath('/reserva');revalidatePath('/finanzas');
}

export async function estadoExcepcionPersonaAction(fd:FormData){
  const u=await requireUser(['Finanzas','AdminTotal']);
  await cambiarEstadoExcepcionPersona(String(fd.get('rut')||''),fd.get('activa')==='1',u.username);
  revalidatePath('/valores-servicio');revalidatePath('/reserva');
}
