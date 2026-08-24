import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { obtenerAdjuntoReclamo } from '@/lib/db/reclamos';

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const u=await getSession();
  if(!u||!['AdminCasino','AdminTotal','Coordinacion','Gerencia','Finanzas'].includes(u.rol)) return new NextResponse('No autorizado',{status:401});
  const {id}=await params;
  const a=await obtenerAdjuntoReclamo(Number(id));
  if(!a) return new NextResponse('Archivo no encontrado',{status:404});
  const body=Uint8Array.from(a.contenido);
  return new NextResponse(body,{headers:{'content-type':a.mime_type||'application/octet-stream','content-disposition':`inline; filename="${String(a.nombre_archivo||'archivo').replaceAll('"','')}"`,'cache-control':'private, no-store'}});
}
