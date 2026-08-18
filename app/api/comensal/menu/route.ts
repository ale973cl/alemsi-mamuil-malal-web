import { NextResponse } from "next/server"; import { dbRut, rules, isWithinCutoff } from "@/lib/reservation"; import { query } from "@/lib/db";
export async function GET(req:Request){try{const u=new URL(req.url);const rut=dbRut(u.searchParams.get("rut")||"");const from=u.searchParams.get("from")||"";const to=u.searchParams.get("to")||"";const p=(await query<any>(`SELECT institucion FROM comensales WHERE rut=$1 LIMIT 1`,[rut]))[0];if(!p)return NextResponse.json({error:"Comensal no encontrado"},{status:404});const inst=String(p.institucion||"").trim().toLocaleLowerCase("es-CL");const isAlem=inst==="alemsi"||inst==="alemsi paso fronterizo"||inst==="alemsi administrativos";const r=await rules();const rows=await query<any>(`SELECT fecha,dia_semana,servicio,tipo_opcion,plato FROM minutas WHERE activo=1 AND COALESCE(estado,'PUBLICABLE')='PUBLICABLE' AND fecha BETWEEN $1 AND $2 ORDER BY fecha,CASE servicio WHEN 'Desayuno' THEN 1 WHEN 'Almuerzo' THEN 2 WHEN 'Once' THEN 3 WHEN 'Cena' THEN 4 ELSE 5 END,id`,[from,to]);let filtered=rows.filter(x=>isWithinCutoff(String(x.fecha),String(x.servicio),isAlem?48:Number(r.anticipacion_reserva_horas)));
if(isAlem){
  const admin=inst==="alemsi administrativos";
  const allowed=admin
    ? new Set(["OPCION 1","OPCIÓN 1","OPCION 2","OPCIÓN 2","HIPOCALORICO","HIPOCALÓRICO","TIPO R"])
    : new Set(["OPCION 1","OPCIÓN 1","HIPOCALORICO","HIPOCALÓRICO","TIPO R"]);
  filtered=filtered.filter(x=>(!admin || String(x.servicio)==="Almuerzo") && allowed.has(String(x.tipo_opcion||"").trim().toUpperCase()));
}
return NextResponse.json({rows:filtered,rules:r,isAlem});}catch(e:any){return NextResponse.json({error:e.message||"No fue posible cargar la minuta"},{status:500})}}
