import { reclamoAction } from './actions';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { listarReclamosComensal } from '@/lib/db/reclamos';
import ComensalNav from '@/components/ComensalNav';

const fecha=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',dateStyle:'short',timeStyle:'short'}).format(d)};

export default async function Page({searchParams}:{searchParams:Promise<{ok?:string;folio?:string}>}){
  const q=await searchParams; const session=await getComensalSession();
  const recientes=session?await listarReclamosComensal(session.rut).catch(()=>[]):[];
  return <main className="min-h-screen bg-[#F6F3EA] px-4 py-8">
    <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ALEMSI</p><h1 className="text-2xl font-black">Reclamos, sugerencias y felicitaciones</h1></div><ComensalNav backHref="/reserva"/></div>
      {session&&<div className="rounded-xl bg-[#1DB954]/10 p-3 text-sm"><b>Sesión de comensal activa.</b> RUT {session.rut}. No necesitas ingresarlo nuevamente.</div>}
      {q.ok&&<div className="mt-4 rounded-xl border border-[#0D9B91]/30 bg-[#1DB954]/10 p-4"><div className="text-xs font-black uppercase tracking-[.12em] text-[#0D9B91]">Solicitud registrada</div><div className="mt-1 text-lg font-black">{q.folio||'Caso registrado'}</div><div className="mt-1 text-sm">Estado: <b>Pendiente de revisión</b>. Enviamos una copia a tu correo para seguimiento.</div></div>}
      <form action={reclamoAction} className="mt-5 space-y-3" encType="multipart/form-data">
        {session?<input type="hidden" name="rut" value={session.rut}/>:<input name="rut" required placeholder="RUT" className="w-full rounded-lg border p-3"/>}
        <select name="tipo" className="w-full rounded-lg border p-3"><option>Reclamo</option><option>Sugerencia</option><option>Felicitación</option></select>
        <select name="categoria" className="w-full rounded-lg border p-3"><option>Comida</option><option>Atención</option><option>Higiene</option><option>Infraestructura</option><option>Pago / deuda</option><option>Otro</option></select>
        <textarea name="mensaje" required className="min-h-32 w-full rounded-lg border p-3" placeholder="Mensaje"/>
        <label className="block min-w-0 overflow-hidden rounded-lg border bg-[#F6F3EA] p-3 text-sm font-bold">Adjuntar antecedentes (opcional)<input type="file" name="archivo" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-2 block max-w-full text-xs font-normal file:mr-2 file:rounded-lg file:border file:bg-white file:px-3 file:py-2 file:font-bold"/><span className="mt-2 block text-xs font-normal text-[#6B7570]">PDF o imagen, máximo 10 MB. El archivo quedará asociado al mismo folio.</span></label>
        <button className="w-full rounded-xl bg-[#1DB954] p-3 font-black">Enviar</button>
      </form>

      {session&&<section className="mt-7 border-t pt-5"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#0D9B91]">Seguimiento</p><h2 className="text-lg font-black">Mis reportes recientes</h2></div><span className="text-xs text-[#6B7570]">Solo tus casos</span></div>{!recientes.length?<p className="mt-3 rounded-xl bg-[#F7FAF8] p-3 text-sm">No tienes reportes anteriores.</p>:<div className="mt-3 space-y-2">{recientes.map(r=><details key={r.id} open={q.folio===`R-${String(r.id).padStart(6,'0')}`} className="rounded-xl border p-3"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>R-{String(r.id).padStart(6,'0')}</b><span className="ml-2 text-sm">{r.tipo} · {r.categoria}</span></div><span className="rounded-full bg-[#F6F3EA] px-2 py-1 text-xs font-black">{r.estado}</span></div><div className="mt-1 text-xs text-[#6B7570]">{fecha(r.fecha)}</div></summary><p className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm">{r.mensaje}</p></details>)}</div>}</section>}
    </div>
  </main>
}
