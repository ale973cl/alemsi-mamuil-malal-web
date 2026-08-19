import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  await requireUser(['Finanzas','AdminTotal']);
  const {id}=await params;
  const rows=await query<{nombre_archivo:string;mime_type:string;contenido:Buffer}>(`SELECT nombre_archivo,mime_type,contenido FROM comprobantes_pago WHERE id=$1 LIMIT 1`,[Number(id)]);
  const r=rows[0]; if(!r||!r.contenido) return new NextResponse('No encontrado',{status:404});
  return new NextResponse(new Uint8Array(r.contenido),{headers:{'content-type':r.mime_type||'application/octet-stream','content-disposition':`inline; filename="${String(r.nombre_archivo||'comprobante').replace(/"/g,'')}"`}});
}
