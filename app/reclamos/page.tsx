import { reclamoAction } from './actions';
import { getComensalSession } from '@/lib/auth/comensal-session';
import ComensalNav from '@/components/ComensalNav';

export default async function Page({searchParams}:{searchParams:Promise<{ok?:string;folio?:string}>}){
  const q=await searchParams; const session=await getComensalSession();
  return <main className="min-h-screen bg-[#F6F3EA] px-4 py-8">
    <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ALEMSI</p><h1 className="text-2xl font-black">Reclamos, sugerencias y felicitaciones</h1></div><ComensalNav backHref="/reserva"/></div>
      {session&&<div className="rounded-xl bg-[#1DB954]/10 p-3 text-sm"><b>Sesión de comensal activa.</b> RUT {session.rut}. No necesitas ingresarlo nuevamente.</div>}
      {q.ok&&<div className="mt-4 rounded-xl bg-[#1DB954]/10 p-3 font-bold">Mensaje registrado correctamente{q.folio?` · Folio ${q.folio}`:''}. Enviamos una copia a tu correo para seguimiento.</div>}
      <form action={reclamoAction} className="mt-5 space-y-3" encType="multipart/form-data">
        {session?<input type="hidden" name="rut" value={session.rut}/>:<input name="rut" required placeholder="RUT" className="w-full rounded-lg border p-3"/>}
        <select name="tipo" className="w-full rounded-lg border p-3"><option>Reclamo</option><option>Sugerencia</option><option>Felicitación</option></select>
        <select name="categoria" className="w-full rounded-lg border p-3"><option>Comida</option><option>Atención</option><option>Higiene</option><option>Infraestructura</option><option>Pago / deuda</option><option>Otro</option></select>
        <textarea name="mensaje" required className="min-h-32 w-full rounded-lg border p-3" placeholder="Mensaje"/>
        <label className="block rounded-lg border bg-[#F6F3EA] p-3 text-sm font-bold">Adjuntar antecedentes (opcional)<input type="file" name="archivo" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-2 block w-full font-normal"/><span className="mt-1 block text-xs font-normal text-[#6B7570]">PDF o imagen, máximo 10 MB. El archivo quedará asociado al mismo folio.</span></label>
        <button className="w-full rounded-xl bg-[#1DB954] p-3 font-black">Enviar</button>
      </form>
    </div>
  </main>
}
