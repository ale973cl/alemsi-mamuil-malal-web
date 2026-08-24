import AppShell from '@/components/AppShell';
import CierreJornada from '@/components/CierreJornada';
import MinutaPublicada from '@/components/MinutaPublicada';
import { requireUser } from '@/lib/auth/session';
import { demandaFecha, detalleJornada, jornada } from '@/lib/db/cocina';
import { obtenerMinutasRango } from '@/lib/db/minutas';
import { iniciarAction } from './actions';

export const dynamic='force-dynamic';

function fechaChile(date=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function fechaValida(value?:string){return Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value))}

export default async function Page({searchParams}:{searchParams:Promise<{fecha?:string;inicio?:string;fin?:string}>}){
  const u=await requireUser(['Cocina','AdminCasino','AdminTotal']);
  const q=await searchParams;
  const hoy=fechaChile();
  const fecha=fechaValida(q.fecha)?q.fecha!:hoy;
  const finDefaultDate=new Date(); finDefaultDate.setDate(finDefaultDate.getDate()+6);
  const inicio=fechaValida(q.inicio)?q.inicio!:hoy;
  const fin=fechaValida(q.fin)&&q.fin!>=inicio?q.fin!:fechaChile(finDefaultDate);

  const [rows,j,detalle,minuta]=await Promise.all([
    demandaFecha(fecha),
    jornada(fecha),
    detalleJornada(fecha),
    obtenerMinutasRango(inicio,fin),
  ]);
  const estado=String(j?.estado||'Pendiente');
  const total=rows.reduce((sum,row)=>sum+Number(row.reservadas||0),0);

  return <AppShell user={u}><div className="space-y-5">
    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5">
      <p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">COCINA / PRODUCCIÓN</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-black">Producción del día</h1><p className="text-sm text-[#6B7570]">Reserva = demanda. Producción deduplica RUT + fecha + servicio. Bodega solo se descuenta al iniciar jornada.</p></div>
        <form className="flex items-end gap-2">
          <input type="hidden" name="inicio" value={inicio}/><input type="hidden" name="fin" value={fin}/>
          <label className="text-sm font-bold">Día de producción<input type="date" name="fecha" defaultValue={fecha} className="mt-1 block rounded-lg border p-2"/></label>
          <button className="rounded-lg border px-3 py-2 font-bold">Consultar</button>
        </form>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-[#F6F3EA] p-4"><span className="text-sm">Raciones</span><div className="text-3xl font-black">{total}</div></div><div className="rounded-xl bg-[#F6F3EA] p-4"><span className="text-sm">Preparaciones</span><div className="text-3xl font-black">{rows.length}</div></div><div className="rounded-xl bg-[#F6F3EA] p-4"><span className="text-sm">Jornada</span><div className="text-xl font-black">{estado}</div></div></div>
      <h2 className="mt-5 text-xl font-black">Reporte de demanda por servicio</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{rows.map((r,i)=><div key={i} className="rounded-xl border p-4"><div className="text-xs font-bold text-[#6B7570]">{r.servicio} · {r.tipo_opcion||'—'}</div><div className="font-black">{r.plato}</div><div className="mt-1 text-2xl font-black text-[#0E2A23]">{r.reservadas} porciones</div></div>)}</div>
      <div className="mt-5 rounded-xl bg-[#F6F3EA] p-4"><div className="font-bold">Estado de jornada: {estado}</div>{estado==='Pendiente'&&<form action={iniciarAction} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="fecha" value={fecha}/><label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"><input type="checkbox" name="confirmacion" required/> Confirmo iniciar la jornada completa</label><button className="rounded-lg bg-[#1DB954] px-4 py-2 font-bold">Iniciar jornada</button></form>}{estado==='En producción'&&<CierreJornada fecha={fecha} rows={detalle}/>} {estado==='Finalizado'&&<div className="mt-3 rounded-lg bg-[#1DB954]/10 p-3 font-bold">Jornada finalizada.</div>}</div>
    </section>

    <section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-black">Minuta oficial publicada · solo lectura</h2><p className="text-sm text-[#6B7570]">Consulta varios días sin cambiar la jornada de producción seleccionada arriba.</p></div>
        <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="fecha" value={fecha}/>
          <label className="text-sm font-bold">Desde<input type="date" name="inicio" defaultValue={inicio} className="mt-1 block rounded-lg border p-2"/></label>
          <label className="text-sm font-bold">Hasta<input type="date" name="fin" defaultValue={fin} className="mt-1 block rounded-lg border p-2"/></label>
          <button className="self-end rounded-lg border px-4 py-2 font-bold">Consultar minuta</button>
        </form>
      </div>
      <MinutaPublicada rows={minuta}/>
    </section>
  </div></AppShell>
}
