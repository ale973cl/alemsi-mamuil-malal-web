import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import MinutaCarga from '@/components/MinutaCarga';
import MinutaPublicada from '@/components/MinutaPublicada';
import CierreJornada from '@/components/CierreJornada';
import ConfiguracionReclamos from '@/components/ConfiguracionReclamos';
import RelojChile from '@/components/RelojChile';
import ReglasReservaForm from '@/components/ReglasReservaForm';
import { requireUser } from '@/lib/auth/session';
import { getReglas, minutasPeriodo, platosDisponibles, resumenAdmin } from '@/lib/db/admin';
import { listarSolicitudesExtraordinarias } from '@/lib/db/solicitudes-extraordinarias';
import { listarReclamosParaRol,obtenerConfiguracionReclamos,obtenerDetalleReclamo } from '@/lib/db/reclamos';
import { fechaVisible } from '@/lib/fecha-hora';
import { detalleJornada, jornada } from '@/lib/db/cocina';
import { reglasAction, resolverSolicitudExtraordinariaAction } from './actions';

export const dynamic='force-dynamic';
function iso(d:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function cicloViernesJueves(){const hoy=iso(new Date());const [y,m,d]=hoy.split('-').map(Number);const base=new Date(Date.UTC(y,m-1,d,12));const retro=(base.getUTCDay()-5+7)%7;const ini=new Date(base);ini.setUTCDate(base.getUTCDate()-retro);const fin=new Date(ini);fin.setUTCDate(ini.getUTCDate()+6);return [ini.toISOString().slice(0,10),fin.toISOString().slice(0,10)] as const;}
function fechaValida(value?:string){return Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value))}
const tabs=[['minuta','Minuta'],['solicitudes','Solicitudes / excepciones'],['reclamos','Reclamos'],['reglas','Reglas de reserva'],['historico','Histórico']] as const;
type Tab=(typeof tabs)[number][0];
function redirigirReclamosLegacy(tab:Tab,caso?:string){
  if(tab==='reclamos') redirect(`/reclamos-gestion?${caso?`caso=${encodeURIComponent(caso)}`:''}`);
}

