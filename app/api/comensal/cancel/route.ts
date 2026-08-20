import { NextResponse } from 'next/server';
import { cancelarServicio } from '@/lib/db/comensal-gestion';
export async function POST(req:Request){try{const b=await req.json();const ids=(b.ids||[]).map(Number).filter(Boolean);if(ids.length!==1)return NextResponse.json({error:'Cancela un servicio por operación.'},{status:400});await cancelarServicio(String(b.rut||''),ids[0],String(b.capacidad||''));return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No fue posible cancelar'},{status:400});}}
