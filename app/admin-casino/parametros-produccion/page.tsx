import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { guardarParametrosProduccion, obtenerParametrosProduccion } from '@/lib/db/produccion-parametros';
import { fechaVisible } from '@/lib/fecha-hora';

export const dynamic='force-dynamic';

async function guardarAction(fd:FormData){
  'use server';
  const u=await requireUser(['AdminCasino','AdminTotal']);
  const margen=Number(String(fd.get('margen_produccion_pct')||'0').replace(',','.'));
  const merma=Number(String(fd.get('merma_promedio_pct')||'0').replace(',','.'));
  await guardarParametrosProduccion({margenProduccionPct:margen,mermaPromedioPct:merma},u.nombre||u.username);
  revalidatePath('/admin-casino/parametros-produccion');
  revalidatePath('/admin-casino');
  revalidatePath('/recetas');
  revalidatePath('/cocina');
  redirect('/admin-casino/parametros-produccion?guardado=1');
}

export default async function Page({searchParams}:{searchParams:Promise<{guardado?:string}>}){
  const u=await requireUser(['AdminCasino','AdminTotal']);
  const q=await searchParams;
  const p=await obtenerParametrosProduccion();
  return <AppShell user={u}><div className="space-y-5">
    <section className="rounded-2xl border bg-white p-5">
      <p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ADMIN CASINO · MAESTRO DE PRODUCCIÓN</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-black text-[#0E2A23]">Margen y merma</h1><p className="mt-1 max-w-3xl text-sm text-[#6B7570]">Estos parámetros son internos de producción. No modifican las reservas del comensal ni la minuta publicada; alimentan el cálculo de raciones e ingredientes para Cocina.</p></div><Link href="/admin-casino?tab=minuta" className="rounded-xl border px-4 py-2 text-sm font-black">Volver a Minuta</Link></div>
    </section>

    {q.guardado==='1'&&<div className="rounded-xl border border-[#0D9B91]/35 bg-[#E8F7F5] p-4 font-bold text-[#075E58]">Parámetros de producción guardados correctamente.</div>}

    <section className="rounded-2xl border bg-white p-5">
      <form action={guardarAction} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold">Margen de producción (%)<input name="margen_produccion_pct" type="number" min="0" max="100" step="0.01" required defaultValue={p.margen_produccion_pct} className="mt-1 block w-full rounded-lg border p-3 text-lg font-black"/><span className="mt-1 block text-xs font-normal text-[#6B7570]">Aumenta las raciones operativas. Ej.: 100 reservas + 5% = 105 raciones.</span></label>
        <label className="text-sm font-bold">Merma promedio (%)<input name="merma_promedio_pct" type="number" min="0" max="99.99" step="0.01" required defaultValue={p.merma_promedio_pct} className="mt-1 block w-full rounded-lg border p-3 text-lg font-black"/><span className="mt-1 block text-xs font-normal text-[#6B7570]">Ajusta la cantidad bruta necesaria de ingredientes según rendimiento.</span></label>
        <div className="md:col-span-2 rounded-xl bg-[#F6F3EA] p-4 text-sm"><b>Cálculo único:</b> reservas → margen de producción → receta estándar → merma → cantidad final requerida.</div>
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-[#6B7570]">Última actualización: {p.actualizado_at?fechaVisible(p.actualizado_at):'sin cambios registrados'}{p.actualizado_por?` · ${p.actualizado_por}`:''}</div><button className="rounded-xl bg-[#1DB954] px-5 py-3 font-black text-[#071814]">Guardar parámetros</button></div>
      </form>
    </section>
  </div></AppShell>;
}
