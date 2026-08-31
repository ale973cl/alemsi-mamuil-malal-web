import Link from 'next/link';
import AppShell from '@/components/AppShell';
import GestionReclamoAcciones from '@/components/GestionReclamoAcciones';
import { requireUser } from '@/lib/auth/session';
import { listarReclamosParaRol, obtenerDetalleReclamoParaRol, puedeGestionarReclamo, type RolReclamo } from '@/lib/db/reclamos';
import { fechaVisible } from '@/lib/fecha-hora';

export const dynamic='force-dynamic';
const ROLES=['AdminTotal','AdminCasino','Finanzas','Coordinacion','Gerencia','Cocina'] as const;

export default async function Page({searchParams}:{searchParams:Promise<{caso?:string;pagina?:string}>}){
  const u=await requireUser([...ROLES]);
  const rol=u.rol as RolReclamo;
  const params=await searchParams;
  const pagina=Math.max(1,Number(params.pagina||1));
  const reclamos=await listarReclamosParaRol(rol,pagina,25);
  const casoId=Number(params.caso||0);
  const caso=casoId>0?await obtenerDetalleReclamoParaRol(casoId,rol):null;
  const puedeGestionar=caso?await puedeGestionarReclamo(caso.id,rol):false;

  return <AppShell user={u}><div className="space-y-5">
    <section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">RECLAMOS</p><h1 className="text-2xl font-black text-[#0E2A23]">Bandeja operacional</h1><p className="mt-1 text-sm text-[#6B7570]">Solo aparecen los casos que tu perfil puede ver según la matriz central. Los casos asignados o derivados directamente a tu perfil quedan destacados.</p></section>
    <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(320px,.9fr)_minmax(0,1.4fr)]">
      <div className="space-y-2 rounded-2xl border bg-white p-4"><h2 className="font-black">Casos visibles</h2>{reclamos.map((r:any)=>{
        const propio=String(r.area_actual||'')===rol;
        const derivado=propio&&String(r.estado||'').toLocaleLowerCase('es-CL').includes('derivad');
        return <Link key={r.id} href={`/reclamos-gestion?caso=${r.id}&pagina=${pagina}`} className={`block min-w-0 rounded-xl border p-3 transition ${propio?'border-[#0D9B91] bg-[#E8F7F5] shadow-sm':'hover:bg-[#F6F3EA]'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">R-{String(r.id).padStart(6,'0')} · {r.tipo}</div>{propio&&<span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${derivado?'bg-[#D4AF37]/25 text-[#6D5200]':'bg-[#0D9B91]/15 text-[#075E58]'}`}>{derivado?'DERIVADO A TU PERFIL':'ASIGNADO A TU PERFIL'}</span>}</div>
          <div className="truncate text-sm">{r.nombre} · {r.categoria}</div><div className="text-xs text-[#6B7570]">{fechaVisible(r.fecha)} · {r.estado} · {r.area_actual}</div>
        </Link>})}{!reclamos.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No hay reclamos visibles para este perfil.</p>}<div className="flex justify-between pt-2"><Link href={`/reclamos-gestion?pagina=${Math.max(1,pagina-1)}`} className="rounded-lg border px-3 py-2 text-sm font-bold">Anterior</Link><Link href={`/reclamos-gestion?pagina=${pagina+1}`} className="rounded-lg border px-3 py-2 text-sm font-bold">Siguiente</Link></div></div>
      <div className="space-y-4">{caso?<><article className="min-w-0 rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black">R-{String(caso.id).padStart(6,'0')} · {caso.estado}</h2><span className="rounded-full bg-[#F6F3EA] px-3 py-1 text-xs font-black">Área actual: {caso.area_actual}</span></div><p className="mt-2 text-sm"><b>{caso.tipo} · {caso.categoria}</b></p><p className="mt-2 break-words text-sm">{caso.mensaje}</p><h3 className="mt-4 font-black">Trazabilidad</h3><div className="mt-2 space-y-2">{caso.movimientos.map((m:any)=><div key={m.id} className="rounded-lg bg-[#F6F3EA] p-3 text-sm"><div><b>{m.accion}</b> · {m.actor}</div><div className="text-xs text-[#6B7570]">{m.estado||'—'} · {m.destino_rol||'sin derivación'}</div>{m.mensaje&&<div className="mt-1">{m.mensaje}</div>}</div>)}</div><h3 className="mt-4 font-black">Adjuntos</h3><div className="mt-2 flex flex-wrap gap-2">{caso.adjuntos.map((a:any)=><a key={a.id} href={`/api/reclamos/adjuntos/${a.id}`} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-lg border px-3 py-2 text-sm underline">{a.nombre}</a>)}{!caso.adjuntos.length&&<span className="text-sm text-[#6B7570]">Sin adjuntos.</span>}</div></article>{puedeGestionar?<GestionReclamoAcciones/>:<div className="rounded-xl border border-dashed bg-white p-4 text-sm text-[#6B7570]">Tu perfil puede ver este expediente, pero no tiene permiso SOLUCIONAR para esta categoría.</div>}</>:<div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-[#6B7570]">Selecciona un reclamo de la bandeja para abrir su expediente.</div>}</div>
    </section>
  </div></AppShell>;
}
