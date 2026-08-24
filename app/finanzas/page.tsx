import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';
import { listarFinanzas } from '@/lib/db/finanzas';
import { estadoBandeja, type EstadoBandeja } from '@/lib/reglas/finanzas';
import { pagoAction, validarSinComprobanteAction } from './actions';

const estados=[['global','Todos'],['sin-comprobante','Sin comprobante'],['por-validar','Por validar'],['rechazados','Rechazados'],['validados','Validados']] as const;
export const dynamic='force-dynamic';

function hoyChile(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function esPagado(row:any){return ['PAGADO','APROBADO'].includes(String(row.estado_pago||'').trim().toUpperCase())||String(row.comprobante_estado||'').toUpperCase()==='VALIDADO'}

export default async function Page({searchParams}:{searchParams:Promise<{estado?:string;institucion?:string;q?:string;fecha?:string}>}){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const params=await searchParams;
  const rows=await listarFinanzas();
  const hoy=hoyChile();
  const fecha=String(params.fecha||hoy).trim();
  const estado=estados.some(([key])=>key===params.estado)?params.estado||'global':'global';
  const instituciones=[...new Set(rows.map((r:any)=>String(r.institucion||'').trim()).filter(Boolean))].sort();
  const q=String(params.q||'').trim().toLocaleLowerCase('es-CL');

  const base=rows.filter((row:any)=>{
    if(params.institucion&&row.institucion!==params.institucion) return false;
    if(q){
      const bolsa=[row.rut,row.nombre,row.codigo_reserva,row.institucion].map((v)=>String(v||'').toLocaleLowerCase('es-CL')).join(' ');
      if(!bolsa.includes(q)) return false;
    }
    if(estado!=='global'&&estadoBandeja(row)!==estado as EstadoBandeja) return false;
    return true;
  });

  const delDia=base.filter((r:any)=>String(r.fecha_reserva||'').slice(0,10)===fecha||(Array.isArray(r.servicios)?r.servicios:[]).some((s:any)=>String(s.fecha||'')===fecha));
  const totalReservado=delDia.reduce((sum:number,r:any)=>sum+Number(r.total||0),0);
  const sinComprobante=delDia.filter((r:any)=>estadoBandeja(r)==='sin-comprobante');
  const porValidar=delDia.filter((r:any)=>estadoBandeja(r)==='por-validar');
  const rechazados=delDia.filter((r:any)=>estadoBandeja(r)==='rechazados');
  const validados=delDia.filter((r:any)=>estadoBandeja(r)==='validados');
  const recaudado=validados.reduce((sum:number,r:any)=>sum+Number(r.total||0),0);
  const pendiente=delDia.filter((r:any)=>!esPagado(r)).reduce((sum:number,r:any)=>sum+Number(r.total||0),0);

  const qs=new URLSearchParams();
  qs.set('fecha',fecha); if(params.institucion) qs.set('institucion',params.institucion); if(params.q) qs.set('q',params.q); qs.set('estado',String(estado));

  return <AppShell user={u}><div className="space-y-5">
    <section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">FINANZAS</p><h1 className="text-2xl font-black text-[#0E2A23]">Bandeja financiera</h1><p className="mt-1 text-sm text-[#6B7570]">Una sola vista para reservas, comprobantes, saldo pendiente y recaudación. Validar libera al comensal; rechazar mantiene el bloqueo y permite corregir el comprobante.</p></section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {[['Reservado',totalReservado],['Pendiente',pendiente],['Recaudado',recaudado],['Reservas',delDia.length]].map(([label,value],i)=><div key={String(label)} className="rounded-2xl border bg-white p-4"><div className="text-sm text-[#6B7570]">{label}</div><div className="text-3xl font-black">{i<3?'$':''}{Number(value).toLocaleString('es-CL')}</div></div>)}
    </section>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Sin comprobante',sinComprobante.length],['Por validar',porValidar.length],['Rechazados',rechazados.length],['Validados',validados.length]].map(([l,v])=><div key={String(l)} className="rounded-xl border bg-white p-3"><div className="text-sm text-[#6B7570]">{l}</div><b className="text-2xl">{v}</b></div>)}</section>

    <section className="rounded-2xl border bg-white p-5">
      <form className="grid gap-3 lg:grid-cols-[160px_minmax(180px,.8fr)_minmax(220px,1.3fr)_auto] lg:items-end">
        <label className="text-sm font-bold">Fecha<input type="date" name="fecha" defaultValue={fecha} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
        <label className="text-sm font-bold">Institución<select name="institucion" defaultValue={params.institucion||''} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"><option value="">Todas las instituciones</option>{instituciones.map((nombre)=><option key={nombre}>{nombre}</option>)}</select></label>
        <label className="text-sm font-bold">Buscar por RUT, nombre o código de reserva<input name="q" defaultValue={params.q||''} placeholder="RUT, nombre o código" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"/></label>
        <div className="flex gap-2"><button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-bold text-white">Actualizar</button><Link href="/finanzas" className="rounded-lg border px-4 py-2 font-bold">Hoy</Link></div>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">{estados.map(([key,label])=>{const p=new URLSearchParams(qs);p.set('estado',key);return <Link key={key} href={`/finanzas?${p.toString()}`} className={`rounded-full border px-3 py-1.5 text-sm font-bold ${estado===key?'bg-[#0E2A23] text-white':'bg-white'}`}>{label}</Link>})}</div>
      <div className="mt-3 text-sm text-[#6B7570]">Mostrando <b>{delDia.length}</b> reservas relacionadas con la fecha seleccionada.</div>

      <div className="mt-5 space-y-3">{delDia.map((r:any)=>{
        const accionable=String(r.comprobante_estado||'').toUpperCase()==='RECIBIDO';
        const pagado=esPagado(r);
        return <details key={r.codigo_reserva} className="rounded-xl border border-[#A6B0AA]/30 p-4"><summary className="cursor-pointer list-none"><div className="grid gap-2 md:grid-cols-5"><div><b>{r.codigo_reserva}</b><div className="text-sm text-[#6B7570]">{r.nombre}</div></div><div className="text-sm">{r.institucion}</div><div className="text-sm">{r.primera_fecha} → {r.ultima_fecha}</div><div className="font-bold">${Number(r.total||0).toLocaleString('es-CL')}</div><div className="text-sm"><b>{estadoBandeja(r)==='por-validar'?'Por validar':estadoBandeja(r)==='sin-comprobante'?'Sin comprobante':estadoBandeja(r)==='rechazados'?'Rechazado':'Validado'}</b></div></div></summary>
        <div className="mt-4 border-t pt-4 text-sm"><dl className="grid gap-2 sm:grid-cols-2"><div><dt className="font-bold">RUT</dt><dd>{r.rut}</dd></div><div><dt className="font-bold">Código de reserva</dt><dd>{r.codigo_reserva}</dd></div><div><dt className="font-bold">Método de pago</dt><dd>{r.metodo_pago||'—'}</dd></div><div><dt className="font-bold">Estado financiero</dt><dd>{r.estado_pago||'Pendiente'}</dd></div><div><dt className="font-bold">Estado comprobante</dt><dd>{r.comprobante_estado||'Sin comprobante'}</dd></div><div><dt className="font-bold">Motivo reciente</dt><dd>{r.comprobante_motivo||r.motivo_estado_pago||'—'}</dd></div></dl>
        <h3 className="mt-4 font-black">Servicios reservados</h3><div className="mt-2 overflow-auto"><table className="w-full"><thead><tr className="text-left"><th>Fecha</th><th>Servicio</th><th>Plato / opción</th><th>Monto</th></tr></thead><tbody>{(r.servicios||[]).map((s:any)=><tr key={s.id} className="border-t"><td className="py-2">{s.fecha}</td><td>{s.servicio}</td><td>{s.plato} · {s.opcion||'—'}</td><td>${Number(s.monto||0).toLocaleString('es-CL')}</td></tr>)}</tbody></table></div>
        {r.comprobante_id&&<a className="mt-4 inline-block rounded-lg border px-4 py-2 font-bold underline" target="_blank" rel="noreferrer" href={`/api/finanzas/comprobante/${r.comprobante_id}`}>Ver comprobante</a>}
        {(r.comprobantes_historial||[]).length>0&&<div className="mt-4"><h3 className="font-black">Historial de comprobantes</h3><ul className="mt-2 space-y-1">{r.comprobantes_historial.map((h:any)=><li key={h.id}>{h.fecha} · <a className="underline" target="_blank" rel="noreferrer" href={`/api/finanzas/comprobante/${h.id}`}>{h.archivo}</a> · <b>{h.estado}</b>{h.motivo?` · ${h.motivo}`:''}</li>)}</ul></div>}
        {accionable&&<div className="mt-3 grid gap-2 lg:grid-cols-2"><form action={pagoAction}><input type="hidden" name="codigo" value={r.codigo_reserva}/><input type="hidden" name="estado" value="Pagado"/><button className="w-full rounded-lg bg-[#1DB954] px-4 py-2 font-bold">Validar comprobante</button></form><form action={pagoAction} className="grid gap-2"><input type="hidden" name="codigo" value={r.codigo_reserva}/><input type="hidden" name="estado" value="Rechazado"/><input name="motivo" required placeholder="Motivo obligatorio del rechazo" className="rounded-lg border px-3 py-2"/><button className="rounded-lg border border-[#9B2C2C] px-4 py-2 font-bold">Rechazar</button></form></div>}
        {!pagado&&!r.comprobante_id&&<details className="mt-4 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/5 p-3"><summary className="cursor-pointer font-black">Validar sin comprobante · marcha blanca</summary><form action={validarSinComprobanteAction} className="mt-3 grid gap-2 md:grid-cols-[220px_1fr_auto]"><input type="hidden" name="codigo" value={r.codigo_reserva}/><select name="medio" required defaultValue="" className="rounded-lg border bg-white px-3 py-2"><option value="" disabled>Medio de verificación</option><option>Cartola bancaria</option><option>Transferencia identificada</option><option>POS / débito</option><option>Validación administrativa</option><option>Otro medio verificable</option></select><input name="motivo" required placeholder="Detalle obligatorio de la verificación" className="rounded-lg border px-3 py-2"/><button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-black text-white">Marcar pagado y liberar RUT</button></form></details>}
        </div></details>})}
        {!delDia.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No hay registros que coincidan con la fecha y filtros seleccionados.</p>}
      </div>
    </section>
  </div></AppShell>;
}
