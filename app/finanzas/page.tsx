import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';
import { listarFinanzas, resumenFinanzas } from '@/lib/db/finanzas';
import { pagoAction } from './actions';

export const dynamic='force-dynamic';
export default async function Page(){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const rows=await listarFinanzas();
  const k=resumenFinanzas(rows);
  return <AppShell user={u}><div className="space-y-5">
    <section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">FINANZAS</p><h1 className="text-2xl font-black text-[#0E2A23]">Pagos y comprobantes</h1></section>
    <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{[['Sin comprobante',k.pendientes],['Por validar',k.comprobantes],['Rechazados',k.rechazados],['Validados / pagados',k.validados]].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-4"><div className="text-sm text-[#6B7570]">{label}</div><div className="text-3xl font-black">{value}</div></div>)}</section>
    <section className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border bg-white p-4"><span className="text-sm">Monto pendiente</span><div className="text-2xl font-black">${k.monto_pendiente.toLocaleString('es-CL')}</div></div><div className="rounded-2xl border bg-white p-4"><span className="text-sm">Monto validado</span><div className="text-2xl font-black">${k.monto_validado.toLocaleString('es-CL')}</div></div></section>
    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><h2 className="text-xl font-black">Reporte financiero de reservas</h2><div className="mt-5 space-y-3">{rows.map((r:any)=><article key={r.referencia_reserva} className="rounded-xl border border-[#A6B0AA]/30 p-4"><div className="grid gap-2 md:grid-cols-4"><div><b>{r.codigo_reserva||r.referencia_reserva}</b><div className="text-sm text-[#6B7570]">{r.nombre} · {r.institucion}</div></div><div className="text-sm">{r.primera_fecha} → {r.ultima_fecha}</div><div className="font-bold">${Number(r.total||0).toLocaleString('es-CL')}</div><div className="text-sm"><b>{r.estado_pago||'Pendiente'}</b><br/>{r.comprobante_id?<a className="font-bold text-[#0E2A23] underline" target="_blank" rel="noreferrer" href={`/api/finanzas/comprobante/${r.comprobante_id}`}>Ver comprobante</a>:<strong className="text-[#9B2C2C]">Sin comprobante</strong>}</div></div>{r.comprobante_id&&<div className="mt-3 grid gap-2 md:grid-cols-2"><form action={pagoAction}><input type="hidden" name="ref" value={r.referencia_reserva}/><input type="hidden" name="estado" value="Pagado"/><button className="w-full rounded-lg bg-[#1DB954] px-4 py-2 font-bold">Validar</button></form><form action={pagoAction} className="grid gap-2 md:grid-cols-[1fr_auto]"><input type="hidden" name="ref" value={r.referencia_reserva}/><input type="hidden" name="estado" value="Rechazado"/><input name="motivo" required placeholder="Motivo obligatorio del rechazo" className="rounded-lg border px-3 py-2"/><button className="rounded-lg border border-[#D4AF37] px-4 py-2 font-bold">Rechazar</button></form></div>}</article>)}</div></section>
  </div></AppShell>;
}
