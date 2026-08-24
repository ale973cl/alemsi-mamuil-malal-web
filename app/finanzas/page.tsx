import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';
import { listarFinanzas, resumenFinanzas } from '@/lib/db/finanzas';
import { estadoBandeja, type EstadoBandeja } from '@/lib/reglas/finanzas';
import { pagoAction } from './actions';

const filtros=[['global','Todos'],['sin-comprobante','Sin comprobante'],['por-validar','Por validar'],['observados','Observados'],['rechazados','Rechazados'],['validados','Validados']] as const;
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{estado?:string;institucion?:string;q?:string;desde?:string;hasta?:string}>}){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const params=await searchParams;
  const rows=await listarFinanzas();
  const k=resumenFinanzas(rows);
  const estado=filtros.some(([key])=>key===params.estado)?params.estado||'global':'global';
  const instituciones=[...new Set(rows.map((r:any)=>String(r.institucion||'').trim()).filter(Boolean))].sort();
  const q=String(params.q||'').trim().toLocaleLowerCase('es-CL');
  const desde=String(params.desde||'').trim();
  const hasta=String(params.hasta||'').trim();
  const visibles=rows.filter((row:any)=>{
    if(estado!=='global'&&estadoBandeja(row)!==estado as EstadoBandeja) return false;
    if(params.institucion&&row.institucion!==params.institucion) return false;
    const primera=String(row.primera_fecha||'');
    const ultima=String(row.ultima_fecha||'');
    if(desde&&ultima<desde) return false;
    if(hasta&&primera>hasta) return false;
    if(q){
      const bolsa=[row.rut,row.nombre,row.codigo_reserva,row.referencia_reserva,row.institucion]
        .map((v)=>String(v||'').toLocaleLowerCase('es-CL'))
        .join(' ');
      if(!bolsa.includes(q)) return false;
    }
    return true;
  });
  const filtroBase=`estado=${encodeURIComponent(String(estado))}${params.institucion?`&institucion=${encodeURIComponent(params.institucion)}`:''}${q?`&q=${encodeURIComponent(params.q||'')}`:''}${desde?`&desde=${encodeURIComponent(desde)}`:''}${hasta?`&hasta=${encodeURIComponent(hasta)}`:''}`;
  return <AppShell user={u}><div className="space-y-5">
    <section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">FINANZAS</p><h1 className="text-2xl font-black text-[#0E2A23]">Pagos y comprobantes</h1></section>
    <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">{[['Sin comprobante',k.pendientes],['Por validar',k.comprobantes],['Observados',k.observados],['Rechazados',k.rechazados],['Validados / pagados',k.validados]].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-4"><div className="text-sm text-[#6B7570]">{label}</div><div className="text-3xl font-black">{value}</div></div>)}</section>
    <section className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border bg-white p-4"><span className="text-sm">Monto pendiente</span><div className="text-2xl font-black">${k.monto_pendiente.toLocaleString('es-CL')}</div></div><div className="rounded-2xl border bg-white p-4"><span className="text-sm">Monto validado</span><div className="text-2xl font-black">${k.monto_validado.toLocaleString('es-CL')}</div></div></section>
    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-black">Bandeja financiera</h2><div className="mt-3 flex flex-wrap gap-2">{filtros.map(([key,label])=><Link key={key} href={`/finanzas?${filtroBase.replace(/estado=[^&]*/,`estado=${key}`)}`} className={`rounded-full border px-3 py-1.5 text-sm font-bold ${estado===key?'bg-[#0E2A23] text-white':'bg-white'}`}>{label}</Link>)}</div></div>
      </div>
      <form className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_minmax(160px,.8fr)_150px_150px_auto] lg:items-end">
        <input type="hidden" name="estado" value={estado}/>
        <label className="text-sm font-bold">Buscar por RUT, nombre, código o referencia<input name="q" defaultValue={params.q||''} placeholder="Ej. 13.287.071-3 o Pedro" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
        <label className="text-sm font-bold">Institución<select name="institucion" defaultValue={params.institucion||''} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"><option value="">Todas</option>{instituciones.map((nombre)=><option key={nombre}>{nombre}</option>)}</select></label>
        <label className="text-sm font-bold">Desde<input type="date" name="desde" defaultValue={desde} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
        <label className="text-sm font-bold">Hasta<input type="date" name="hasta" defaultValue={hasta} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
        <div className="flex gap-2"><button className="rounded-lg border px-4 py-2 font-bold">Filtrar</button><Link href="/finanzas" className="rounded-lg border px-4 py-2 font-bold">Limpiar</Link></div>
      </form>
      <div className="mt-3 text-sm text-[#6B7570]">Mostrando <b>{visibles.length}</b> de <b>{rows.length}</b> reservas activas cargadas en Finanzas.</div>
      <div className="mt-5 space-y-3">{visibles.map((r:any)=>{const accionable=String(r.comprobante_estado||'').toUpperCase()==='RECIBIDO';return <details key={r.referencia_reserva} className="rounded-xl border border-[#A6B0AA]/30 p-4"><summary className="cursor-pointer list-none"><div className="grid gap-2 md:grid-cols-4"><div><b>{r.codigo_reserva||r.referencia_reserva}</b><div className="text-sm text-[#6B7570]">{r.nombre} · {r.institucion}</div></div><div className="text-sm">{r.primera_fecha} → {r.ultima_fecha}</div><div className="font-bold">${Number(r.total||0).toLocaleString('es-CL')}</div><div className="text-sm"><b>{r.estado_pago||'Pendiente'}</b><br/>{r.comprobante_id?<span className="font-bold underline">Abrir detalle</span>:<strong className="text-[#9B2C2C]">Sin comprobante</strong>}</div></div></summary><div className="mt-4 border-t pt-4 text-sm"><dl className="grid gap-2 sm:grid-cols-2"><div><dt className="font-bold">RUT</dt><dd>{r.rut}</dd></div><div><dt className="font-bold">Referencia</dt><dd>{r.referencia_reserva}</dd></div><div><dt className="font-bold">Método de pago</dt><dd>{r.metodo_pago||'—'}</dd></div><div><dt className="font-bold">Estado financiero</dt><dd>{r.estado_pago||'Pendiente'}</dd></div><div><dt className="font-bold">Estado comprobante</dt><dd>{r.comprobante_estado||'Sin comprobante'}</dd></div><div><dt className="font-bold">Motivo reciente</dt><dd>{r.comprobante_motivo||r.motivo_estado_pago||'—'}</dd></div></dl><h3 className="mt-4 font-black">Servicios reservados</h3><div className="mt-2 overflow-auto"><table className="w-full"><thead><tr className="text-left"><th>Fecha</th><th>Servicio</th><th>Plato / opción</th><th>Monto</th></tr></thead><tbody>{(r.servicios||[]).map((servicio:any)=><tr key={servicio.id} className="border-t"><td className="py-2">{servicio.fecha}</td><td>{servicio.servicio}</td><td>{servicio.plato} · {servicio.opcion||'—'}</td><td>${Number(servicio.monto||0).toLocaleString('es-CL')}</td></tr>)}</tbody></table></div>{r.comprobante_id&&<a className="mt-4 inline-block rounded-lg border px-4 py-2 font-bold underline" target="_blank" rel="noreferrer" href={`/api/finanzas/comprobante/${r.comprobante_id}`}>Ver comprobante</a>}{(r.comprobantes_historial||[]).length>0&&<div className="mt-4"><h3 className="font-black">Historial de comprobantes</h3><ul className="mt-2 space-y-1">{r.comprobantes_historial.map((h:any)=><li key={h.id}>{h.fecha} · <a className="underline" target="_blank" rel="noreferrer" href={`/api/finanzas/comprobante/${h.id}`}>{h.archivo}</a> · <b>{h.estado}</b>{h.motivo?` · ${h.motivo}`:''}</li>)}</ul></div>}{accionable&&<div className="mt-3 grid gap-2 lg:grid-cols-3"><form action={pagoAction}><input type="hidden" name="ref" value={r.referencia_reserva}/><input type="hidden" name="estado" value="Pagado"/><button className="w-full rounded-lg bg-[#1DB954] px-4 py-2 font-bold">Validar</button></form><form action={pagoAction} className="grid gap-2"><input type="hidden" name="ref" value={r.referencia_reserva}/><input type="hidden" name="estado" value="Observado"/><input name="motivo" required placeholder="Motivo obligatorio de la observación" className="rounded-lg border px-3 py-2"/><button className="rounded-lg border border-[#D4AF37] px-4 py-2 font-bold">Observar</button></form><form action={pagoAction} className="grid gap-2"><input type="hidden" name="ref" value={r.referencia_reserva}/><input type="hidden" name="estado" value="Rechazado"/><input name="motivo" required placeholder="Motivo obligatorio del rechazo" className="rounded-lg border px-3 py-2"/><button className="rounded-lg border border-[#9B2C2C] px-4 py-2 font-bold">Rechazar</button></form></div>}</div></details>})}{!visibles.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No hay reservas que coincidan con estos filtros.</p>}</div>
    </section>
  </div></AppShell>;
}
