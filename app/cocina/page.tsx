import AppShell from '@/components/AppShell';
import CierreJornada from '@/components/CierreJornada';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import WeeklyMenuCalendar from '@/components/ui/WeeklyMenuCalendar';
import { requireUser } from '@/lib/auth/session';
import { demandaRango } from '@/lib/db/demanda';
import { minutasPeriodo } from '@/lib/db/admin';
import { demandaFecha, detalleJornada, jornada } from '@/lib/db/cocina';
import { iniciarAction } from './actions';
export const dynamic='force-dynamic';

function chileHoy(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}

export default async function Page({searchParams}:{searchParams:Promise<{fecha?:string}>}){
  const u=await requireUser(['Cocina','AdminCasino','AdminTotal']); const q=await searchParams;
  const fecha=q.fecha||chileHoy();
  const [rows,j,detalle,minuta,demanda]=await Promise.all([demandaFecha(fecha),jornada(fecha),detalleJornada(fecha),minutasPeriodo(fecha,fecha),demandaRango(fecha,fecha)]);
  const estado=String(j?.estado||'Pendiente');
  const total=rows.reduce((sum,row)=>sum+Number(row.reservadas||0),0);
  const almuerzo=rows.filter(r=>String(r.servicio).toLowerCase()==='almuerzo').reduce((s,r)=>s+Number(r.reservadas||0),0);
  const cena=rows.filter(r=>String(r.servicio).toLowerCase()==='cena').reduce((s,r)=>s+Number(r.reservadas||0),0);
  const instituciones=[...new Set(demanda.map(r=>r.institucion).filter(Boolean))];
  return <AppShell user={u}><div className="space-y-5">
    <PageHeader eyebrow="COCINA / PRODUCCIÓN" title="Jornada de producción" description="La minuta y la demanda activa son la base de trabajo del día." actions={<form><input type="date" name="fecha" defaultValue={fecha} className="rounded-xl border border-[#DDE5E2] bg-white p-2.5"/><button className="ml-2 rounded-xl bg-[#0B2B32] px-3 py-2.5 text-sm font-black text-white">Consultar</button></form>}/>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Almuerzos" value={almuerzo}/><StatCard label="Cenas" value={cena}/><StatCard label="Total raciones" value={total}/><StatCard label="Preparaciones" value={rows.length}/><StatCard label="Instituciones" value={instituciones.length} helper={instituciones.slice(0,3).join(' · ')}/></section>
    <SectionCard title="Minuta del día" description="Cada opción muestra la cantidad de reservas activas que llegan a Producción." actions={<StatusBadge value={estado}/>}><WeeklyMenuCalendar rows={minuta} demand={demanda}/></SectionCard>
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <SectionCard title="Preparaciones" description="Consolidado por servicio, opción y plato."><div className="grid gap-3 sm:grid-cols-2">{rows.map((r,i)=><div key={i} className="rounded-2xl border border-[#E5EBE8] bg-[#FFFDF9] p-4"><div className="text-xs font-extrabold uppercase tracking-[.08em] text-[#71807C]">{r.servicio} · {r.tipo_opcion||'—'}</div><div className="mt-1 font-black text-[#17352E]">{r.plato}</div><div className="mt-3 text-3xl font-black text-[#0B2B32]">{r.reservadas}</div><div className="text-xs font-bold text-[#667572]">porciones</div></div>)}</div>{!rows.length&&<div className="rounded-2xl bg-[#F6F8F7] p-5 text-sm text-[#667572]">No existe demanda activa para esta fecha.</div>}</SectionCard>
      <SectionCard title="Estado de jornada" description="Las acciones sensibles siguen requiriendo confirmación."><div className="mb-4"><StatusBadge value={estado}/></div>{estado==='Pendiente'&&<form action={iniciarAction} className="space-y-3"><input type="hidden" name="fecha" value={fecha}/><label className="flex items-start gap-2 rounded-xl bg-[#F5F8F6] p-3 text-sm font-bold"><input type="checkbox" name="confirmacion" required className="mt-1"/> Confirmo iniciar la jornada completa para {fecha}</label><button disabled={!rows.length} className="w-full rounded-xl bg-[#169B62] px-4 py-3 font-black text-white disabled:opacity-40">Iniciar jornada</button></form>}{estado==='En producción'&&<CierreJornada fecha={fecha} rows={detalle}/>} {estado==='Finalizado'&&<div className="rounded-xl bg-[#EFFAF3] p-4 font-bold text-[#176B42]">Jornada finalizada.</div>}</SectionCard>
    </div>
  </div></AppShell>;
}
