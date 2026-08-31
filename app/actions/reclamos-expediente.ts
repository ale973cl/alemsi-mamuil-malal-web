'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { agregarMovimientoReclamo, type RolReclamo } from '@/lib/db/reclamos';
import { notificarDerivacionReclamo, obtenerDestinoReclamo } from '@/lib/reclamos-routing';

const ROLES:RolReclamo[]=['AdminCasino','AdminTotal','Coordinacion','Gerencia','Finanzas'];

async function archivoDesdeForm(fd:FormData){
  const file=fd.get('archivo');
  if(!(file instanceof File)||file.size===0) return null;
  if(file.size>5*1024*1024) throw new Error('El archivo supera 5 MB.');
  const permitidos=['application/pdf','image/jpeg','image/png','image/webp'];
  if(!permitidos.includes(file.type)) throw new Error('Adjunta PDF, JPG, PNG o WEBP.');
  return {nombre:file.name||'antecedente',mime:file.type,bytes:new Uint8Array(await file.arrayBuffer())};
}

export async function movimientoReclamoAction(fd:FormData){
  const u=await requireUser(ROLES);
  const rol=u.rol as RolReclamo;
  const reclamoId=Number(fd.get('reclamo_id')||0);
  const accion=String(fd.get('accion')||'ACTUALIZAR').trim();
  const destinoArea=String(fd.get('destino_area')||'').trim();
  const mensaje=String(fd.get('mensaje')||'').trim();
  const estado=String(fd.get('estado')||'').trim()||undefined;
  if(!reclamoId) throw new Error('Reclamo inválido.');
  if(!mensaje&&accion!=='CERRAR') throw new Error('Indica la acción, respuesta o antecedente.');

  // La derivación nunca solicita un correo manual. El área elegida resuelve
  // responsable, rol y correo desde el maestro central antes de modificar el caso.
  const destino=destinoArea?await obtenerDestinoReclamo(destinoArea):null;

  await agregarMovimientoReclamo({
    reclamoId,
    actor:u.nombre||u.username,
    actorRol:rol,
    accion,
    destinoRol:destino?destino.rol as RolReclamo:null,
    mensaje,
    estado,
    archivo:await archivoDesdeForm(fd),
  });

  if(destino){
    try{
      await notificarDerivacionReclamo({
        destino,
        reclamoId,
        actor:u.nombre||u.username,
        mensaje,
        estado,
      });
    }catch(error){
      console.error('RECLAMO_DERIVACION_SMTP_ERROR',{reclamoId,area:destino.area_key,error});
    }
  }

  revalidatePath('/admin-casino');
  revalidatePath('/coordinacion');
  revalidatePath('/gerencia');
  revalidatePath('/finanzas');
  revalidatePath('/reclamos-gestion');
}
