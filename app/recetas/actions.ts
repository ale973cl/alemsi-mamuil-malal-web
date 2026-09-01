'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { guardarReceta } from '@/lib/db/recetas';

export async function guardarRecetaAction(fd:FormData){
  const u=await requireUser(['AdminCasino','AdminTotal']);
  const ingredientes=[] as Array<{ingrediente:string;cantidad:number;unidad:string}>;
  for(let i=0;i<20;i+=1){
    const ingrediente=String(fd.get(`ingrediente_${i}`)||'').trim();
    const cantidadRaw=String(fd.get(`cantidad_${i}`)||'').trim().replace(',','.');
    const unidad=String(fd.get(`unidad_${i}`)||'').trim();
    if(!ingrediente&&!cantidadRaw&&!unidad) continue;
    const cantidad=Number(cantidadRaw);
    if(!ingrediente||!Number.isFinite(cantidad)||cantidad<0) throw new Error(`Revisa el ingrediente ${i+1} y su cantidad.`);
    ingredientes.push({ingrediente,cantidad,unidad});
  }
  const id=await guardarReceta({
    id:Number(fd.get('id')||0)||undefined,
    plato:String(fd.get('plato')||''),
    porcionesBase:Number(fd.get('porciones_base')||0),
    preparacion:String(fd.get('preparacion')||''),
    activo:fd.get('activo')==='on',
    ingredientes,
  },u.nombre||u.username);
  revalidatePath('/recetas');
  redirect(`/recetas?receta=${id}&guardado=1`);
}
