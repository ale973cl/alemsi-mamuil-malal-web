import { cookies } from 'next/headers';
import { listarMisReservas } from '@/lib/db/comensal-gestion';
import { obtenerReglasReserva } from '@/lib/db/reservas';
import { cancelacionDirectaHabilitada } from '@/lib/reglas/reserva';
import { formatFecha, numeroReserva } from '@/lib/ui/format';
import { cancelarAction, salirComensalAction } from './actions';
export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{rut?:string}>}){
  const q=await searchParams; const jar=await cookies();
  const rut=q.rut||jar.get('alemsi_comensal_rut')?.value||'';
  let data:any=null,error='';
  if(rut){try{data=await listarMisReservas(rut)}catch(e){error=e instanceof Error?e.message:'Error'}}
  const reglas=await obtenerReglasReserva();
  return <main className="min-h-screen bg-[#F6F3EA] px-4 py-8"><div className="mx-auto max-w-5xl rounded-2xl border bg-white p-5">
    <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">COMENSAL</p><h1 className="text-2xl font-black">Mis reservas</h1></div><div className="flex gap-2"><a href="/reserva" className="rounded-lg border px-3 py-2 text-sm font-bold">Reservar</a><form action={salirComensalAction}><button className="rounded-lg border px-3 py-2 text-sm font-bold">Salir</button></form></div></div>
    {!rut&&<form className="mt-5 flex gap-2"><input name="rut" placeholder="RUT" className="min-h-11 flex-1 rounded-lg border px-3"/><button className="rounded-lg bg-[#1DB954] px-4 font-black">Consultar</button></form>}
    {rut&&<div className="mt-4 rounded-xl bg-[#F6F8F7] p-3 text-sm text-[#667572]">Sesión de comensal activa. No necesitas volver a ingresar tu RUT mientras continúes en el portal.</div>}
    {error&&<div className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
    {data&&<div className="mt-5 space-y-4">{data.cab.map((c:any)=><article key={c.referencia_reserva} className="rounded-xl border p-4"><div className="grid gap-2 md:grid-cols-4"><b>N.º de reserva {numeroReserva(c.codigo_reserva,c.referencia_reserva)}</b><span>{formatFecha(c.desde)} → {formatFecha(c.hasta)}</span><span>{c.servicios_activos} activos</span><span>{c.estado_pago}</span></div><div className="mt-3 space-y-2">{data.lineas.filter((r:any)=>r.referencia_reserva===c.referencia_reserva).map((r:any)=>{const activa=String(r.estado_reserva||'ACTIVA')==='ACTIVA';const directa=activa&&cancelacionDirectaHabilitada(String(r.fecha),String(r.servicio),Number(reglas.cancelacion_directa_horas));return <div key={r.id} className="grid gap-2 rounded-lg bg-[#F6F3EA] p-3 md:grid-cols-[110px_120px_1fr_120px_auto]"><span>{formatFecha(r.fecha)}</span><b>{r.servicio}</b><span>{r.plato_reservado}</span><span>{r.estado_reserva||'ACTIVA'}</span>{directa?<form action={cancelarAction}><input type="hidden" name="rut" value={rut}/><input type="hidden" name="id" value={r.id}/><button className="rounded-lg border border-[#D4AF37] px-3 py-1 font-bold">Cancelar</button></form>:<span className="text-xs text-[#6B7570]">{activa?'Fuera de ventana':'Histórico'}</span>}</div>})}</div></article>)}</div>}
  </div></main>;
}
