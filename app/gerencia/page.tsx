import AppShell from '@/components/AppShell';
import MinutaPublicada from '@/components/MinutaPublicada';
import { requireUser } from '@/lib/auth/session';
import { dashboardGerencia } from '@/lib/db/gerencia';
import { listarFinanzas } from '@/lib/db/finanzas';
import { obtenerMinutasRango } from '@/lib/db/minutas';
import { fechaHoraVisibleChile } from '@/lib/fecha-hora';

export const dynamic='force-dynamic';

function fechaChile(date:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}
function cicloViernesJueves(){const hoy=fechaChile(new Date());const [y,m,d]=hoy.split('-').map(Number);const base=new Date(Date.UTC(y,m-1,d,12));const retro=(base.getUTCDay()-5+7)%7;const ini=new Date(base);ini.setUTCDate(base.getUTCDate()-retro);const fin=new Date(ini);fin.setUTCDate(ini.getUTCDate()+6);return [ini.toISOString().slice(0,10),fin.toISOString().slice(0,10)] as const;}
function mesActualChile(){const hoy=fechaChile(new Date());const [y,m]=hoy.split('-');const last=new Date(Date.UTC(Number(y),Number(m),0)).getUTCDate();return{desde:`${y}-${m}-01`,hasta:`${y}-${m}-${String(last).padStart(2,'0')}`}}
function servicios(row:any){return Array.isArray(row.servicios)?row.servicios:[]}
function fechaEnRango(fecha:string,desde:string,hasta:string){return Boolean(fecha&&fecha>=desde&&fecha<=hasta)}
function montoRango(row:any,desde:string,hasta:string){return servicios(row).reduce((sum:number,s:any)=>sum+(fechaEnRango(String(s.fecha||''),desde,hasta)?Number(s.monto||0):0),0)}
function montoAnterior(row:any,desde:string){return servicios(row).reduce((sum:number,s:any)=>sum+(String(s.fecha||'')<desde?Number(s.monto||0):0),0)}
function esPagado(row:any){return ['PAGADO','APROBADO'].includes(String(row.estado_pago||'').trim().toUpperCase())||String(row.comprobante_estado||'').toUpperCase()==='VALIDADO'}
function esCobrable(row:any){const estado=String(row.estado_pago||'Pendiente').trim().toUpperCase();return !['NO APLICA','COSTO ASUMIDO','COSTO ASUMIDO / NO COBRABLE'].includes(estado)&&Number(row.total||0)>0}
function comprobantePorValidar(row:any){const estado=String(row.comprobante_estado||'').trim().toUpperCase();return Boolean(row.comprobante_id)&&!['VALIDADO','RECHAZADO'].includes(estado)}

