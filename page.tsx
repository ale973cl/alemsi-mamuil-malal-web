import AppShell from '@/components/AppShell';
import DemandDayCards from '@/components/ui/DemandDayCards';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { requireUser } from '@/lib/auth/session';
import { dashboardGerencia } from '@/lib/db/gerencia';
import { formatFechaHora, formatPeriodo } from '@/lib/ui/format';

export const dynamic='force-dynamic';
function chileIso(d:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function periodo(key:string){const now=new Date();const y=now.getFullYear(),m=now.getMonth();let start=new Date(y,m,1),end=new Date(y,m+1,0);if(key==='anterior'){start=new Date(y,m-1,1);end=new Date(y,m,0)}else if(key==='3m'){start=new Date(y,m-2,1)}else if(key==='6m'){start=new Date(y,m-5,1)}else if(key==='anio'){start=new Date(y,0,1);end=new Date(y,11,31)}return [chileIso(start),chileIso(end)] as const}

export default async function Page({searchParams}:{searchParams:Promise<{periodo?:string;inicio?:string;fin?:string}>}){
  const u=await requireUser(['Gerencia','AdminTotal']); const q=await searchParams;
  const key=['mes','anterior','3m','6m','anio','personalizado'].includes(String(q.periodo))?String(q.periodo):'mes';
  const base=periodo(key); const inicio=key==='personalizado'&&q.inicio?q.inicio:base[0]; const fin=key==='personalizado'&&q.fin?q.fin:base[1];
  const d=await dashboardGerencia(inicio,fin); const v=d.valorizacion||{};
  const rechazados=d.pagos.filter((r:any)=>String(r.estado||'').toLowerCase().includes('rechaz')).reduce((s:number,r:any)=>s+Number(r.cantidad||0),0);
  return <AppShell user={u}><div className="space-y-5">
    <PageHeader eyebrow="GERENCIA · CONSULTA" title="Resumen ejecutivo" description={`Una sola fuente de verdad · ${formatPeriodo(inicio,fin)}`} actions={<form className="flex flex-wrap items-end gap-2"><select name="periodo" defaultValue={key} className="rounded-xl border border-[#DDE5E2] bg-white p-2.5 text-sm"><option value="mes">Este mes</option><option value="anterior">Mes anterior</option><option value="3m">Últimos 3 meses</option><option value="6m">Últimos 6 meses</option><option value="anio">Año</option><option value="personalizado">Personalizado</option></select><input type="date" name="inicio" defaultValue={inicio} className="rounded-xl border border-[#DDE5E2] bg-white p-2.5 text-sm"/><input type="date" name="fin" defaultValue={fin} className="rounded-xl border border-[#DDE5E2] bg-white p-2.5 text-sm"/><button className="rounded-xl bg-[#0B2B32] px-3 py-2.5 text-sm font-black text-white">Aplicar</button></form>}/>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Reservas" value={Number(d.resumen.reservas||0)} helper={formatPeriodo(inicio,fin)}/><StatCard label="Raciones" value={Number(d.resumen.raciones||0)}/><StatCard label="Pendientes de validación" value={Number(v.pagos_por_validar||0)} helper={`$${Number(v.pendiente_validacion||0).toLocaleString('es-CL')}`}/><StatCard label="Total recaudado" value={`$${Number(v.recaudado||0).toLocaleString('es-CL')}`} tone="success"/><StatCard label="Pendiente por recaudar" value={`$${Number(v.pendiente_recaudar||0).toLocaleString('es-CL')}`} tone={Number(v.pendiente_recaudar||0)?'warning':'success'}/></section>

    <div className="grid gap-5 xl:grid-cols-3">
      <SectionCard title="Valorización del período" description="Costo del servicio prestado, aunque no exista cobro individual."><div className="space-y-2"><div className="flex justify-between rounded-2xl bg-[#F6F8F7] p-3"><span className="font-bold">Costo asumido total</span><b>${Number(v.costo_asumido||0).toLocaleString('es-CL')}</b></div><div className="flex justify-between rounded-2xl bg-[#F6F8F7] p-3"><span>Personal ALEMSI</span><b>${Number(v.costo_alemsi||0).toLocaleString('es-CL')}</b></div><div className="flex justify-between rounded-2xl bg-[#F6F8F7] p-3"><span>Coordinación</span><b>${Number(v.costo_coordinacion||0).toLocaleString('es-CL')}</b></div></div></SectionCard>
      <SectionCard title="Estados de pago"><div className="space-y-2">{d.pagos.map((r:any)=><div key={r.estado} className="flex items-center justify-between rounded-2xl bg-[#F6F8F7] p-3"><div><StatusBadge value={r.estado}/><div className="mt-1 text-xs text-[#667572]">{r.cantidad} registro(s)</div></div><div className="font-black">${Number(r.monto||0).toLocaleString('es-CL')}</div></div>)}</div></SectionCard>
      <SectionCard title="Producción"><div className="space-y-2">{d.jornadas.map((r:any)=><div key={r.estado} className="flex items-center justify-between rounded-2xl bg-[#F6F8F7] p-3"><StatusBadge value={r.estado}/><div className="font-black">{r.cantidad}</div></div>)}{!d.jornadas.length&&<div className="text-sm text-[#667572]">Sin jornadas registradas.</div>}<div className="mt-3 rounded-xl bg-[#FFF8E8] p-3 text-sm"><b>Pagos rechazados:</b> {rechazados}</div></div></SectionCard>
    </div>
    <SectionCard title="Demanda del período" description="Una tarjeta por día; almuerzo y cena permanecen juntos dentro del mismo recuadro."><DemandDayCards rows={d.produccion}/></SectionCard>
    <SectionCard title="Actividad del sistema" description="Auditoría disponible bajo demanda; no ocupa el inicio ejecutivo."><details className="rounded-2xl border border-[#E5EBE8] p-4"><summary className="cursor-pointer font-black text-[#27423B]">Ver última actividad</summary><div className="mt-3 space-y-2 text-sm">{d.auditoria.map((r:any,i:number)=><div key={i} className="border-b border-[#EDF1EF] pb-2"><b>{r.accion}</b> · {r.usuario} · {formatFechaHora(r.fecha)}</div>)}</div></details></SectionCard>
  </div></AppShell>;
}
