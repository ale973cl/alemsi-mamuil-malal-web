import AppShell from '@/components/AppShell';
import MinutaPublicada from '@/components/MinutaPublicada';
import ReclamosGestion from '@/components/ReclamosGestion';
import RevisionDia from '@/components/RevisionDia';
import { requireUser } from '@/lib/auth/session';
import { flujosPendientes, minutaFlujo, resumenFlujos } from '@/lib/db/coordinacion';
import { listarReclamosParaRol } from '@/lib/db/reclamos';
import { resumenSatisfaccion } from '@/lib/db/satisfaccion';
import { finalizarAction } from './actions';

export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{flujo?:string}>}){
  const u=await requireUser(['Coordinacion','AdminTotal']);
  const q=await searchParams;
  const [pendientes,resumen,reclamos,satisfaccion]=await Promise.all([flujosPendientes(),resumenFlujos(),listarReclamosParaRol('Coordinacion'),resumenSatisfaccion()]);
  const id=Number(q.flujo||pendientes[0]?.id||0);
  const data=id?await minutaFlujo(id):{flujo:null,minuta:[],revisiones:[]};
  const fechas=[...new Set(data.minuta.map((r:any)=>String(r.fecha)))];
  const completo=Boolean(data.flujo)&&fechas.every(f=>data.revisiones.filter((r:any)=>String(r.fecha)===f).length>=data.minuta.filter((r:any)=>String(r.fecha)===f).length);
  return <AppShell user={u}><div className="space-y-5">
    <section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">COORDINACIÓN</p><h1 className="text-2xl font-black">Seguimiento operativo</h1><p className="text-sm text-[#6B7570]">Supervisión de minutas, reclamos y satisfacción, sin modificar pagos ni reservas.</p></section>
    <section className="grid gap-3 md:grid-cols-4">{resumen.map((r:any)=><div key={r.estado} className="rounded-2xl border bg-white p-4"><div className="text-sm text-[#6B7570]">{r.estado}</div><div className="text-3xl font-black">{r.cantidad}</div></div>)}<div className="rounded-2xl border bg-white p-4"><div className="text-sm text-[#6B7570]">Reclamos asignados</div><div className="text-3xl font-black">{reclamos.length}</div></div><div className="rounded-2xl border bg-white p-4"><div className="text-sm text-[#6B7570]">Satisfacción servicio</div><div className="text-3xl font-black">{satisfaccion.servicio||'—'}</div></div></section>
    {data.minuta.length>0&&<section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Minuta oficial publicada · solo lectura</h2><MinutaPublicada rows={data.minuta as any}/></section>}
    <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Reclamos para seguimiento</h2><ReclamosGestion rows={reclamos}/></section>
    <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Flujos de minuta pendientes</h2>{pendientes.length===0?<div className="mt-5 rounded-xl bg-[#1DB954]/10 p-4 font-bold">No hay minutas pendientes.</div>:<><form className="mt-4"><select name="flujo" defaultValue={id} className="rounded-lg border p-2">{pendientes.map((f:any)=><option key={f.id} value={f.id}>{f.fecha_desde} → {f.fecha_hasta} · v{f.version}</option>)}</select><button className="ml-2 rounded-lg border px-3 py-2 font-bold">Abrir</button></form><div className="mt-5 space-y-4">{fechas.map(fecha=><RevisionDia key={fecha} flujoId={id} fecha={fecha} rows={data.minuta.filter((r:any)=>String(r.fecha)===fecha)} prev={data.revisiones.filter((r:any)=>String(r.fecha)===fecha)}/>)}</div><form action={finalizarAction} className="mt-5"><input type="hidden" name="flujoId" value={id}/><button disabled={!completo} className="rounded-xl bg-[#1DB954] px-5 py-3 font-black disabled:opacity-40">Finalizar revisión completa</button></form></>}</section>
  </div></AppShell>;
}
