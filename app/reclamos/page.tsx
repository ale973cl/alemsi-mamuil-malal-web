import { reclamoAction } from './actions';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { listarMisReclamos } from '@/lib/db/reclamos';
import ComensalNav from '@/components/ComensalNav';
import ReclamoSubmitButton from '@/components/ReclamoSubmitButton';
import CorreoSpamAviso from '@/components/CorreoSpamAviso';
import { fechaVisible } from '@/lib/fecha-hora';

export const dynamic='force-dynamic';

export default async function Page({searchParams}:{searchParams:Promise<{ok?:string;folio?:string}>}){
  const q=await searchParams; const session=await getComensalSession();
  const casos=session?await listarMisReclamos(session.rut):[];
  return <main className="min-h-screen bg-[#F6F3EA] px-4 py-8">
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-2xl border bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ALEMSI</p><h1 className="text-2xl font-black">Reclamos, sugerencias y felicitaciones</h1></div><ComensalNav backHref="/reserva"/></div>
        {session&&<div className="rounded-xl bg-[#1DB954]/10 p-3 text-sm"><b>Sesión de comensal activa.</b> RUT {session.rut}. No necesitas ingresarlo nuevamente.</div>}
        {q.ok&&<div className="mt-4 space-y-3"><div className="rounded-xl bg-[#1DB954]/10 p-3 font-bold">Mensaje registrado correctamente{q.folio?` · Folio ${q.folio}`:''}. Enviamos una copia a tu correo para seguimiento.</div><CorreoSpamAviso/></div>}
        <form key={q.folio||'nuevo'} action={reclamoAction} autoComplete="off" className="mt-5 space-y-3" encType="multipart/form-data">
          {session?<input type="hidden" name="rut" value={session.rut}/>:<input name="rut" required autoComplete="off" placeholder="RUT" className="w-full rounded-lg border p-3"/>}
          <select name="tipo" defaultValue="Reclamo" className="w-full rounded-lg border p-3"><option>Reclamo</option><option>Sugerencia</option><option>Felicitación</option></select>
          <select name="categoria" defaultValue="Comida" className="w-full rounded-lg border p-3"><option>Comida</option><option>Atención</option><option>Condiciones del recinto</option><option>Infraestructura</option><option>Pago / deuda</option><option>Otro</option></select>
          <textarea name="mensaje" required defaultValue="" autoComplete="off" className="min-h-32 w-full rounded-lg border p-3" placeholder="Mensaje"/>
          <label className="block min-w-0 overflow-hidden rounded-lg border bg-[#F6F3EA] p-3 text-sm font-bold">Adjuntar antecedentes (opcional)<input type="file" name="archivo" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-2 block w-full min-w-0 max-w-full text-xs font-normal sm:text-sm"/><span className="mt-1 block text-xs font-normal text-[#6B7570]">PDF o imagen, máximo 5 MB. El archivo quedará asociado al mismo folio.</span></label>
          <ReclamoSubmitButton/>
        </form>
      </section>

      {session&&<section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black text-[#0E2A23]">Seguimiento de mis casos</h2><p className="mt-1 text-sm text-[#6B7570]">Aquí puedes revisar el estado del mismo folio. Las notas internas de gestión no se muestran en el portal del comensal.</p><div className="mt-4 space-y-3">{casos.map((caso:any)=><article key={caso.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">R-{String(caso.id).padStart(6,'0')} · {caso.tipo}</div><span className="rounded-full bg-[#1DB954]/10 px-3 py-1 text-xs font-black text-[#0E2A23]">{caso.estado}</span></div><div className="mt-1 text-sm text-[#6B7570]">{caso.categoria} · ingresado {fechaVisible(caso.fecha)}</div><p className="mt-2 break-words text-sm">{caso.mensaje}</p>{Array.isArray(caso.movimientos)&&caso.movimientos.length>0&&<div className="mt-3 border-t pt-3"><div className="text-xs font-black uppercase tracking-wider text-[#6B7570]">Avances del caso</div><div className="mt-2 space-y-1">{caso.movimientos.map((m:any,index:number)=><div key={`${m.fecha}-${index}`} className="text-sm"><b>{m.estado||'En seguimiento'}</b> · {fechaVisible(m.fecha)}</div>)}</div></div>}</article>)}{!casos.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">Todavía no tienes reclamos, sugerencias o felicitaciones registrados.</p>}</div></section>}
    </div>
  </main>;
}
