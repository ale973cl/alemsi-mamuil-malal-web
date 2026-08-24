import Link from 'next/link';
import { reclamoAction } from './actions';

export default async function Page({searchParams}:{searchParams:Promise<{ok?:string}>}){
  const q=await searchParams;
  return <main className="min-h-screen bg-[#F6F3EA] px-4 py-8">
    <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ALEMSI</p>
          <h1 className="text-2xl font-black">Reclamos, sugerencias y felicitaciones</h1>
        </div>
        <Link href="/reserva" className="shrink-0 rounded-lg border border-[#0E2A23]/20 bg-[#FFFDF8] px-3 py-2 text-sm font-black text-[#0E2A23]">← Volver</Link>
      </div>
      {q.ok&&<div className="mt-4 rounded-xl bg-[#1DB954]/10 p-3 font-bold">Mensaje registrado correctamente.</div>}
      <form action={reclamoAction} className="mt-5 space-y-3">
        <input name="rut" required placeholder="RUT" className="w-full rounded-lg border p-3"/>
        <select name="tipo" className="w-full rounded-lg border p-3"><option>Reclamo</option><option>Sugerencia</option><option>Felicitación</option></select>
        <select name="categoria" className="w-full rounded-lg border p-3"><option>Comida</option><option>Atención</option><option>Higiene</option><option>Infraestructura</option><option>Otro</option></select>
        <textarea name="mensaje" required className="min-h-32 w-full rounded-lg border p-3" placeholder="Mensaje"/>
        <button className="w-full rounded-xl bg-[#1DB954] p-3 font-black">Enviar</button>
      </form>
    </div>
  </main>
}
