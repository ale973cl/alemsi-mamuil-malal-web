'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { agregarMovimientoReclamo, type RolReclamo } from '@/lib/db/reclamos';

const ROLES:RolReclamo[]=['AdminCasino','AdminTotal','Coordinacion','Gerencia','Finanzas'];
const DESTINOS:Record<RolReclamo,RolReclamo[]>={
  AdminCasino:['Coordinacion','Gerencia','Finanzas'],
  AdminTotal:['AdminCasino','Coordinacion','Gerencia','Finanzas'],
  Coordinacion:['AdminCasino','Gerencia'],
  Gerencia:['AdminCasino','Coordinacion','Finanzas'],
  Finanzas:['AdminCasino','Gerencia'],
};

async function archivoDesdeForm(fd:FormData){
  const file=fd.get('archivo');
  if(!(file instanceof File)||file.size===0) return null;
  if(file.size>10*1024*1024) throw new Error('El archivo supera 10 MB.');
  const permitidos=['application/pdf','image/jpeg','image/png','image/webp'];
  if(!permitidos.includes(file.type)) throw new Error('Adjunta PDF, JPG, PNG o WEBP.');
  return {nombre:file.name||'antecedente',mime:file.type,bytes:new Uint8Array(await file.arrayBuffer())};
}

export async function movimientoReclamoAction(fd:FormData){
  const u=await requireUser(ROLES);
  const rol=u.rol as RolReclamo;
  const reclamoId=Number(fd.get('reclamo_id')||0);
  const accion=String(fd.get('accion')||'ACTUALIZAR').trim();
  const destinoRaw=String(fd.get('destino_rol')||'').trim() as RolReclamo;
  const destino=destinoRaw&&DESTINOS[rol]?.includes(destinoRaw)?destinoRaw:null;
  const mensaje=String(fd.get('mensaje')||'').trim();
  const estado=String(fd.get('estado')||'').trim()||undefined;
  if(!mensaje&&accion!=='CERRAR') throw new Error('Indica la acción, respuesta o antecedente.');
  await agregarMovimientoReclamo({
    reclamoId,
    actor:u.nombre||u.username,
    actorRol:rol,
    accion,
    destinoRol:destino,
    mensaje,
    estado,
    archivo:await archivoDesdeForm(fd),
  });
  revalidatePath('/admin-casino');
  revalidatePath('/coordinacion');
  revalidatePath('/gerencia');
  revalidatePath('/finanzas');
  revalidatePath('/reclamos-gestion');
}
