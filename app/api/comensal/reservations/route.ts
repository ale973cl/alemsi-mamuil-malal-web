import { NextResponse } from 'next/server';
import { listarMisReservas } from '@/lib/db/comensal-gestion';
import { obtenerReglasReserva } from '@/lib/db/reservas';
import { cancelacionDirectaHabilitada } from '@/lib/reglas/reserva';
export async function GET(req:Request){try{const u=new URL(req.url);const data=await listarMisReservas(u.searchParams.get('rut')||'',u.searchParams.get('codigo')||'');const rules=await obtenerReglasReserva();return NextResponse.json({rows:data.lineas.map(x=>({...x,cancelable:String(x.estado_reserva||'ACTIVA')==='ACTIVA'&&cancelacionDirectaHabilitada(String(x.fecha),String(x.servicio),Number(rules.cancelacion_directa_horas))})),rules});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Error'},{status:400});}}
