import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';
import { generarProduccionPdf } from '@/lib/email/produccion-pdf';

export const dynamic='force-dynamic';
function validDate(v:string|null){return Boolean(v&&/^\d{4}-\d{2}-\d{2}$/.test(v));}

export async function GET(req:Request){
  const user=await getSession();
  if(!user||!['Cocina','AdminCasino','AdminTotal','Gerencia'].includes(user.rol)) return NextResponse.json({error:'No autorizado'},{status:401});
  const fecha=new URL(req.url).searchParams.get('fecha');
  if(!validDate(fecha)) return NextResponse.json({error:'Fecha inválida'},{status:400});
  const rows=await detalleProduccionFecha(fecha!);
  const bytes=await generarProduccionPdf(fecha!,rows);
  const filename=`ALEMSI-Produccion-${fecha}.pdf`;
  return new NextResponse(bytes,{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${filename}"`,'Cache-Control':'no-store'}});
}