export default async function Page({searchParams}:{searchParams:Promise<{inicio?:string;fin?:string}>}){
  const u=await requireUser(['Gerencia','AdminTotal']);
  const params=await searchParams;
  const rango=cicloViernesJueves();
  const inicio=/^\d{4}-\d{2}-\d{2}$/.test(params.inicio||'')?params.inicio!:rango[0];
  const fin=/^\d{4}-\d{2}-\d{2}$/.test(params.fin||'')&&params.fin!>=inicio?params.fin!:rango[1];
  const periodo=mesActualChile();
  const [d,minuta,finanzas]=await Promise.all([dashboardGerencia(),obtenerMinutasRango(inicio,fin),listarFinanzas()]);

  const reservadoPeriodo=finanzas.reduce((sum:number,row:any)=>sum+montoRango(row,periodo.desde,periodo.hasta),0);
  const pagadoPeriodo=finanzas.filter(esPagado).reduce((sum:number,row:any)=>sum+montoRango(row,periodo.desde,periodo.hasta),0);
  const pendientePeriodo=finanzas.filter((r:any)=>esCobrable(r)&&!esPagado(r)).reduce((sum:number,row:any)=>sum+montoRango(row,periodo.desde,periodo.hasta),0);
  const porValidarPeriodo=finanzas.filter(comprobantePorValidar).reduce((sum:number,row:any)=>sum+montoRango(row,periodo.desde,periodo.hasta),0);
  const deudaAnterior=finanzas.filter((r:any)=>esCobrable(r)&&!esPagado(r)).reduce((sum:number,row:any)=>sum+montoAnterior(row,periodo.desde),0);
  const saldoTotal=pendientePeriodo+deudaAnterior;

  return <AppShell user={u}><div className="space-y-5">
    <section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">GERENCIA · SOLO CONSULTA</p><h1 className="text-2xl font-black">Resumen ejecutivo</h1><p className="mt-1 text-sm text-[#6B7570]">Misma lectura financiera de Finanzas y misma minuta operativa estándar del sistema.</p></section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
      ['Reservado período',reservadoPeriodo],['Pagado período',pagadoPeriodo],['Pendiente período',pendientePeriodo],['Por validar período',porValidarPeriodo],['Deuda anterior acumulada',deudaAnterior],['Saldo total por recaudar',saldoTotal],
    ].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="text-sm text-[#6B7570]">{label}</div><div className="mt-1 text-2xl font-black text-[#0E2A23]">${Number(value).toLocaleString('es-CL')}</div></div>)}</section>
    <div className="text-sm text-[#6B7570]">Período financiero estándar: <b>{periodo.desde}</b> → <b>{periodo.hasta}</b></div>

    <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.14em] text-[#1DB954]">MINUTA OFICIAL PUBLICADA</p><h2 className="text-xl font-black">Ciclo operativo viernes → jueves</h2><p className="text-sm text-[#6B7570]">Vista estándar de 7 días · solo lectura.</p></div><form className="flex flex-wrap items-end gap-2"><label className="text-sm font-bold">Desde <input type="date" name="inicio" defaultValue={inicio} className="ml-1 rounded-lg border p-2"/></label><label className="text-sm font-bold">Hasta <input type="date" name="fin" defaultValue={fin} className="ml-1 rounded-lg border p-2"/></label><button className="rounded-lg border px-3 py-2 font-bold">Consultar</button></form></div><div className="mt-4"><MinutaPublicada rows={minuta as any} compactWeekly/></div></section>

    <section className="grid gap-5 lg:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Finanzas</h2><div className="mt-3 space-y-2"><div className="rounded-xl bg-[#F6F3EA] p-3"><b>Pagado período</b><div>${Number(pagadoPeriodo).toLocaleString('es-CL')}</div></div><div className="rounded-xl bg-[#F6F3EA] p-3"><b>Saldo por recaudar</b><div>${Number(saldoTotal).toLocaleString('es-CL')}</div></div></div></div><div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Producción</h2><div className="mt-3 space-y-2">{d.jornadas.map((r:any)=><div key={r.estado} className="rounded-xl bg-[#F6F3EA] p-3"><b>{r.estado}</b><div>{r.cantidad} jornadas</div></div>)}</div></div><div className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Bodega</h2><div className="mt-3 rounded-xl bg-[#F6F3EA] p-3"><b>Lotes con stock</b><div>{d.bodega.con_stock||0}</div></div></div></section>

    <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-black">Reporte consolidado de raciones</h2><div className="mt-3 grid gap-2 md:grid-cols-3">{d.produccion.map((r:any,i:number)=><div key={i} className="rounded-xl bg-[#F6F3EA] p-3"><b>{r.fecha} · {r.servicio}</b><div>{r.cantidad} raciones</div></div>)}</div></section>
    <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer text-xl font-black">Auditoría / Registro de actividad</summary><div className="mt-3 space-y-2 text-sm">{d.auditoria.map((r:any,i:number)=><div key={i} className="border-b pb-2"><b>{r.accion}</b> · {r.usuario} · {fechaHoraVisibleChile(new Date(r.fecha))}</div>)}</div></details>
  </div></AppShell>;
}
