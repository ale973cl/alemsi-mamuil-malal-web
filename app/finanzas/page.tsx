import Link from 'next/link';
import Script from 'next/script';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';
import { listarFinanzas } from '@/lib/db/finanzas';
import { estadoBandeja } from '@/lib/reglas/finanzas';
import { pagoAction, solicitarInformacionPagoAction, validarSinComprobanteAction } from './actions';

const estados=[
  ['global','Todos'],
  ['pendientes','Pendientes / por recaudar'],
  ['sin-comprobante','Sin comprobante'],
  ['por-validar','Comprobantes por validar'],
  ['rechazados','Rechazados'],
  ['validados','Validados'],
] as const;

export const dynamic='force-dynamic';

function hoyChile(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function mesActualChile(){const hoy=hoyChile();const [y,m]=hoy.split('-');const last=new Date(Date.UTC(Number(y),Number(m),0)).getUTCDate();return{desde:`${y}-${m}-01`,hasta:`${y}-${m}-${String(last).padStart(2,'0')}`}}
function esPagado(row:any){return ['PAGADO','APROBADO'].includes(String(row.estado_pago||'').trim().toUpperCase())||String(row.comprobante_estado||'').toUpperCase()==='VALIDADO'}
function esCobrable(row:any){const estado=String(row.estado_pago||'Pendiente').trim().toUpperCase();return !['NO APLICA','COSTO ASUMIDO','COSTO ASUMIDO / NO COBRABLE'].includes(estado)&&Number(row.total||0)>0}
function servicios(row:any){return Array.isArray(row.servicios)?row.servicios:[]}
function fechaEnRango(fecha:string,desde:string,hasta:string){return Boolean(fecha&&fecha>=desde&&fecha<=hasta)}
function montoRango(row:any,desde:string,hasta:string){return servicios(row).reduce((sum:number,s:any)=>sum+(fechaEnRango(String(s.fecha||''),desde,hasta)?Number(s.monto||0):0),0)}
function montoAnterior(row:any,desde:string){return servicios(row).reduce((sum:number,s:any)=>sum+(String(s.fecha||'')<desde?Number(s.monto||0):0),0)}
function coincideRango(row:any,desde?:string,hasta?:string){if(!desde||!hasta)return true;return servicios(row).some((s:any)=>fechaEnRango(String(s.fecha||''),desde,hasta))}
function tieneComprobante(row:any){return Boolean(row.comprobante_id)}
function estadoComprobante(row:any){return String(row.comprobante_estado||'').trim().toUpperCase()}
function sinComprobante(row:any){return !tieneComprobante(row)}
function comprobantePorValidar(row:any){const estado=estadoComprobante(row);return tieneComprobante(row)&&!['VALIDADO','RECHAZADO'].includes(estado)}
function sinComprobantePendiente(row:any){return esCobrable(row)&&!esPagado(row)&&sinComprobante(row)}
function comprobantePendienteValidacion(row:any){return esCobrable(row)&&!esPagado(row)&&comprobantePorValidar(row)}
function coincideEstado(row:any,estado:string){
  if(estado==='global')return true;
  if(estado==='pendientes')return sinComprobantePendiente(row)||comprobantePendienteValidacion(row);
  if(estado==='sin-comprobante')return sinComprobantePendiente(row);
  if(estado==='por-validar')return comprobantePendienteValidacion(row);
  if(estado==='rechazados')return estadoBandeja(row)==='rechazados';
  if(estado==='validados')return esPagado(row);
  return true;
}
function estadoVisible(row:any){
  if(sinComprobante(row)&&esPagado(row))return 'Pagado · sin comprobante';
  if(sinComprobante(row))return 'Sin comprobante';
  if(comprobantePorValidar(row))return 'Comprobante por validar';
  if(estadoBandeja(row)==='rechazados')return 'Rechazado';
  return esPagado(row)?'Validado':'Pendiente';
}

export default async function Page({searchParams}:{searchParams:Promise<{estado?:string;institucion?:string;medio?:string;q?:string;desde?:string;hasta?:string}>}){
  const u=await requireUser(['Finanzas','AdminTotal']);
  const params=await searchParams;
  const rows=await listarFinanzas();
  const estado=estados.some(([key])=>key===params.estado)?String(params.estado||'global'):'global';
  const desde=String(params.desde||'').trim();
  const hasta=String(params.hasta||'').trim();
  const institucion=String(params.institucion||'').trim();
  const medio=String(params.medio||'').trim();
  const q=String(params.q||'').trim().toLocaleLowerCase('es-CL');
  const instituciones=[...new Set(rows.map((r:any)=>String(r.institucion||'').trim()).filter(Boolean))].sort();
  const medios=[...new Set(rows.map((r:any)=>String(r.metodo_pago||'').trim()).filter(Boolean))].sort();

  const universo=rows.filter((row:any)=>{
    if(institucion&&String(row.institucion||'')!==institucion)return false;
    if(medio&&String(row.metodo_pago||'')!==medio)return false;
    if(q){const bolsa=[row.rut,row.nombre,row.codigo_reserva,row.institucion,row.metodo_pago].map(v=>String(v||'').toLocaleLowerCase('es-CL')).join(' ');if(!bolsa.includes(q))return false;}
    if(!coincideRango(row,desde,hasta))return false;
    return true;
  });
  const visibles=universo.filter((row:any)=>coincideEstado(row,estado));
  const comprobantesPorValidar=universo.filter(comprobantePendienteValidacion).length;

  const periodo=desde&&hasta?{desde,hasta}:mesActualChile();
  const baseKpi=rows.filter((row:any)=>{
    if(institucion&&String(row.institucion||'')!==institucion)return false;
    if(medio&&String(row.metodo_pago||'')!==medio)return false;
    if(q){const bolsa=[row.rut,row.nombre,row.codigo_reserva,row.institucion,row.metodo_pago].map(v=>String(v||'').toLocaleLowerCase('es-CL')).join(' ');if(!bolsa.includes(q))return false;}
    return true;
  });
  const reservadoPeriodo=baseKpi.reduce((sum:number,row:any)=>sum+montoRango(row,periodo.desde,periodo.hasta),0);
  const pagadoPeriodo=baseKpi.filter(esPagado).reduce((sum:number,row:any)=>sum+montoRango(row,periodo.desde,periodo.hasta),0);
  const pendientePeriodo=baseKpi.filter((r:any)=>esCobrable(r)&&!esPagado(r)).reduce((sum:number,row:any)=>sum+montoRango(row,periodo.desde,periodo.hasta),0);
  const porValidarPeriodo=baseKpi.filter(comprobantePorValidar).reduce((sum:number,row:any)=>sum+montoRango(row,periodo.desde,periodo.hasta),0);
  const deudaAnterior=baseKpi.filter((r:any)=>esCobrable(r)&&!esPagado(r)).reduce((sum:number,row:any)=>sum+montoAnterior(row,periodo.desde),0);
  const saldoTotal=pendientePeriodo+deudaAnterior;

  const qsBase=new URLSearchParams();
  if(desde)qsBase.set('desde',desde);if(hasta)qsBase.set('hasta',hasta);if(institucion)qsBase.set('institucion',institucion);if(medio)qsBase.set('medio',medio);if(params.q)qsBase.set('q',String(params.q));
  const exportQs=new URLSearchParams(qsBase);exportQs.set('estado',estado);
  const hoy=hoyChile();
  const hoyQs=new URLSearchParams(qsBase);hoyQs.set('desde',hoy);hoyQs.set('hasta',hoy);hoyQs.set('estado',estado);

  return <AppShell user={u}><div className="space-y-5">
    <section>
      <p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">FINANZAS</p>
      <h1 className="text-2xl font-black text-[#0E2A23]">Bandeja financiera</h1>
      <p className="mt-1 text-sm text-[#6B7570]">Histórico completo y una sola lectura financiera. Los indicadores muestran {desde&&hasta?'el período seleccionado':'el mes actual'} y separan la deuda arrastrada de períodos anteriores.</p>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[
        ['Reservado período',reservadoPeriodo],
        ['Pagado período',pagadoPeriodo],
        ['Pendiente período',pendientePeriodo],
        ['Por validar período',porValidarPeriodo],
        ['Deuda anterior acumulada',deudaAnterior],
        ['Saldo total por recaudar',saldoTotal],
      ].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-sm text-[#6B7570]">{label}</div><div className="mt-1 text-2xl font-black text-[#0E2A23]">${Number(value).toLocaleString('es-CL')}</div></div>)}
    </section>

    <section className="rounded-2xl border bg-white p-4 sm:p-5">
      <form id="finanzas-filtros" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 xl:items-end">
        <label className="min-w-0 text-sm font-bold">Desde<input type="date" name="desde" defaultValue={desde} className="mt-1 w-full min-w-0 rounded-lg border px-3 py-2 font-normal"/></label>
        <label className="min-w-0 text-sm font-bold">Hasta<input type="date" name="hasta" defaultValue={hasta} className="mt-1 w-full min-w-0 rounded-lg border px-3 py-2 font-normal"/></label>
        <label className="min-w-0 text-sm font-bold">Institución<select name="institucion" defaultValue={institucion} className="mt-1 w-full min-w-0 rounded-lg border bg-white p-2 font-normal"><option value="">Todas las instituciones</option>{instituciones.map(nombre=><option key={nombre}>{nombre}</option>)}</select></label>
        <label className="min-w-0 text-sm font-bold">Medio de pago<select name="medio" defaultValue={medio} className="mt-1 w-full min-w-0 rounded-lg border bg-white p-2 font-normal"><option value="">Todos los medios</option>{medios.map(nombre=><option key={nombre}>{nombre}</option>)}</select></label>
        <label className="min-w-0 text-sm font-bold">RUT, nombre o código<div className="mt-1 flex min-w-0 gap-2"><input name="q" defaultValue={params.q||''} placeholder="Buscar" className="min-w-0 flex-1 rounded-lg border px-3 py-2 font-normal"/><button className="shrink-0 rounded-lg bg-[#0E2A23] px-3 py-2 font-bold text-white">Buscar</button></div></label>
        <input type="hidden" name="estado" value={estado}/>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {estados.map(([key,label])=>{const p=new URLSearchParams(qsBase);p.set('estado',key);return <Link key={key} href={`/finanzas?${p.toString()}`} className={`rounded-full border px-3 py-1.5 text-sm font-bold ${estado===key?'bg-[#0E2A23] text-white':'bg-white text-[#0E2A23]'}`}>{key==='por-validar'?`${label} (${comprobantesPorValidar})`:label}</Link>})}
        <span className="mx-1 hidden h-6 w-px bg-[#A6B0AA]/40 sm:inline-block"/>
        <Link href={`/finanzas?${hoyQs.toString()}`} className="rounded-full border px-3 py-1.5 text-sm font-bold">Ver hoy</Link>
        <Link href="/finanzas" className="rounded-full border px-3 py-1.5 text-sm font-bold">Limpiar filtros</Link>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#0D9B91]/30 bg-[#EEF7F6] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="font-black text-[#0E2A23]">Exportar vista actual</div><div className="text-xs text-[#5E6B66]">Los archivos respetan período, institución, medio de pago, estado y búsqueda aplicados.</div></div>
        <div className="flex flex-wrap gap-2">
          {(['pdf','csv','xml'] as const).map(formato=><a key={formato} href={`/api/finanzas/exportar/${formato}?${exportQs.toString()}`} className="rounded-lg border border-[#0D9B91] bg-white px-4 py-2 text-sm font-black uppercase text-[#0E2A23] hover:bg-[#E2F4F1]">{formato}</a>)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6B7570]">
        <span>Mostrando <b>{visibles.length}</b> de <b>{rows.length}</b> reservas del histórico.</span>
        <span>Período KPI: <b>{periodo.desde}</b> → <b>{periodo.hasta}</b></span>
      </div>

      <div className="mt-5 space-y-3">{visibles.map((r:any)=>{
        const accionable=String(r.comprobante_estado||'').toUpperCase()==='RECIBIDO';
        const pagado=esPagado(r);
        return <details key={r.codigo_reserva} className="rounded-xl border border-[#A6B0AA]/30 p-4">
          <summary className="cursor-pointer list-none">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:items-center">
              <div className="min-w-0"><b className="break-all">{r.codigo_reserva}</b><div className="truncate text-sm text-[#6B7570]">{r.nombre}</div></div>
              <div className="text-sm">{r.institucion}</div>
              <div className="text-sm">{r.primera_fecha} → {r.ultima_fecha}</div>
              <div className="font-bold">${Number(r.total||0).toLocaleString('es-CL')}</div>
              <div className="text-sm"><b>{estadoVisible(r)}</b></div>
            </div>
          </summary>
          <div className="mt-4 border-t pt-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="font-bold">RUT</dt><dd>{r.rut}</dd></div><div><dt className="font-bold">Código de reserva</dt><dd className="break-all">{r.codigo_reserva}</dd></div><div><dt className="font-bold">Método de pago</dt><dd>{r.metodo_pago||'—'}</dd></div><div><dt className="font-bold">Estado financiero</dt><dd>{r.estado_pago||'Pendiente'}</dd></div><div><dt className="font-bold">Estado comprobante</dt><dd>{r.comprobante_estado||'Sin comprobante'}</dd></div><div><dt className="font-bold">Motivo reciente</dt><dd>{r.comprobante_motivo||r.motivo_estado_pago||'—'}</dd></div>
            </dl>
            <h3 className="mt-4 font-black">Servicios reservados</h3>
            <div className="mt-2 overflow-x-auto"><table className="min-w-[620px] w-full"><thead><tr className="text-left"><th>Fecha</th><th>Servicio</th><th>Plato / opción</th><th>Monto</th></tr></thead><tbody>{servicios(r).map((s:any)=><tr key={s.id} className="border-t"><td className="py-2">{s.fecha}</td><td>{s.servicio}</td><td>{s.plato} · {s.opcion||'—'}</td><td>${Number(s.monto||0).toLocaleString('es-CL')}</td></tr>)}</tbody></table></div>
            {r.comprobante_id&&<a className="mt-4 inline-block rounded-lg border px-4 py-2 font-bold underline" target="_blank" rel="noreferrer" href={`/api/finanzas/comprobante/${r.comprobante_id}`}>Ver comprobante</a>}
            {(r.comprobantes_historial||[]).length>0&&<div className="mt-4"><h3 className="font-black">Historial de comprobantes</h3><ul className="mt-2 space-y-1">{r.comprobantes_historial.map((h:any)=><li key={h.id}>{h.fecha} · <a className="underline" target="_blank" rel="noreferrer" href={`/api/finanzas/comprobante/${h.id}`}>{h.archivo}</a> · <b>{h.estado}</b>{h.motivo?` · ${h.motivo}`:''}</li>)}</ul></div>}
            {accionable&&<div className="mt-3 grid gap-2 lg:grid-cols-2"><form action={pagoAction}><input type="hidden" name="codigo" value={r.codigo_reserva}/><input type="hidden" name="estado" value="Pagado"/><button className="w-full rounded-lg bg-[#1DB954] px-4 py-2 font-bold">Validar comprobante</button></form><form action={pagoAction} className="grid gap-2"><input type="hidden" name="codigo" value={r.codigo_reserva}/><input type="hidden" name="estado" value="Rechazado"/><input name="motivo" required placeholder="Motivo obligatorio del rechazo" className="rounded-lg border px-3 py-2"/><button className="rounded-lg border border-[#9B2C2C] px-4 py-2 font-bold">Rechazar</button></form></div>}
            {!pagado&&!r.comprobante_id&&esCobrable(r)&&<div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <details className="rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/5 p-3"><summary className="cursor-pointer font-black">Validar sin comprobante · marcha blanca</summary><form action={validarSinComprobanteAction} className="mt-3 grid gap-2 lg:grid-cols-[220px_1fr_auto]"><input type="hidden" name="codigo" value={r.codigo_reserva}/><select name="medio" required defaultValue="" className="rounded-lg border bg-white px-3 py-2"><option value="" disabled>Medio de verificación</option><option>Cartola bancaria</option><option>Transferencia identificada</option><option>POS / débito</option><option>Validación administrativa</option><option>Otro medio verificable</option></select><input name="motivo" required placeholder="Detalle obligatorio de la verificación" className="rounded-lg border px-3 py-2"/><button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-black text-white">Marcar pagado y liberar RUT</button></form></details>
              <form action={solicitarInformacionPagoAction} className="self-start"><input type="hidden" name="codigo" value={r.codigo_reserva}/><button className="w-full rounded-xl border border-[#0D9B91] bg-[#EEF7F6] px-4 py-3 font-black text-[#0E2A23] lg:w-auto">Solicitar información de pago</button></form>
            </div>}
          </div>
        </details>})}
        {!visibles.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No hay registros que coincidan con los filtros seleccionados.</p>}
      </div>
    </section>

    <Script id="finanzas-auto-filtros" strategy="afterInteractive">{`if(!window.__finanzasAutoFiltros){window.__finanzasAutoFiltros=true;document.addEventListener('change',function(e){var t=e.target;if(!t||!t.closest)return;var f=t.closest('#finanzas-filtros');if(!f)return;var n=t.getAttribute('name');if(n==='institucion'||n==='medio'){f.requestSubmit();return;}if(n==='hasta'){var d=f.querySelector('[name="desde"]');if(d&&d.value&&t.value)f.requestSubmit();return;}if(n==='desde'&&!t.value){var h=f.querySelector('[name="hasta"]');if(h)h.value='';f.requestSubmit();}});}`}</Script>
  </div></AppShell>;
}
