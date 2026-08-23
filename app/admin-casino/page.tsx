import AppShell from '@/components/AppShell';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import WeeklyMenuCalendar from '@/components/ui/WeeklyMenuCalendar';
import { requireUser } from '@/lib/auth/session';
import { demandaRango } from '@/lib/db/demanda';
import { flujoActual, getReglas, minutasPeriodo, resumenAdmin } from '@/lib/db/admin';
import { enviarAction, minutaAction, publicarAction, reglasAction } from './actions';

export const dynamic='force-dynamic';

function chileIso(d:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function rangoDefault(){const start=new Date(); const end=new Date(start); end.setDate(end.getDate()+6); return [chileIso(start),chileIso(end)] as const}
function validDate(v?:string){return Boolean(v&&/^\d{4}-\d{2}-\d{2}$/.test(v))}

export default async function Page({searchParams}:{searchParams:Promise<{inicio?:string;fin?:string}>}){
  const u=await requireUser(['AdminCasino','AdminTotal']);
  const q=await searchParams;
  const defaults=rangoDefault();
  const inicio=validDate(q.inicio)?q.inicio!:defaults[0];
  const fin=validDate(q.fin)&&q.fin!>=inicio?q.fin!:defaults[1];
  const [reg,res,min,flujo,demanda]=await Promise.all([
    getReglas(),resumenAdmin(),minutasPeriodo(inicio,fin),flujoActual(inicio,fin),demandaRango(inicio,fin),
  ]);
  const almuerzos=demanda.filter(r=>String(r.servicio).toLowerCase()==='almuerzo').reduce((s,r)=>s+Number(r.cantidad||0),0);
  const cenas=demanda.filter(r=>String(r.servicio).toLowerCase()==='cena').reduce((s,r)=>s+Number(r.cantidad||0),0);
  const instituciones=[...new Set(demanda.map(r=>r.institucion).filter(Boolean))];
  const dias=[...new Set(min.map((r:any)=>String(r.fecha)))].length;
  return <AppShell user={u}><div className="space-y-5">
    <PageHeader eyebrow="ADMINISTRACIÓN DE CASINO" title="Operación y minuta" description="Planifica la minuta, revisa la demanda real y administra el período desde una sola vista." actions={<form className="flex items-end gap-2 rounded-2xl border border-[#DDE5E2] bg-white p-2 shadow-sm"><label className="text-[11px] font-black text-[#667572]">DESDE<input type="date" name="inicio" defaultValue={inicio} className="mt-1 block rounded-lg border border-[#DDE5E2] px-2 py-1.5 text-sm font-normal"/></label><label className="text-[11px] font-black text-[#667572]">HASTA<input type="date" name="fin" defaultValue={fin} className="mt-1 block rounded-lg border border-[#DDE5E2] px-2 py-1.5 text-sm font-normal"/></label><button className="self-end rounded-lg bg-[#0B2B32] px-3 py-2 text-sm font-black text-white">Ver</button></form>}/>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Almuerzos" value={almuerzos} helper={`${inicio} → ${fin}`}/>
      <StatCard label="Cenas" value={cenas} helper="Demanda activa"/>
      <StatCard label="Servicios" value={almuerzos+cenas} helper={`${instituciones.length} institución(es)`}/>
      <StatCard label="Reservas futuras" value={Number(res.reservas||0)} helper={`${Number(res.raciones||0)} raciones futuras`}/>
      <StatCard label="Pagos pendientes" value={Number(res.pendientes||0)} tone={Number(res.pendientes||0)>0?'warning':'success'} helper="Estado operacional"/>
    </section>

    <SectionCard title="Minuta del período" description={`${dias} día(s) con minuta. Las cantidades al lado de cada plato provienen de las reservas activas.`} actions={<div className="flex flex-wrap items-center gap-2"><StatusBadge value={flujo?.estado||min[0]?.estado||'Sin flujo'}/><form action={enviarAction}><input type="hidden" name="inicio" value={inicio}/><input type="hidden" name="fin" value={fin}/><button disabled={!min.length} className="rounded-xl border border-[#BFE7D0] bg-[#EFFAF3] px-3 py-2 text-xs font-black text-[#176B42] disabled:opacity-40">Enviar a Coordinación</button></form></div>}>
      <WeeklyMenuCalendar rows={min} demand={demanda}/>
      {flujo?.estado==='AUTORIZADA'&&<form action={publicarAction} className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#BFE7D0] bg-[#F1FBF5] p-4 sm:flex-row sm:items-center sm:justify-between"><input type="hidden" name="inicio" value={inicio}/><input type="hidden" name="fin" value={fin}/><label className="flex items-center gap-2 text-sm font-bold text-[#27423B]"><input type="checkbox" name="confirmar" value="PUBLICAR" required/> Confirmo la publicación del período autorizado</label><button className="rounded-xl bg-[#0B2B32] px-4 py-2 text-sm font-black text-white">Publicar período</button></form>}
    </SectionCard>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <SectionCard title="Gestionar minuta" description="Agrega una alternativa sin perder de vista el período que estás administrando.">
        <form action={minutaAction} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><input type="date" name="fecha" required className="rounded-xl border border-[#DDE5E2] p-2.5"/><select name="servicio" className="rounded-xl border border-[#DDE5E2] p-2.5"><option>Desayuno</option><option>Almuerzo</option><option>Once</option><option>Cena</option></select><select name="tipo_opcion" className="rounded-xl border border-[#DDE5E2] p-2.5"><option>OPCION 1</option><option>OPCION 2</option><option>HIPOCALORICO</option><option>TIPO R</option></select><input name="plato" required placeholder="Nombre del plato" className="rounded-xl border border-[#DDE5E2] p-2.5"/><button className="rounded-xl bg-[#169B62] px-3 py-2 font-black text-white">Agregar</button></form>
        <details className="mt-4 rounded-2xl border border-[#E5EBE8] bg-[#FAFCFB] p-3"><summary className="cursor-pointer text-sm font-black text-[#27423B]">Ver filas y estados del período</summary><div className="mt-3 overflow-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="text-left text-xs uppercase tracking-wide text-[#71807C]"><th className="py-2">Fecha</th><th>Servicio</th><th>Opción</th><th>Plato</th><th>Estado</th></tr></thead><tbody>{min.map((r:any)=><tr key={r.id} className="border-t border-[#EDF1EF]"><td className="py-2">{r.fecha}</td><td>{r.servicio}</td><td>{r.tipo_opcion}</td><td className="font-bold">{r.plato}</td><td><StatusBadge value={r.estado}/></td></tr>)}</tbody></table></div></details>
      </SectionCard>
      <SectionCard title="Reglas de reserva" description="Parámetros generales que gobiernan el calendario del comensal."><form action={reglasAction} className="space-y-3"><label className="block text-xs font-black text-[#667572]">ANTICIPACIÓN (HORAS)<input name="a" defaultValue={reg.anticipacion_reserva_horas} className="mt-1 w-full rounded-xl border border-[#DDE5E2] p-2.5 text-sm font-normal"/></label><label className="block text-xs font-black text-[#667572]">CANCELACIÓN (HORAS)<input name="c" defaultValue={reg.cancelacion_directa_horas} className="mt-1 w-full rounded-xl border border-[#DDE5E2] p-2.5 text-sm font-normal"/></label><label className="block text-xs font-black text-[#667572]">MÁXIMO DÍAS<input name="m" defaultValue={reg.max_dias_consecutivos} className="mt-1 w-full rounded-xl border border-[#DDE5E2] p-2.5 text-sm font-normal"/></label><label className="flex items-center gap-2 rounded-xl bg-[#F5F8F6] p-3 text-sm font-bold"><input type="checkbox" name="e" defaultChecked={Number(reg.excepciones_habilitadas)===1}/> Excepciones habilitadas</label><button className="w-full rounded-xl border border-[#169B62] px-4 py-2.5 text-sm font-black text-[#176B42]">Guardar reglas</button></form></SectionCard>
    </div>
  </div></AppShell>;
}
