import AppShell from '@/components/AppShell';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { requireUser } from '@/lib/auth/session';
import { dashboardGerencia } from '@/lib/db/gerencia';

export const dynamic='force-dynamic';
export default async function Page(){
  const u=await requireUser(['Gerencia','AdminTotal']);
  const d=await dashboardGerencia();
  const pendiente=d.pagos.filter((r:any)=>!['pagado','no aplica','costo asumido','costo asumido / no cobrable'].includes(String(r.estado||'').toLowerCase())).reduce((s:number,r:any)=>s+Number(r.monto||0),0);
  const rechazados=d.pagos.filter((r:any)=>String(r.estado||'').toLowerCase().includes('rechaz')).reduce((s:number,r:any)=>s+Number(r.cantidad||0),0);
  return <AppShell user={u}><div className="space-y-5">
    <PageHeader eyebrow="GERENCIA · CONSULTA" title="Resumen ejecutivo" description="Indicadores derivados de la misma base de reservas, pagos y producción. Esta vista no modifica la operación."/>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Reservas próximas" value={Number(d.resumen.reservas||0)}/><StatCard label="Raciones próximas" value={Number(d.resumen.raciones||0)}/><StatCard label="Monto pendiente" value={`$${pendiente.toLocaleString('es-CL')}`} tone={pendiente?'warning':'success'}/><StatCard label="Pagos rechazados" value={rechazados} tone={rechazados?'danger':'default'}/></section>
    <div className="grid gap-5 xl:grid-cols-3">
      <SectionCard title="Estados de pago"><div className="space-y-2">{d.pagos.map((r:any)=><div key={r.estado} className="flex items-center justify-between rounded-2xl bg-[#F6F8F7] p-3"><div><StatusBadge value={r.estado}/><div className="mt-1 text-xs text-[#667572]">{r.cantidad} registro(s)</div></div><div className="font-black">${Number(r.monto||0).toLocaleString('es-CL')}</div></div>)}</div></SectionCard>
      <SectionCard title="Producción"><div className="space-y-2">{d.jornadas.map((r:any)=><div key={r.estado} className="flex items-center justify-between rounded-2xl bg-[#F6F8F7] p-3"><StatusBadge value={r.estado}/><div className="font-black">{r.cantidad}</div></div>)}{!d.jornadas.length&&<div className="text-sm text-[#667572]">Sin jornadas registradas.</div>}</div></SectionCard>
      <SectionCard title="Minutas"><div className="space-y-2">{d.minutas.map((r:any)=><div key={r.estado} className="flex items-center justify-between rounded-2xl bg-[#F6F8F7] p-3"><StatusBadge value={r.estado}/><div className="font-black">{r.cantidad}</div></div>)}</div></SectionCard>
    </div>
    <SectionCard title="Demanda próxima" description="Consolidado por fecha y servicio. Abre los módulos operativos solo desde los perfiles autorizados."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{d.produccion.slice(0,16).map((r:any,i:number)=><div key={i} className="rounded-2xl border border-[#E5EBE8] bg-[#FFFDF9] p-4"><div className="text-xs font-black uppercase tracking-[.08em] text-[#71807C]">{r.fecha}</div><div className="mt-1 font-black text-[#17352E]">{r.servicio}</div><div className="mt-3 text-3xl font-black text-[#0B2B32]">{r.cantidad}</div><div className="text-xs text-[#667572]">raciones</div></div>)}</div></SectionCard>
    <SectionCard title="Actividad del sistema" description="Auditoría disponible bajo demanda; no ocupa el inicio ejecutivo."><details className="rounded-2xl border border-[#E5EBE8] p-4"><summary className="cursor-pointer font-black text-[#27423B]">Ver última actividad</summary><div className="mt-3 space-y-2 text-sm">{d.auditoria.map((r:any,i:number)=><div key={i} className="border-b border-[#EDF1EF] pb-2"><b>{r.accion}</b> · {r.usuario} · {r.fecha}</div>)}</div></details></SectionCard>
  </div></AppShell>;
}
