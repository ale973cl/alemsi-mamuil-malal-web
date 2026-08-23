import { NextResponse } from "next/server"; import { saveReservation } from "@/lib/reservation";
export async function POST(req:Request){try{return NextResponse.json({ok:true,...await saveReservation(await req.json())});}catch(e:any){return NextResponse.json({error:e.message||"No fue posible guardar la reserva"},{status:400})}}
