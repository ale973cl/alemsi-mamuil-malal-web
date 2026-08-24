import AppShell from '@/components/AppShell';
import PrintProductionReportButton from '@/components/PrintProductionReportButton';
import { requireUser } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';

export const dynamic='force-dynamic';

function fechaChile(date=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function fechaValida(value?:string){return Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value));}
function fechaVisible(iso:string){
  const [y,m,d]=iso.split('-'); return `${d}-${m}-${y}`;
}

export default async function Page({searchParams}:{searchParams:Promise<{fecha?:string}>}){
  const u=await requireUser(['Cocina','AdminCasino','AdminTotal']);
  const q=await searchParams;
  const fecha=fechaValida(q.fecha)?q.fecha!:fechaChile();
  const rows=await detalleProduccionFecha(fecha);
  const servicios=[...new Set(rows.map(r=>r.servicio))];
  const totalGeneral=rows.length;

  return <AppShell user={u}><div className="mx-auto max-w-5xl space-y-5 print:max-w-none print:space-y-3">
    <section className="rounded-2xl border bg-white p-5 print:border-0 print:p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 print:block">
        <div>
          <p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ALEMSI · PRODUCCIÓN</p>
          <h1 className="text-2xl font-black">Reporte diario de servicios</h1>
          <p className="text-sm text-[#6B7570]">Fecha: <b>{fechaVisible(fecha)}</b> · Total general: <b>{totalGeneral} raciones</b></p>
        </div>
        <div className="flex flex-wrap items-end gap-2 print:hidden">
          <form className="flex items-end gap-2">
            <label className="text-sm font-bold">Fecha<input type="date" name="fecha" defaultValue={fecha} className="mt-1 block rounded-lg border p-2"/></label>
            <button className="rounded-lg border px-3 py-2 font-bold">Consultar</button>
          </form>
          <PrintProductionReportButton/>
        </div>
      </div>
    </section>

    {!rows.length&&<section className="rounded-2xl border bg-white p-5"><p className="font-bold">No hay reservas activas con plato para esta fecha.</p></section>}

    {servicios.map(servicio=>{
      const sr=rows.filter(r=>r.servicio===servicio);
      const grupos=[...new Set(sr.map(r=>`${r.tipo_opcion||'Sin opción'}|||${r.plato}`))];
      return <section key={servicio} className="rounded-2xl border bg-white p-5 print:break-inside-avoid print:border print:p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b pb-2">
          <h2 className="text-xl font-black">{servicio}</h2>
          <span className="font-black">{sr.length} raciones</span>
        </div>
        <div className="space-y-4">{grupos.map(key=>{
          const [opcion,plato]=key.split('|||');
          const pr=sr.filter(r=>(r.tipo_opcion||'Sin opción')===opcion&&r.plato===plato);
          const instituciones=[...new Set(pr.map(r=>r.institucion))];
          return <article key={key} className="rounded-xl border print:break-inside-avoid">
            <div className="bg-[#F6F3EA] p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-[#6B7570]">{opcion}</div>
              <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black">{plato}</h3><div className="shrink-0 text-lg font-black">{pr.length}</div></div>
            </div>
            <div className="divide-y">{instituciones.map(inst=>{
              const personas=pr.filter(r=>r.institucion===inst);
              return <div key={inst} className="grid gap-1 p-3 sm:grid-cols-[170px_1fr_55px]">
                <div className="font-black">{inst}</div>
                <div className="text-sm">{personas.map(p=>p.nombre).join(', ')}</div>
                <div className="text-sm font-black sm:text-right">{personas.length}</div>
              </div>;
            })}</div>
          </article>;
        })}</div>
        <div className="mt-4 rounded-xl bg-[#F6F3EA] p-3">
          <div className="font-black">Resumen {servicio}</div>
          <div className="mt-2 grid gap-1 text-sm">{grupos.map(key=>{
            const [opcion,plato]=key.split('|||');
            const n=sr.filter(r=>(r.tipo_opcion||'Sin opción')===opcion&&r.plato===plato).length;
            return <div key={`res-${key}`} className="flex justify-between gap-3"><span>{opcion} · {plato}</span><b>{n}</b></div>;
          })}<div className="mt-1 flex justify-between border-t pt-2"><span className="font-black">TOTAL {servicio.toUpperCase()}</span><b>{sr.length}</b></div></div>
        </div>
      </section>;
    })}
  </div></AppShell>;
}
