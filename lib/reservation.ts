import crypto from "node:crypto";
import { db, query } from "@/lib/db";
import { consolidarDeudaPasada, ESTADO_MINUTA_PUBLICADA, reservaComercialHabilitada } from "@/lib/reglas/reserva";
import { epochHoraChile, fechaHoraVisibleChile } from '@/lib/fecha-hora';

export const SERVICE_HOURS: Record<string, number> = { Desayuno: 8, Almuerzo: 13, Once: 17, Cena: 20 };

export function cleanRut(value:string){ return (value||"").toUpperCase().replace(/[^0-9K]/g, ""); }
export function dbRut(value:string){ const r=cleanRut(value); return r.length>1 ? `${r.slice(0,-1)}-${r.slice(-1)}` : r; }
export function displayRut(value:string){
  const r=cleanRut(value); if(r.length<2) return value; const body=r.slice(0,-1); const dv=r.slice(-1);
  return `${Number(body).toLocaleString("es-CL")}-${dv}`;
}
export function validRut(value:string){
  const r=cleanRut(value); if(r.length<2) return false; const body=r.slice(0,-1); const dv=r.slice(-1);
  let sum=0,m=2; for(let i=body.length-1;i>=0;i--){ sum+=Number(body[i])*m; m=m===7?2:m+1; }
  const x=11-(sum%11); const expected=x===11?"0":x===10?"K":String(x); return expected===dv;
}
export function serviceDate(fecha:string, servicio:string){
  const hour=SERVICE_HOURS[servicio] ?? 12; return new Date(epochHoraChile(fecha,hour));
}
export function reservationDayCutoff(fecha:string,hours:number){
  const dayStart=epochHoraChile(fecha,0);
  const fullDays=Math.max(1,Math.ceil(Number(hours||0)/24));
  return dayStart-(fullDays-1)*24*3600_000;
}
export function isWithinCutoff(fecha:string,_servicio:string,hours:number){ return Date.now() < reservationDayCutoff(fecha,hours); }
export function maxConsecutive(fechas:string[]){
  const ds=[...new Set(fechas)].sort(); let best=0,cur=0,prev:number|null=null;
  for(const d of ds){ const t=new Date(`${d}T12:00:00Z`).getTime(); cur=prev!==null && t-prev===86400000?cur+1:1; best=Math.max(best,cur); prev=t; }
  return best;
}
export async function rules(){
  const defaults={anticipacion_reserva_horas:48,cancelacion_directa_horas:24,max_dias_consecutivos:7,excepciones_habilitadas:1};
  try{ const r=await query<any>(`SELECT anticipacion_reserva_horas,cancelacion_directa_horas,max_dias_consecutivos,excepciones_habilitadas FROM configuracion_reservas WHERE id=1 LIMIT 1`); return {...defaults,...(r[0]||{})}; }catch{return defaults;}
}
export async function personPrice(rut:string,institution:string){
  try{ const ex=await query<any>(`SELECT precio_especial,descripcion FROM excepciones_personas WHERE rut=$1 AND activa=1 LIMIT 1`,[dbRut(rut)]); if(ex[0]) return {price:Number(ex[0].precio_especial||0),label:`Excepción: ${ex[0].descripcion||""}`}; }catch{}
  try{ const inst=await query<any>(`SELECT precio_dia,precio_especial,regla_activa FROM instituciones WHERE nombre=$1 LIMIT 1`,[institution]); if(inst[0]) return {price:Number(inst[0].regla_activa&&inst[0].precio_especial!=null?inst[0].precio_especial:inst[0].precio_dia),label:`Institución ${institution}`}; }catch{}
  return {price:6400,label:`Institución ${institution}`};
}
export async function blockingDebt(rut:string){
  const lineas=await query<any>(`SELECT referencia_reserva,fecha,servicio,COALESCE(precio_aplicado,precio,0) AS monto_pendiente,COALESCE(NULLIF(TRIM(estado_pago),''),'Pendiente') AS estado FROM solicitudes WHERE rut=$1 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA' AND COALESCE(precio_aplicado,precio,0)>0 AND COALESCE(tipo_registro,'RESERVA_COMERCIAL')='RESERVA_COMERCIAL' AND LOWER(TRIM(COALESCE(estado_pago,'Pendiente'))) NOT IN ('pagado','no aplica','costo asumido','costo asumido / no cobrable') ORDER BY fecha,referencia_reserva,servicio,id`,[dbRut(rut)]);
  return consolidarDeudaPasada(lineas);
}
export function genReference(rut:string){ const stamp=fechaHoraVisibleChile().replace(/[- ·:]/g,'').slice(0,12); const rc=cleanRut(rut).slice(-5,-1)||"0000"; return `MM-${stamp}-${rc}-${crypto.randomInt(1000,10000)}`; }
export async function genPublicCode(){ const stamp=fechaHoraVisibleChile().replace(/[- ·:]/g,''); const prefix=`R-${stamp.slice(0,4)}-${stamp.slice(8,12)}-`; const rows=await query<any>(`SELECT codigo_reserva FROM solicitudes WHERE codigo_reserva LIKE $1 ORDER BY id DESC LIMIT 100`,[`${prefix}%`]).catch(()=>[]); const used=new Set(rows.map(r=>String(r.codigo_reserva))); for(let n=1;n<1000;n++){const c=`${prefix}${String(n).padStart(3,"0")}`;if(!used.has(c))return c;} return `${prefix}${String(Math.floor(Date.now()/1000)%1000).padStart(3,"0")}`; }
export function genVoucher(rut:string,serv:string,fecha:string){ return `${cleanRut(rut).slice(-4)}-${serv.slice(0,3).toUpperCase()}-${fecha.replaceAll("-","")}-${crypto.randomInt(100,1000)}`; }

