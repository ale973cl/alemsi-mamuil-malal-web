import AppShell from '@/components/AppShell';
import RevisionDia from '@/components/RevisionDia';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { requireUser } from '@/lib/auth/session';
import { flujosPendientes, minutaFlujo, resumenFlujos } from '@/lib/db/coordinacion';
import { finalizarAction } from './actions';
export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{flujo?:string}>}){
  const u=await requireUser(['Coordinacion','AdminTotal']);
  const q=await searchParams;
  const [pendientes,resumen]=await Promise.all([flujosPendientes(),resumenFlujos()]);
  const id=Number(q.flujo||pendientes[0]?.id||0);
  const data=id?await minutaFlujo(id):{flujo:null,minuta:[],revisiones:[]};
  const fechas=[...new Set(data.minuta.map((r:any)=>String(r.fecha)))];
  const completo=Boolean(data.flujo)&&fechas.every(f=>data.revisiones.filter((r:any)=>String(r.fecha)===f).length>=data.minuta.filter((r:any)=>String(r.fecha)===f).length);
  const counts=Object.fromEntries(resumen.map((r:any)=>[String(r.estado),Number(r.cantidad||0)]));
  return <AppShell user={u}><div className="space-y-5">
    <PageHeader eyebrow="COORDINACIÓN" title="Revisión de minutas" description="Revisa, observa o autoriza. La minuta oficial sigue siendo administrada por Casino."/>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Pendientes" value={pendientes.length} tone={pendientes.length?'warning':'success'}/><StatCard label="En revisión" value={counts.EN_REVISION||0}/><StatCard label="Observadas" value={counts.OBSERVADA||0}/><StatCard label="Autorizadas" value={counts.AUTORIZADA||0} tone="success"/></section>
    <SectionCard title="Minutas para revisar" description="Selecciona un período y revisa sus días. No se modifica la minuta desde esta vista.">
      {pendientes.length===0?<div className="rounded-2xl bg-[#EFFAF3] p-5 font-bold text-[#176B42]">No hay minutas pendientes de revisión.</div>:<>
        <form className="flex flex-wrap items-center gap-2"><select name="flujo" defaultValue={id} className="rounded-xl border border-[#DDE5E2] p-2.5 text-sm">{pendientes.map((f:any)=><option key={f.id} value={f.id}>{f.fecha_desde} → {f.fecha_hasta} · v{f.version}</option>)}</select><button className="rounded-xl bg-[#0B2B32] px-4 py-2.5 text-sm font-black text-white">Abrir período</button>{data.flujo&&<StatusBadge value={data.flujo.estado}/>}</form>
        <div className="mt-5 space-y-4">{fechas.map(fecha=><RevisionDia key={fecha} flujoId={id} fecha={fecha} rows={data.minuta.filter((r:any)=>String(r.fecha)===fecha)} prev={data.revisiones.filter((r:any)=>String(r.fecha)===fecha)}/>)}</div>
        <form action={finalizarAction} className="mt-5 rounded-2xl border border-[#DDE5E2] bg-[#F8FAF9] p-4"><input type="hidden" name="flujoId" value={id}/><button disabled={!completo} className="rounded-xl bg-[#169B62] px-5 py-3 font-black text-white disabled:opacity-40">Finalizar revisión completa</button>{!completo&&<span className="ml-3 text-sm text-[#667572]">Se habilita al revisar todos los días.</span>}</form>
      </>}
    </SectionCard>
  </div></AppShell>;
}
