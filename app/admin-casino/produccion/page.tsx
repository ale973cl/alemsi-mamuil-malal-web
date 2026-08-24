import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';

export const dynamic = 'force-dynamic';

function fechaChile(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function fechaValida(value?: string) { return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value)); }
function fechaVisible(iso: string) {
  const [y,m,d]=iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d)));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const u = await requireUser(['AdminCasino', 'AdminTotal']);
  const params = await searchParams;
  const fecha = fechaValida(params.fecha) ? params.fecha! : fechaChile();
  const rows = await detalleProduccionFecha(fecha);
  const servicios=[...new Set(rows.map(r=>r.servicio))];
  const totalRaciones=rows.length;
  const instituciones=new Set(rows.map(r=>r.institucion)).size;
  const preparaciones=new Set(rows.map(r=>`${r.servicio}|${r.tipo_opcion}|${r.plato}`)).size;

  return <AppShell user={u}><div className="space-y-5">
    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ADMIN CASINO · PRODUCCIÓN</p><h1 className="text-2xl font-black text-[#0E2A23]">Supervisión de producción</h1><p className="mt-1 text-sm text-[#6B7570]">Misma demanda que ve Cocina, agrupada por servicio, plato, institución y comensal.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/admin-casino?tab=resumen" className="rounded-lg border px-4 py-2 text-sm font-black">← Admin Casino</Link><Link href="/admin-casino?tab=minuta" className="rounded-lg bg-[#0E2A23] px-4 py-2 text-sm font-black text-white">Minuta</Link></div>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2"><label className="text-sm font-bold">Día de producción<input type="date" name="fecha" defaultValue={fecha} className="mt-1 block rounded-lg border p-2" /></label><button className="rounded-lg border px-4 py-2 font-bold">Consultar</button><span className="rounded-lg bg-[#F6F3EA] px-3 py-2 text-sm font-bold capitalize">{fechaVisible(fecha)}</span></form>
        <Link href={`/produccion/reporte?fecha=${encodeURIComponent(fecha)}&origen=admin`} className="rounded-lg bg-[#0D9B91] px-4 py-2 text-sm font-black text-white">Ver reporte diario →</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#F6F3EA] p-4"><span className="text-sm text-[#6B7570]">Raciones</span><div className="text-3xl font-black">{totalRaciones}</div></div><div className="rounded-xl bg-[#F6F3EA] p-4"><span className="text-sm text-[#6B7570]">Preparaciones</span><div className="text-3xl font-black">{preparaciones}</div></div><div className="rounded-xl bg-[#F6F3EA] p-4"><span className="text-sm text-[#6B7570]">Instituciones</span><div className="text-3xl font-black">{instituciones}</div></div></div>
    </section>

    {servicios.map(servicio=>{
      const servicioRows=rows.filter(r=>r.servicio===servicio);
      const platos=[...new Set(servicioRows.map(r=>`${r.tipo_opcion}|||${r.plato}`))];
      return <section key={servicio} className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5">
        <div className="flex items-center justify-between gap-3 border-b border-[#A6B0AA]/20 pb-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#1DB954]">Servicio</p><h2 className="text-2xl font-black text-[#0E2A23]">{servicio}</h2></div><div className="rounded-full bg-[#1DB954]/10 px-4 py-2 font-black text-[#0E2A23]">{servicioRows.length} raciones</div></div>
        <div className="mt-4 space-y-4">{platos.map(key=>{
          const [opcion,plato]=key.split('|||');
          const platoRows=servicioRows.filter(r=>r.tipo_opcion===opcion&&r.plato===plato);
          const insts=[...new Set(platoRows.map(r=>r.institucion))];
          return <article key={key} className="overflow-hidden rounded-2xl border border-[#A6B0AA]/30"><div className="bg-[#F6F3EA] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><span className="text-[11px] font-black uppercase tracking-wider text-[#6B7570]">{opcion||'Sin opción'}</span><h3 className="mt-1 text-lg font-black leading-snug text-[#071814] sm:text-xl">{plato}</h3></div><div className="shrink-0 rounded-xl bg-white px-4 py-2 text-center"><div className="text-2xl font-black text-[#0E2A23]">{platoRows.length}</div><div className="text-[10px] font-bold uppercase text-[#6B7570]">raciones</div></div></div></div><div className="divide-y divide-[#A6B0AA]/20">{insts.map(inst=>{const personas=platoRows.filter(r=>r.institucion===inst);return <div key={inst} className="grid gap-2 p-4 sm:grid-cols-[180px_1fr_auto] sm:items-start"><div className="font-black text-[#0E2A23]">{inst}</div><div className="text-sm leading-6 text-[#4A5550]">{personas.map(p=>p.nombre).join(', ')}</div><div className="text-sm font-black text-[#0E2A23]">{personas.length}</div></div>})}</div></article>
        })}</div>
      </section>;
    })}
    {!rows.length&&<section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-6 text-center"><h2 className="font-black text-[#0E2A23]">Sin producción para este día</h2><p className="mt-1 text-sm text-[#6B7570]">No existen reservas activas con plato para la fecha seleccionada.</p></section>}
  </div></AppShell>;
}
