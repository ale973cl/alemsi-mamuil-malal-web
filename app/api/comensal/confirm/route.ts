import { NextResponse } from "next/server";
import { saveReservation } from "@/lib/reservation";
import { notificarReservaConfirmada } from "@/lib/email/notificaciones";

export async function POST(req:Request){
  try{
    const body=await req.json();
    const result=await saveReservation(body);
    const correo=result.email?await notificarReservaConfirmada({
      correo:result.email,
      codigo:result.code,
      referencia:result.reference,
      pagoToken:result.paymentToken,
      origin:new URL(req.url).origin,
      rut:String(body.rut||''),
      total:Number(result.total||0),
      method:String(body.method||'Transferencia bancaria'),
      choices:Array.isArray(body.choices)?body.choices:[],
    }):null;
    return NextResponse.json({ok:true,...result,correo});
  }catch(e:any){
    return NextResponse.json({error:e.message||"No fue posible guardar la reserva"},{status:400});
  }
}