export type ReservationChoice={fecha:string;servicio:string;plato:string;tipo_opcion?:string};
export async function saveReservation(input:{rut:string;choices:ReservationChoice[];method?:string}){
  const rut=dbRut(input.rut); const people=await query<any>(`SELECT * FROM comensales WHERE rut=$1 LIMIT 1`,[rut]); const person=people[0]; if(!person) throw new Error("Comensal no encontrado.");
  const institution=String(person.institucion||"Visitas"); const inst=institution.trim().toLocaleLowerCase("es-CL"); const alemType=inst==="alemsi"||inst==="alemsi paso fronterizo"?"paso":inst==="alemsi administrativos"?"administrativos":""; const isAlem=!!alemType; const coordinator=inst==="coordinadores";
  const r=await rules(); const dates=[...new Set(input.choices.map(x=>x.fecha))].sort(); if(!dates.length) throw new Error("No hay fechas seleccionadas.");
  if(!isAlem && !coordinator){ const debts=await blockingDebt(rut); if(debts.length) throw new Error("Existen pagos pendientes o rechazados que bloquean una nueva reserva."); }
  if(!isAlem && maxConsecutive(dates)>Number(r.max_dias_consecutivos)) throw new Error(`Máximo permitido: ${r.max_dias_consecutivos} días consecutivos.`);
  for(const c of input.choices){ if(!reservaComercialHabilitada(c.fecha,c.servicio,Number(r.anticipacion_reserva_horas))) throw new Error(`${c.servicio} del ${c.fecha} está fuera del plazo de reserva.`); }
  // Confirm every selected plate still belongs to an explicitly published menu row.
  for(const c of input.choices){ const ok=await query<any>(`SELECT id FROM minutas WHERE activo=1 AND estado=$4 AND fecha=$1 AND servicio=$2 AND plato=$3 LIMIT 1`,[c.fecha,c.servicio,c.plato,ESTADO_MINUTA_PUBLICADA]); if(!ok[0]) throw new Error(`El plato ${c.plato} ya no está disponible para ${c.fecha} · ${c.servicio}.`); }
  const price=await personPrice(rut,institution); let ref=genReference(rut); const publicCode=await genPublicCode(); const client=await db().connect(); const now=new Date().toISOString(); const method=coordinator?"Costo asumido · Coordinadores":isAlem?"Interno ALEMSI":String(input.method||"Transferencia bancaria");
  try{
    await client.query("BEGIN");
    const byDate=new Map<string,ReservationChoice[]>(); for(const c of input.choices){const a=byDate.get(c.fecha)||[];a.push(c);byDate.set(c.fecha,a);}
    for(const c of input.choices){
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,[`${rut}|${c.fecha}|${c.servicio}`]);
      const existing=(await client.query(`SELECT id,codigo,referencia_reserva FROM solicitudes WHERE rut=$1 AND fecha=$2 AND servicio=$3 AND COALESCE(estado_reserva,'ACTIVA')='ACTIVA' ORDER BY id DESC LIMIT 1 FOR UPDATE`,[rut,c.fecha,c.servicio])).rows[0];
      if(existing?.referencia_reserva) ref=String(existing.referencia_reserva);
      const lines=byDate.get(c.fecha)||[]; const idx=lines.findIndex(x=>x===c); const base=Math.floor(price.price/Math.max(lines.length,1)); const rest=price.price%Math.max(lines.length,1); const linePrice=isAlem?0:base+(idx<rest?1:0);
      const statusPay=isAlem?"No aplica":coordinator?"Costo asumido":"Pendiente"; const statusConsumption=isAlem?"Consumirá":"Pendiente"; const type=isAlem?"CONSUMO_INTERNO":coordinator?"CONSUMO_COORDINADOR":"RESERVA_COMERCIAL"; const voucher=isAlem?null:(existing?.codigo||genVoucher(rut,c.servicio,c.fecha));
      if(existing){
        if(!isWithinCutoff(c.fecha,c.servicio,48)) throw new Error(`${c.servicio} del ${c.fecha} ya no puede modificarse porque faltan menos de 48 horas.`);
        await client.query(`UPDATE solicitudes SET plato=$1,plato_reservado=$1,tipo_opcion=COALESCE($2,tipo_opcion),codigo=COALESCE(codigo,$3),precio=$4,precio_aplicado=$4,institucion=$5,correo=$6,metodo_pago=$7,estado_pago=$8,estado_consumo=$9,fecha_modificacion=$10,modificado_por=$11,referencia_reserva=$12,codigo_reserva=COALESCE(NULLIF(codigo_reserva,''),$13),tipo_registro=$14,estado_reserva='ACTIVA' WHERE id=$15`,[c.plato,c.tipo_opcion||null,voucher,linePrice,institution,person.correo||"",method,statusPay,statusConsumption,now,rut,ref,publicCode,type,existing.id]);
      }else{
        await client.query(`INSERT INTO solicitudes (rut,fecha,servicio,plato,plato_reservado,tipo_opcion,codigo,precio,precio_aplicado,institucion,correo,metodo_pago,estado_pago,estado_consumo,fecha_creacion,fecha_modificacion,modificado_por,referencia_reserva,codigo_reserva,tipo_registro,estado_reserva) VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$13,$1,$14,$15,$16,'ACTIVA')`,[rut,c.fecha,c.servicio,c.plato,c.tipo_opcion||null,voucher,linePrice,institution,person.correo||"",method,statusPay,statusConsumption,now,ref,publicCode,type]);
      }
    }
    let paymentToken="";
    if(!isAlem&&!coordinator){ paymentToken=crypto.randomBytes(32).toString("base64url"); await client.query(`UPDATE solicitudes SET pago_token=$1 WHERE referencia_reserva=$2`,[paymentToken,ref]); }
    await client.query("COMMIT");
    return {reference:ref,code:publicCode,total:isAlem?0:dates.length*price.price,paymentToken,isAlem,coordinator,email:String(person.correo||"")};
  }catch(e){ await client.query("ROLLBACK"); throw e; }finally{ client.release(); }
}
