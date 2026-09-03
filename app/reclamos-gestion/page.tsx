import AppShell from '@/components/AppShell';
import { movimientoReclamoAction } from '@/app/actions/reclamos-expediente';
import { requireUser } from '@/lib/auth/session';
import { listarReclamosParaRol, type RolReclamo } from '@/lib/db/reclamos';

export const dynamic='force-dynamic';
const ROLES:RolReclamo[]=['AdminCasino','AdminTotal','Coordinacion','Gerencia','Finanzas'];
const DESTINOS:Record<RolReclamo,RolReclamo[]>={AdminCasino:['Coordinacion','Gerencia','Finanzas'],AdminTotal:['AdminCasino','Coordinacion','Gerencia','Finanzas'],Coordinacion:['AdminCasino','Gerencia'],Gerencia:['AdminCasino','Coordinacion','Finanzas'],Finanzas:['AdminCasino','Gerencia']};
const dato=(v:unknown)=>String(v??'').trim()||'No disponible';
const fecha=(v:unknown)=>{const d=new Date(String(v||''));return Number.isNaN(d.getTime())?dato(v):new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'medium',timeStyle:'short'}).format(d)};

export default async function Page({searchParams}:{searchParams:Promise<{caso?:string}>}){
  const u=await requireUser(ROLES); const rol=u.rol as RolReclamo; const q=await searchParams; const todos=await listarReclamosParaRol(rol);
  const casoId=Number(String(q.caso||'').replace(/\D/g,''));
  const rows=casoId?todos.filter((r:any)=>Number(r.id)===casoId):todos;
  return <AppShell user={u}><div className="space-y-4">
    <section className="rounded-2xl border bg-white p-5"><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">GESTIÓN DE EXPERIENCIA</p><h1 className="text-2xl font-black">Reclamos, sugerencias y felicitaciones</h1><p className="mt-1 text-sm text-[#6B7570]">Ficha única para todos los perfiles autorizados. Incluye referencia, datos del comensal, adjuntos e historial de gestión.</p>{casoId>0&&<a href="/reclamos-gestion" className="mt-3 inline-block rounded-lg border px-3 py-2 text-sm font-bold">← Ver todos los casos</a>}</section>
    {!rows.length&&<section className="rounded-2xl border bg-white p-5 text-sm font-bold">No hay casos disponibles para este perfil.</section>}
    {rows.map((r:any)=><article key={r.id} className="rounded-2xl border border-[#A6B0AA]/30 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black text-[#0D9B91]">R-{String(r.id).padStart(6,'0')} · {dato(r.tipo)}</p><h2 className="text-xl font-black">{dato(r.nombre)}</h2><p className="text-sm text-[#6B7570]">{dato(r.categoria)}</p></div><div className="rounded-full bg-[#F6F3EA] px-3 py-1 text-sm font-black">{dato(r.estado)}</div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-[11px] font-black uppercase text-[#6B7570]">RUT</div><div className="font-bold">{dato(r.rut)}</div></div>
        <div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-[11px] font-black uppercase text-[#6B7570]">Teléfono</div><div className="font-bold">{dato(r.telefono)}</div></div>
        <div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-[11px] font-black uppercase text-[#6B7570]">Correo</div><div className="break-all font-bold">{dato(r.correo)}</div></div>
        <div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-[11px] font-black uppercase text-[#6B7570]">Institución</div><div className="font-bold">{dato(r.institucion)}</div></div>
        <div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-[11px] font-black uppercase text-[#6B7570]">Referencia del caso</div><div className="font-bold">R-{String(r.id).padStart(6,'0')}</div></div>
        <div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-[11px] font-black uppercase text-[#6B7570]">Fecha / hora</div><div className="font-bold">{fecha(r.fecha)}</div></div>
        <div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-[11px] font-black uppercase text-[#6B7570]">Área actual</div><div className="font-bold">{dato(r.area_actual)}</div></div>
        <div className="rounded-xl bg-[#F7FAF8] p-3"><div className="text-[11px] font-black uppercase text-[#6B7570]">Última actualización</div><div className="font-bold">{r.fecha_actualizacion?fecha(r.fecha_actualizacion):'No disponible'}</div></div>
      </div>
      <div className="mt-4 rounded-xl border border-[#A6B0AA]/30 p-4"><div className="text-xs font-black uppercase text-[#6B7570]">Descripción completa</div><p className="mt-1 whitespace-pre-wrap text-sm">{dato(r.mensaje)}</p></div>
      {!!r.adjuntos?.length&&<div className="mt-4"><div className="text-xs font-black uppercase text-[#6B7570]">Adjuntos</div><div className="mt-2 flex flex-wrap gap-2">{r.adjuntos.map((a:any)=><a key={a.id} href={`/api/reclamos/adjuntos/${a.id}`} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm font-bold">{dato(a.nombre)}</a>)}</div></div>}
      {!!r.movimientos?.length&&<details className="mt-4 rounded-xl border border-[#A6B0AA]/30 p-3"><summary className="cursor-pointer font-black">Historial de gestión · {r.movimientos.length}</summary><div className="mt-3 space-y-2">{r.movimientos.map((m:any)=><div key={m.id} className="rounded-lg bg-[#F7FAF8] p-3 text-sm"><div className="font-black">{dato(m.accion)} · {dato(m.actor)}</div><div className="text-xs text-[#6B7570]">{fecha(m.fecha)}{m.destino_rol?` · Derivado a ${m.destino_rol}`:''}</div>{m.mensaje&&<p className="mt-1">{m.mensaje}</p>}</div>)}</div></details>}
      {r.estado!=='Cerrado'&&<form action={movimientoReclamoAction} encType="multipart/form-data" className="mt-4 grid gap-2 lg:grid-cols-[160px_170px_1fr_auto]"><input type="hidden" name="reclamo_id" value={r.id}/><select name="destino_rol" className="rounded-lg border p-2"><option value="">Mantener área</option>{DESTINOS[rol].map(x=><option key={x} value={x}>Derivar a {x}</option>)}</select><select name="estado" className="rounded-lg border p-2"><option value="En gestión">En gestión</option><option value="Pendiente">Pendiente</option><option value="Cerrado">Cerrar caso</option></select><input name="mensaje" placeholder="Respuesta, gestión o antecedente" className="rounded-lg border p-2"/><button className="rounded-lg bg-[#0B3B78] px-4 py-2 font-black text-white">Guardar gestión</button><input type="file" name="archivo" accept=".pdf,image/jpeg,image/png,image/webp" className="lg:col-span-4 text-sm"/></form>}
    </article>)}
  </div></AppShell>;
}
