import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';
import { dashboardBodega } from '@/lib/db/bodega';

export const dynamic='force-dynamic';
export default async function Page(){
  const u=await requireUser(['Bodega','AdminTotal']);
  const d=await dashboardBodega();
  return <AppShell user={u}><div className="space-y-5"><section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">BODEGA</p><h1 className="text-2xl font-black">Inventario y stock</h1><p className="text-sm text-[#6B7570]">Portal de consulta. Este perfil no inicia ni cierra jornadas de producción.</p></section><section className="grid gap-3 md:grid-cols-3">{[['Lotes',d.resumen.lotes],['Lotes con stock',d.resumen.lotes_con_stock],['Sin stock',d.resumen.sin_stock]].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-5"><div className="text-sm text-[#6B7570]">{label}</div><div className="text-3xl font-black">{String(value||0)}</div></div>)}</section><section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Reporte de inventario / Bodega</h2><div className="mt-3 overflow-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th>Artículo</th><th>Stock</th><th>Caducidad</th></tr></thead><tbody>{d.inventario.map((r:any)=><tr key={r.id} className="border-t"><td className="py-2 font-bold">{r.nombre_articulo}</td><td>{r.stock}</td><td>{r.caduca||'—'}</td></tr>)}</tbody></table></div></section></div></AppShell>;
}
