import Link from 'next/link';
import AppShell from '@/components/AppShell';
import MinutaCarga from '@/components/MinutaCarga';
import { requireUser } from '@/lib/auth/session';
import { flujoActual, getReglas, minutasPeriodo, platosDisponibles, resumenAdmin } from '@/lib/db/admin';
import { autorizacionExternaAction, enviarAction, minutaAction, publicarAction, reglasAction } from './actions';

export const dynamic='force-dynamic';
function iso(d:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function periodoDefault(){const inicio=new Date();const fin=new Date(inicio);fin.setDate(fin.getDate()+6);return [iso(inicio),iso(fin)]}
function fechaValida(value?:string){return Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value))}
const tabs=[['resumen','Resumen'],['minuta','Minuta'],['coordinacion','Coordinación'],['reglas','Reglas de reserva']] as const;

type Tab=(typeof tabs)[number][0];

export default async function Page({searchParams}:{searchParams:Promise<{inicio?:string;fin?:string;tab?:string}>}){
  const u=await requireUser(['AdminCasino','AdminTotal']);
  const params=await searchParams;
  const defaults=periodoDefault();
  const ini=fechaValida(params.inicio)?params.inicio!:defaults[0];
  const fin=fechaValida(params.fin)&&params.fin!>=ini?params.fin!:defaults[1];
  const tab:Tab=tabs.some(([key])=>key===params.tab)?params.tab as Tab:'resumen';
  const [reg,res,min,flujo,platos]=await Promise.all([getReglas(),resumenAdmin(),minutasPeriodo(ini,fin),flujoActual(ini,fin),platosDisponibles()]);
  const fechas=[...new Set(min.map((row:any)=>String(row.fecha)))];
  const href=(key:Tab)=>`/admin-casino?tab=${key}&inicio=${ini}&fin=${fin}`;

  return <AppShell user={u}><div className="space-y-5">
    <section>
      <p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ADMIN CASINO</p>
      <h1 className="text-2xl font-black text-[#0E2A23]">Operación y minutas</h1>
      <p className="mt-1 text-sm text-[#6B7570]">Un solo flujo para cargar, revisar, autorizar y publicar la minuta que consume Producción.</p>
    </section>

    <section className="grid gap-3 md:grid-cols-3">{[['Reservas futuras',res.reservas],['Raciones futuras',res.raciones],['Pagos pendientes',res.pendientes]].map(([a,b])=><div key={String(a)} className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><div className="text-sm text-[#6B7570]">{a}</div><div className="text-3xl font-black text-[#0E2A23]">{String(b||0)}</div></div>)}</section>

    <nav className="flex flex-wrap gap-2 rounded-2xl border border-[#A6B0AA]/25 bg-white p-2">{tabs.map(([key,label])=><Link key={key} href={href(key)} className={`rounded-xl px-4 py-2 text-sm font-black ${tab===key?'bg-[#0E2A23] text-white':'text-[#0E2A23] hover:bg-[#F6F3EA]'}`}>{label}</Link>)}</nav>

    {tab==='resumen'&&<section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Estado del período</h2><div className="mt-3 rounded-xl bg-[#F6F3EA] p-3 text-sm"><b>Período:</b> {ini} → {fin}<br/><b>Días con minuta:</b> {fechas.length}<br/><b>Filas:</b> {min.length}</div>{flujo?<div className="mt-3 rounded-xl border p-3 text-sm"><b>Coordinación:</b> v{flujo.version} · <strong>{flujo.estado}</strong><br/>{flujo.observacion||'Sin observación'}</div>:<p className="mt-3 text-sm text-[#6B7570]">Aún no existe un flujo de revisión para este período.</p>}</div>
      <div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Acciones rápidas</h2><div className="mt-3 grid gap-2"><Link href={href('minuta')} className="rounded-xl bg-[#1DB954] px-4 py-3 text-center font-black text-[#071814]">Cargar o corregir minuta</Link><Link href={href('coordinacion')} className="rounded-xl border px-4 py-3 text-center font-black">Revisar flujo con Coordinación</Link><Link href={href('reglas')} className="rounded-xl border px-4 py-3 text-center font-black">Configurar reglas de reserva</Link></div></div>
    </section>}

    {tab==='minuta'&&<section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Minuta por período</h2><p className="text-sm text-[#6B7570]">Carga manual/CSV y correcciones sobre la misma minuta oficial.</p></div><form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input type="hidden" name="tab" value="minuta"/><label className="text-sm font-bold">Desde<input type="date" name="inicio" defaultValue={ini} className="mt-1 block rounded-lg border p-2"/></label><label className="text-sm font-bold">Hasta<input type="date" name="fin" defaultValue={fin} className="mt-1 block rounded-lg border p-2"/></label><button className="self-end rounded-lg border px-4 py-2 font-bold">Consultar</button></form></div>
      <div className="mt-3 rounded-xl bg-[#F6F3EA] p-3 text-sm"><b>Período visible:</b> {ini} → {fin} · {fechas.length} día(s) con minuta · {min.length} fila(s)</div>
      <MinutaCarga platos={platos}/>
      <div className="mt-5 space-y-4">{fechas.map(fecha=><div key={fecha} className="rounded-xl border p-3"><h3 className="font-black">{fecha}</h3><div className="mt-2 overflow-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left"><th>Servicio</th><th>Opción</th><th>Plato</th><th>Estado</th><th>Editar</th></tr></thead><tbody>{min.filter((row:any)=>String(row.fecha)===fecha).map((row:any)=><tr key={row.id} className="border-t"><td>{row.servicio}</td><td>{row.tipo_opcion}</td><td>{row.plato}</td><td><b>{row.estado}</b></td><td><details><summary className="cursor-pointer underline">Corregir</summary><form action={minutaAction} className="mt-2 grid gap-2 md:grid-cols-4"><input type="hidden" name="id" value={row.id}/><input type="hidden" name="fecha" value={row.fecha}/><select name="servicio" defaultValue={row.servicio} className="rounded border p-1"><option>Desayuno</option><option>Almuerzo</option><option>Once</option><option>Cena</option></select><select name="tipo_opcion" defaultValue={row.tipo_opcion} className="rounded border p-1"><option>OPCION 1</option><option>OPCION 2</option><option>HIPOCALORICO</option><option>TIPO R</option></select><input name="plato" list="platos-minuta" defaultValue={row.plato} required className="rounded border p-1"/><button className="rounded border px-2 font-bold">Guardar corrección</button></form></details></td></tr>)}</tbody></table></div></div>)}{!min.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No existen filas dentro de este período.</p>}</div>
      <p className="mt-4 text-sm text-[#6B7570]">PDF histórico pendiente de recuperación; no se aplicó OCR ni interpretación nueva.</p>
    </section>}

    {tab==='coordinacion'&&<section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><h2 className="text-xl font-black">Revisión y publicación</h2><div className="mt-3 rounded-xl bg-[#F6F3EA] p-3 text-sm"><b>Período:</b> {ini} → {fin} · {min.length} fila(s)</div>{flujo&&<div className="mt-3 rounded-xl border p-3 text-sm"><b>Flujo:</b> v{flujo.version} · <strong>{flujo.estado}</strong> · {flujo.observacion||'Sin observación'}</div>}<div className="mt-4 flex flex-wrap gap-2"><form action={enviarAction}><input type="hidden" name="inicio" value={ini}/><input type="hidden" name="fin" value={fin}/><button disabled={!min.length} className="rounded-lg bg-[#1DB954] px-4 py-2 font-bold disabled:opacity-40">Enviar período a Coordinación</button></form>{flujo?.estado==='AUTORIZADA'&&<form action={publicarAction} className="flex items-center gap-2"><input type="hidden" name="inicio" value={ini}/><input type="hidden" name="fin" value={fin}/><label className="text-sm font-bold"><input type="checkbox" name="confirmar" value="PUBLICAR" required/> Confirmar publicación</label><button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-black text-white">Publicar período</button></form>}</div><details className="mt-4 rounded-xl border p-3"><summary className="cursor-pointer font-black">Registrar autorización externa</summary><form action={autorizacionExternaAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]"><input type="hidden" name="inicio" value={ini}/><input type="hidden" name="fin" value={fin}/><input name="observacion" required placeholder="Correo, fecha o referencia de autorización" className="rounded-lg border p-2"/><button className="rounded-lg border px-4 py-2 font-bold">Registrar como autorizada</button></form></details></section>}

    {tab==='reglas'&&<section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><h2 className="text-xl font-black">Reglas de reserva</h2><form action={reglasAction} className="mt-4 grid gap-3 md:grid-cols-4"><label className="text-sm font-bold">Anticipación (h)<input name="a" defaultValue={reg.anticipacion_reserva_horas} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-sm font-bold">Cancelación (h)<input name="c" defaultValue={reg.cancelacion_directa_horas} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-sm font-bold">Máx. días<input name="m" defaultValue={reg.max_dias_consecutivos} className="mt-1 w-full rounded-lg border p-2"/></label><label className="flex items-end gap-2 pb-2 text-sm font-bold"><input type="checkbox" name="e" defaultChecked={Number(reg.excepciones_habilitadas)===1}/> Excepciones</label><button className="rounded-xl bg-[#1DB954] px-4 py-2 font-extrabold md:col-span-4">Guardar reglas</button></form></section>}
  </div></AppShell>
}