export default async function Page({searchParams}:{searchParams:Promise<{inicio?:string;fin?:string;tab?:string;caso?:string;pagina?:string}>}){
  const u=await requireUser(['AdminCasino','AdminTotal']);
  const params=await searchParams;const vigenteRango=cicloViernesJueves();
  const tab:Tab=tabs.some(([key])=>key===params.tab)?params.tab as Tab:'minuta';
  // Reclamos tiene una sola bandeja operacional para todos los perfiles.
  // Conservamos esta redirección para enlaces y marcadores antiguos del Admin Casino.
  redirigirReclamosLegacy(tab,params.caso);
  const hoy=iso(new Date());
  const inicioSolicitado=fechaValida(params.inicio)?params.inicio!:vigenteRango[0];
  const ini=tab==='minuta'&&inicioSolicitado<hoy?hoy:inicioSolicitado;
  const fin=fechaValida(params.fin)&&params.fin!>=ini?params.fin!:vigenteRango[1]>=ini?vigenteRango[1]:ini;
  // La portada conserva sus indicadores y la minuta vigente, pero cada módulo
  // consulta sus datos pesados únicamente cuando el usuario abre esa pestaña.
  const vigentePromise=minutasPeriodo(vigenteRango[0],vigenteRango[1]);
  const [res,vigente,reg,min,platos,solicitudes,reclamos,caso,configuracionReclamos]=await Promise.all([
    resumenAdmin(),
    vigentePromise,
    tab==='reglas'?getReglas():Promise.resolve(null),
    tab==='minuta'?minutasPeriodo(ini,fin,hoy):tab==='historico'?minutasPeriodo(ini,fin):Promise.resolve([]),
    tab==='minuta'?platosDisponibles():Promise.resolve([]),
    tab==='solicitudes'?listarSolicitudesExtraordinarias('PENDIENTE'):Promise.resolve([]),
    tab==='reclamos'?listarReclamosParaRol('AdminCasino',Number(params.pagina||1),25):Promise.resolve([]),
    tab==='reclamos'&&Number(params.caso)>0?obtenerDetalleReclamo(Number(params.caso)):Promise.resolve(null),
    tab==='reclamos'?obtenerConfiguracionReclamos():Promise.resolve({responsables:[],permisos:[]}),
  ]);
  const fechas=[...new Set(min.map((row:any)=>String(row.fecha)))];
  const cierres=tab==='minuta'?await Promise.all(fechas.map(async fecha=>{
    const actual=await jornada(fecha);
    const enProduccion=String(actual?.estado||'').trim().toLocaleLowerCase('es-CL')==='en producción';
    return {fecha,enProduccion,detalle:enProduccion?await detalleJornada(fecha):[]};
  })):[];
  const href=(key:Tab)=>key==='reclamos'?'/reclamos-gestion':`/admin-casino?tab=${key}&inicio=${ini}&fin=${fin}`;

  return <AppShell user={u}><div className="space-y-5">
    <section className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ADMIN CASINO</p><h1 className="text-2xl font-black text-[#0E2A23]">Operación y minutas</h1><p className="mt-1 text-sm text-[#6B7570]">Minuta oficial, excepciones y reglas operativas desde una sola fuente.</p></div><RelojChile epochServidor={Date.now()}/></section>

    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.14em] text-[#1DB954]">MINUTA OFICIAL VIGENTE</p><h2 className="text-xl font-black">Ciclo viernes → jueves</h2><p className="text-sm text-[#6B7570]">{fechaVisible(vigenteRango[0])} → {fechaVisible(vigenteRango[1])} · fuente única para Cocina, Comensal y perfiles autorizados.</p></div><Link href={href('minuta')} className="rounded-xl bg-[#0E2A23] px-4 py-2 text-sm font-black text-white">Gestionar próxima minuta</Link></div><MinutaPublicada rows={vigente as any} compactWeekly inicio={vigenteRango[0]} fin={vigenteRango[1]}/></section>

    <section className="grid gap-3 md:grid-cols-4">{[['Reservas futuras',res.reservas],['Raciones futuras',res.raciones],['Pagos pendientes',res.pendientes],['Excepciones pendientes',res.solicitudes]].map(([a,b])=><div key={String(a)} className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-4"><div className="text-sm text-[#6B7570]">{a}</div><div className="text-3xl font-black text-[#0E2A23]">{String(b||0)}</div></div>)}</section>

    <nav className="flex flex-wrap gap-2 rounded-2xl border border-[#A6B0AA]/25 bg-white p-2">{tabs.map(([key,label])=><Link key={key} href={href(key)} className={`rounded-xl px-4 py-2 text-sm font-black ${tab===key?'bg-[#0E2A23] text-white':'text-[#0E2A23] hover:bg-[#F6F3EA]'}`}>{label}</Link>)}</nav>

    {tab==='solicitudes'&&<section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Solicitudes y excepciones pendientes</h2><p className="text-sm text-[#6B7570]">Solo casos que requieren una decisión de Admin Casino. Reclamos y futuras derivaciones podrán llegar a esta misma bandeja.</p></div><span className="rounded-full bg-[#D4AF37]/20 px-3 py-1 text-sm font-black">{solicitudes.length} pendiente(s)</span></div><div className="mt-4 space-y-3">{solicitudes.map((s:any)=><article key={s.id} className="rounded-xl border p-4"><div className="grid gap-2 md:grid-cols-[1fr_150px_150px]"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6B7570]">#{s.id} · {s.tipo==='NO_CONSUMIRA_DIA'?'No consumirá el día':'Anulación de servicio'}</p><h3 className="text-lg font-black">{s.nombre||s.rut}</h3><p className="text-sm">RUT {s.rut} · Reserva {s.referencia_reserva||'—'}</p></div><div className="text-sm"><b>Fecha</b><br/>{String(s.fecha).slice(0,10)}</div><div className="text-sm"><b>Jornada</b><br/><span className={s.estado_jornada==='EN_PRODUCCION'?'font-black text-red-700':'font-bold'}>{s.estado_jornada}</span></div></div>{s.tipo==='ANULACION_SERVICIO'&&<div className="mt-3 rounded-lg bg-[#F6F3EA] p-3 text-sm"><b>{s.servicio}</b> · {s.plato}</div>}<div className="mt-3 rounded-lg bg-[#F6F3EA] p-3 text-sm"><b>Motivo:</b> {s.motivo}</div><form action={resolverSolicitudExtraordinariaAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]"><input type="hidden" name="id" value={s.id}/><input name="observacion" placeholder="Observación de Admin Casino (opcional)" className="rounded-lg border px-3 py-2"/><button name="decision" value="RECHAZAR" className="rounded-lg border px-4 py-2 font-bold">Rechazar</button><button name="decision" value="AUTORIZAR" className="rounded-lg bg-[#1DB954] px-4 py-2 font-black">Autorizar</button></form></article>)}{!solicitudes.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No existen solicitudes o excepciones pendientes.</p>}</div></section>}

    {tab==='reclamos'&&<section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Expedientes de reclamos</h2><p className="text-sm text-[#6B7570]">Listado paginado sin descargar adjuntos. Abre un folio para consultar su trazabilidad.</p><ConfiguracionReclamos responsables={configuracionReclamos.responsables} permisos={configuracionReclamos.permisos}/><div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2"><div className="space-y-2">{reclamos.map((r:any)=><Link key={r.id} href={`${href('reclamos')}&caso=${r.id}`} className="block min-w-0 rounded-xl border p-3 hover:bg-[#F6F3EA]"><b>R-{String(r.id).padStart(6,'0')} · {r.tipo}</b><div className="truncate text-sm">{r.nombre} · {r.categoria}</div><div className="text-xs text-[#6B7570]">{fechaVisible(r.fecha)} · {r.estado}</div></Link>)}{!reclamos.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No hay reclamos visibles.</p>}</div>{caso&&<article className="min-w-0 rounded-xl border p-4"><h3 className="font-black">R-{String(caso.id).padStart(6,'0')} · {caso.estado}</h3><p className="mt-2 break-words text-sm">{caso.mensaje}</p><h4 className="mt-4 font-black">Trazabilidad</h4><div className="space-y-2">{caso.movimientos.map((m:any)=><div key={m.id} className="rounded-lg bg-[#F6F3EA] p-2 text-sm"><b>{m.accion}</b> · {m.actor}<div>{m.mensaje}</div></div>)}</div><h4 className="mt-4 font-black">Adjuntos</h4><div className="flex flex-wrap gap-2">{caso.adjuntos.map((a:any)=><a key={a.id} href={`/api/reclamos/adjuntos/${a.id}`} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-lg border px-3 py-2 text-sm underline">{a.nombre}</a>)}{!caso.adjuntos.length&&<span className="text-sm text-[#6B7570]">Sin adjuntos.</span>}</div></article>}</div></section>}

    {tab==='minuta'&&<section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Próxima minuta / correcciones vigentes</h2><p className="text-sm text-[#6B7570]">Carga manual o CSV sobre la minuta oficial. Los períodos vencidos quedan fuera de la gestión diaria.</p></div><form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input type="hidden" name="tab" value="minuta"/><label className="text-sm font-bold">Desde<input type="date" name="inicio" defaultValue={ini} className="mt-1 block rounded-lg border p-2"/></label><label className="text-sm font-bold">Hasta<input type="date" name="fin" defaultValue={fin} className="mt-1 block rounded-lg border p-2"/></label><button className="self-end rounded-lg border px-4 py-2 font-bold">Consultar</button></form></div><div className="mt-3 rounded-xl bg-[#F6F3EA] p-3 text-sm"><b>Período de trabajo:</b> {fechaVisible(ini)} → {fechaVisible(fin)} · {fechas.length} día(s) · {min.length} fila(s)</div><MinutaCarga platos={platos}/><div className="mt-5 space-y-4">{cierres.filter(cierre=>cierre.enProduccion).map(cierre=><div key={cierre.fecha} className="rounded-xl border p-3"><h3 className="font-black">Cierre de jornada · {fechaVisible(cierre.fecha)}</h3><CierreJornada fecha={cierre.fecha} rows={cierre.detalle as any} buttonLabel="Cerrar jornada"/></div>)}</div></section>}

    {tab==='historico'&&<section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Histórico de minutas</h2><p className="text-sm text-[#6B7570]">Consulta de períodos anteriores. No forma parte de la bandeja operativa diaria.</p></div><form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input type="hidden" name="tab" value="historico"/><label className="text-sm font-bold">Desde<input type="date" name="inicio" defaultValue={ini} className="mt-1 block rounded-lg border p-2"/></label><label className="text-sm font-bold">Hasta<input type="date" name="fin" defaultValue={fin} className="mt-1 block rounded-lg border p-2"/></label><button className="self-end rounded-lg border px-4 py-2 font-bold">Consultar histórico</button></form></div><MinutaPublicada rows={min as any} compactWeekly/></section>}

    {tab==='reglas'&&reg?<ReglasReservaForm reglas={reg} action={reglasAction}/>:null}
  </div></AppShell>
}
