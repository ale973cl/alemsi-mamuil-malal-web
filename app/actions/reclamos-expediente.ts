'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { agregarMovimientoReclamo, obtenerDetalleReclamo, puedeGestionarReclamo, type RolReclamo } from '@/lib/db/reclamos';
import { notificarActualizacionReclamo, notificarDerivacionReclamo, obtenerDestinoReclamo, obtenerDestinoReclamoActual, obtenerRuteoReclamo } from '@/lib/reclamos-routing';

const ROLES:RolReclamo[]=['AdminCasino','AdminTotal','Coordinacion','Gerencia','Finanzas','Cocina'];
const ESTADO_POR_ACCION:Record<string,string>={
  SEGUIMIENTO:'En gestión',
  DERIVAR:'Derivado',
  RESPONDER:'Resuelto',
  SOLICITAR_ANTECEDENTES:'Pendiente',
  CERRAR:'Cerrado',
};

async function archivoDesdeForm(fd:FormData){
  const file=fd.get('archivo');
  if(!(file instanceof File)||file.size===0) return null;
  if(file.size>5*1024*1024) throw new Error('El archivo supera 5 MB.');
  const permitidos=['application/pdf','image/jpeg','image/png','image/webp'];
  if(!permitidos.includes(file.type)) throw new Error('Adjunta PDF, JPG, PNG o WEBP.');
  return {nombre:file.name||'antecedente',mime:file.type,bytes:new Uint8Array(await file.arrayBuffer())};
}

function retornoSeguro(valor:string,reclamoId:number,accion:string){
  const base=valor.startsWith('/admin-casino')||valor.startsWith('/reclamos-gestion')
    ? valor
    : `/reclamos-gestion?caso=${reclamoId}`;
  const separador=base.includes('?')?'&':'?';
  return `${base}${separador}guardado=${encodeURIComponent(accion)}`;
}

export async function movimientoReclamoAction(fd:FormData){
  const u=await requireUser(ROLES);
  const rol=u.rol as RolReclamo;
  const reclamoId=Number(fd.get('reclamo_id')||0);
  const accion=String(fd.get('accion')||'ACTUALIZAR').trim();
  const destinoArea=accion==='DERIVAR'?String(fd.get('destino_area')||'').trim():'';
  const mensaje=String(fd.get('mensaje')||'').trim();
  const estado=ESTADO_POR_ACCION[accion]||String(fd.get('estado')||'').trim()||undefined;
  const retorno=String(fd.get('retorno')||'').trim();
  if(!reclamoId) throw new Error('Reclamo inválido.');
  if(!mensaje&&accion!=='CERRAR') throw new Error('Indica la acción, respuesta o antecedente.');
  if(accion==='DERIVAR'&&!destinoArea) throw new Error('Selecciona el área de destino para derivar.');
  if(!(await puedeGestionarReclamo(reclamoId,rol))) throw new Error('Tu perfil no tiene permiso para gestionar este reclamo.');

  const caso=await obtenerDetalleReclamo(reclamoId);
  if(!caso) throw new Error('Reclamo no encontrado.');
  const destino=destinoArea?await obtenerDestinoReclamo(destinoArea):null;
  if(accion==='DERIVAR'&&!destino) throw new Error('El área seleccionada no tiene un responsable activo configurado.');
  const ruteo=await obtenerRuteoReclamo(String(caso.categoria||''));

  await agregarMovimientoReclamo({
    reclamoId,
    actor:u.nombre||u.username,
    actorRol:rol,
    accion,
    destinoRol:destino?destino.rol:null,
    mensaje,
    estado,
    archivo:await archivoDesdeForm(fd),
  });

  try{
    if(destino){
      await notificarDerivacionReclamo({destino,copias:ruteo.copias,reclamoId,actor:u.nombre||u.username,mensaje,estado});
    }else{
      const responsableActual=await obtenerDestinoReclamoActual(String(caso.area_actual||''));
      await notificarActualizacionReclamo({destino:responsableActual,copias:ruteo.copias,reclamoId,actor:u.nombre||u.username,accion,mensaje,estado});
    }
  }catch(error){console.error('RECLAMO_ACTUALIZACION_SMTP_ERROR',{reclamoId,accion,error});}

  revalidatePath('/admin-casino');
  revalidatePath('/coordinacion');
  revalidatePath('/gerencia');
  revalidatePath('/finanzas');
  revalidatePath('/cocina');
  revalidatePath('/reclamos-gestion');
  revalidatePath('/reclamos');

  redirect(retornoSeguro(retorno,reclamoId,accion));
}
