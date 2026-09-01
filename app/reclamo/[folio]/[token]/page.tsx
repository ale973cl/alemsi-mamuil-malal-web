import { notFound } from 'next/navigation';
import { obtenerReclamoConsultaPublica } from '@/lib/reclamos-consulta';
import { fechaHoraVisibleChile } from '@/lib/fecha-hora';

export const dynamic='force-dynamic';

function accion(v:string){return String(v||'').replaceAll('_',' ').toLocaleLowerCase('es-CL').replace(/^./,c=>c.toUpperCase());}
function final(v:string){const e=String(v||'').trim().toLocaleLowerCase('es-CL');return e==='cerrado'||e==='resuelto';}

export default async function Page({params}:{params:Promise<{folio:string;token:string}>}){
  const p=await params;
  const caso=await obtenerReclamoConsultaPublica(p.folio,p.token);
  if(!caso) notFound();
  const movimientos=Array.isArray(caso.movimientos)?caso.movimientos:[];
  const folio=`R-${String(caso.id).padStart(6,'0')}`;
  return <main className="min-h-screen bg-[#F4F6F5] px-4 py-8 text-[#14232D] sm:px-6">
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="rounded-2xl border border-[#D7E1DC] bg-white p-5 shadow-sm">
        <p className="text-xs font-extrabold tracking-[.18em] text-[#0D9B91]">ALEMSI · CONSULTA DE RECLAMO</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-black text-[#0B2D5B]">{folio}</h1><p className="mt-1 text-sm text-[#5B6670]">Vista segura de solo lectura. Este enlace muestra únicamente este expediente.</p></div><span className={`rounded-full px-3 py-1 text-sm font-black ${final(caso.estado)?'bg-[#DDF4EA] text-[#087A46]':'bg-[#FFF3CD] text-[#7A5A00]'}`}>{caso.estado}</span></div>
      </header>

      <section className="rounded-2xl border border-[#D7E1DC] bg-white p-5"><h2 className="text-lg font-black text-[#0B2D5B]">Antecedentes del caso</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-xs font-bold text-[#6B7570]">Ingresado</div><div className="font-black">{fechaHoraVisibleChile(new Date(caso.fecha))}</div></div><div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-xs font-bold text-[#6B7570]">Tipo / categoría</div><div className="font-black">{caso.tipo} · {caso.categoria}</div></div><div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-xs font-bold text-[#6B7570]">Comensal</div><div className="font-black">{caso.nombre}</div><div className="text-sm text-[#5B6670]">RUT {caso.rut}</div></div><div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-xs font-bold text-[#6B7570]">Responsable / área actual</div><div className="font-black">{caso.area_actual||'—'}</div>{caso.actualizado_por&&<div className="text-sm text-[#5B6670]">Última gestión: {caso.actualizado_por}</div>}</div></div><div className="mt-4 rounded-xl border border-[#D7E1DC] bg-white p-4"><div className="text-xs font-bold uppercase tracking-wide text-[#6B7570]">Reclamo original</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{caso.mensaje}</p></div></section>

      <section className="rounded-2xl border border-[#D7E1DC] bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-black text-[#0B2D5B]">Registro de actividad</h2><p className="text-sm text-[#5B6670]">Trazabilidad cronológica del expediente.</p></div><a href="" className="rounded-lg border border-[#0D9B91] px-3 py-2 text-sm font-black text-[#0D9B91]">Actualizar estado</a></div><div className="mt-4 space-y-3">{movimientos.map((m:any)=><article key={m.id} className="rounded-xl border border-[#D7E1DC] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-black">{accion(m.accion)}</div><div className="text-sm text-[#5B6670]">{m.actor}{m.actor_rol?` · ${m.actor_rol}`:''}{m.destino_rol?` → ${m.destino_rol}`:''}</div></div><div className="text-right text-xs text-[#6B7570]">{m.fecha?fechaHoraVisibleChile(new Date(m.fecha)):'—'}{m.estado&&<div className="mt-1 font-black text-[#087A46]">{m.estado}</div>}</div></div>{m.mensaje&&<div className="mt-3 rounded-lg bg-[#F7FAF8] p-3 text-sm whitespace-pre-wrap">{m.mensaje}</div>}</article>)}{!movimientos.length&&<div className="rounded-xl bg-[#F7FAF8] p-4 text-sm font-bold">Aún no existen movimientos registrados.</div>}</div></section>

      <footer className="px-2 text-center text-xs text-[#6B7570]">Enlace confidencial de consulta. No entrega acceso al portal ALEMSI ni a otros reclamos.</footer>
    </div>
  </main>;
}
