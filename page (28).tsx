import AppShell from '@/components/AppShell';
import CierreJornada from '@/components/CierreJornada';
import PageHeader from '@/components/ui/PageHeader';
import PrintButton from '@/components/ui/PrintButton';
import SectionCard from '@/components/ui/SectionCard';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import WeeklyMenuCalendar from '@/components/ui/WeeklyMenuCalendar';
import { requireUser } from '@/lib/auth/session';
import { demandaRango } from '@/lib/db/demanda';
import { minutasPeriodo } from '@/lib/db/admin';
import { demandaFecha, detalleJornada, jornada, requerimientoTeoricoFecha } from '@/lib/db/cocina';
import { formatFecha, formatPeriodo } from '@/lib/ui/format';
import { iniciarAction } from './actions';
export const dynamic='force-dynamic';

function chileHoy(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function addDays(iso:string,days:number){const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+days);return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}

export default async function Page({searchParams}:{searchParams:Promise<{fecha?:string}>}){
  const u=await requireUser(['Cocina','AdminCasino','AdminTotal']); const q=await searchParams;
  const fecha=q.fecha||chileHoy();
  const finPlan=addDays(fecha,3);
  const [rows,j,detalle,minutaPlan,demandaPlan,requerimientos]=await Promise.all([
    demandaFecha(fecha),jornada(fecha),detalleJornada(fecha),minutasPeriodo(fecha,finPlan),demandaRango(fecha,finPlan),requerimientoTeoricoFecha(fecha),
  ]);
  const estado=String(j?.estado||'Pendiente');
  const total=rows.reduce((sum,row)=>sum+Number(row.reservadas||0),0);
  const almuerzo=rows.filter(r=>String(r.servicio).toLowerCase()==='almuerzo').reduce((s,r)=>s+Number(r.reservadas||0),0);
  const cena=rows.filter(r=>String(r.servicio).toLowerCase()==='cena').reduce((s,r)=>s+Number(r.reservadas||0),0);
  const instituciones=[...new Set(demandaPlan.filter(r=>r.fecha===fecha).map(r=>r.institucion).filter(Boolean))];
  return <AppShell user={u}><div className="space-y-5">
    <PageHeader eyebrow="COCINA / PRODUCCIÓN" title="Planificación y jornada" description="Planifica hasta 72 horas con demanda viva. El cierre y el informe de producción quedan registrados día por día." actions={<form><input type="date" name="fecha" defaultValue={fecha} className="rounded-xl border border-[#DDE5E2] bg-white p-2.5"/><button className="ml-2 rounded-xl bg-[#0B2B32] px-3 py-2.5 text-sm font-black text-white">Consultar</button></form>}/>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Almuerzos" value={almuerzo} helper={formatFecha(fecha)}/><StatCard label="Cenas" value={cena}/><StatCard label="Total raciones" value={total}/><StatCard label="Preparaciones" value={rows.length}/><StatCard label="Instituciones" value={instituciones.length} helper={instituciones.slice(0,3).join(' · ')}/></section>

    <SectionCard title="Minuta y demanda · ventana 72 horas" description={`${formatPeriodo(fecha,finPlan)}. Las cantidades cambian mientras la reserva normal siga abierta; el inicio de producción usa la demanda vigente de cada día.`} actions={<div className="flex items-center gap-2"><StatusBadge value={estado}/><PrintButton/></div>}>
      <WeeklyMenuCalendar rows={minutaPlan} demand={demandaPlan}/>
    </SectionCard>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <SectionCard title={`Preparaciones · ${formatFecha(fecha)}`} description="Consolidado definitivo/actual por servicio, opción y plato."><div className="grid gap-3 sm:grid-cols-2">{rows.map((r,i)=><details key={i} className="rounded-2xl border border-[#E5EBE8] bg-[#FFFDF9] p-4"><summary className="cursor-pointer list-none"><div className="text-xs font-extrabold uppercase tracking-[.08em] text-[#71807C]">{r.servicio} · {r.tipo_opcion||'—'}</div><div className="mt-1 font-black text-[#17352E]">{r.plato}</div><div className="mt-3 text-3xl font-black text-[#0B2B32]">{r.reservadas}</div><div className="text-xs font-bold text-[#667572]">porciones · abrir receta</div></summary>{(()=>{const req=requerimientos.find(x=>x.servicio===r.servicio&&x.tipo_opcion===r.tipo_opcion&&x.plato===r.plato);return <div className="mt-3 border-t border-[#E5EBE8] pt-3 text-sm">{req?.insumos.length?<><div className="mb-2 font-black">Ingredientes teóricos para {req.porciones} porciones</div><ul className="space-y-1">{req.insumos.map(ins=><li key={ins.insumo} className="flex justify-between gap-3"><span>{ins.insumo}</span><b>{ins.cantidad.toFixed(2)}</b></li>)}</ul><p className="mt-2 text-xs text-[#667572]">Cálculo informativo. El descuento de inventario ocurre únicamente al iniciar producción.</p></>:<div className="rounded-xl bg-[#FFF8E8] p-3 text-[#805B16]">Este plato no tiene una receta activa/aprobada disponible.</div>}</div>})()}</details>)}</div>{!rows.length&&<div className="rounded-2xl bg-[#F6F8F7] p-5 text-sm text-[#667572]">No existe demanda activa para esta fecha.</div>}</SectionCard>
      <SectionCard title="Estado de jornada" description="El cierre es diario, aunque la planificación abarque 72 horas."><div className="mb-4"><StatusBadge value={estado}/></div>{estado==='Pendiente'&&<form action={iniciarAction} className="space-y-3"><input type="hidden" name="fecha" value={fecha}/><label className="flex items-start gap-2 rounded-xl bg-[#F5F8F6] p-3 text-sm font-bold"><input type="checkbox" name="confirmacion" required className="mt-1"/> Confirmo iniciar la jornada de {formatFecha(fecha)} con la demanda vigente.</label><button disabled={!rows.length} className="w-full rounded-xl bg-[#169B62] px-4 py-3 font-black text-white disabled:opacity-40">Iniciar jornada</button></form>}{estado==='En producción'&&<CierreJornada fecha={fecha} rows={detalle}/>} {estado==='Finalizado'&&<div className="rounded-xl bg-[#EFFAF3] p-4 font-bold text-[#176B42]">Jornada de {formatFecha(fecha)} finalizada. El cierre queda como informe histórico diario.</div>}</SectionCard>
    </div>
  </div></AppShell>;
}
