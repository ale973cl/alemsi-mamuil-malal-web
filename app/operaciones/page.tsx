import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';
import { resumenAdmin } from '@/lib/db/admin';
import { demandaFecha } from '@/lib/db/cocina';

export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{fecha?:string}>}){
  const u=await requireUser(['Operaciones','AdminTotal']);
  const q=await searchParams; const fecha=q.fecha||new Date().toISOString().slice(0,10);
  const [resumen,demanda]=await Promise.all([resumenAdmin(),demandaFecha(fecha)]);
  return <AppShell user={u}><div className="space-y-5"><section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">OPERACIONES</p><h1 className="text-2xl font-black">Demanda operativa</h1><p className="text-sm text-[#6B7570]">Consulta de reservas y raciones. Sin inicio o cierre de producción.</p></section><section className="grid gap-3 md:grid-cols-3">{[['Reservas futuras',resumen.reservas],['Raciones futuras',resumen.raciones],['Raciones del día',demanda.reduce((sum,row)=>sum+Number(row.reservadas||0),0)]].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-5"><div className="text-sm text-[#6B7570]">{label}</div><div className="text-3xl font-black">{String(value||0)}</div></div>)}</section><section className="rounded-2xl border bg-white p-5"><div className="flex items-end justify-between"><h2 className="text-xl font-black">Reporte de raciones</h2><form><input type="date" name="fecha" defaultValue={fecha} className="rounded-lg border p-2"/><button className="ml-2 rounded-lg border px-3 py-2 font-bold">Consultar</button></form></div><div className="mt-3 space-y-2">{demanda.map((r,i)=><div key={i} className="grid gap-2 rounded-xl bg-[#F6F3EA] p-3 md:grid-cols-4"><b>{r.servicio}</b><span>{r.tipo_opcion||'—'}</span><span>{r.plato}</span><b>{r.reservadas} raciones</b></div>)}</div></section></div></AppShell>;
}
