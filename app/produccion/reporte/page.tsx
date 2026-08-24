import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PrintProductionReportButton from '@/components/PrintProductionReportButton';
import { requireUser } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';
import { enviarReporteProduccionAction } from './actions';

export const dynamic='force-dynamic';
function fechaChile(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function fechaValida(value?:string){return Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value));}
function fechaVisible(iso:string){const [y,m,d]=iso.split('-');return `${d}-${m}-${y}`;}

export default async function Page({searchParams}:{searchParams:Promise<{fecha?:string;origen?:string;envio?:string}>}){
 const u=await requireUser(['Cocina','AdminCasino','AdminTotal']); const q=await searchParams;
 const fecha=fechaValida(q.fecha)?q.fecha!:fechaChile(); const origen=q.origen==='admin'?'admin':'cocina';
 const volver=origen==='admin'?`/admin-casino/produccion?fecha=${fecha}`:`/cocina?fecha=${fecha}`;
 const rows=await detalleProduccionFecha(fecha); const servicios=[...new Set(rows.map(r=>r.servicio))]; const totalGeneral=rows.length;
 return <AppShell user={u}>
 <style>{`@page{size:Letter portrait;margin:7mm}@media print{.app-shell-nav,nav,aside,.print-hide{display:none!important}body{font-size:8pt;line-height:1.15;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report-page{max-width:none!important;margin:0!important}.report-head{margin:0 0 4mm!important}.service-block{border:0!important;padding:0!important;margin:0 0 4mm!important}.dish-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:3mm!important;align-items:start!important}.dish-card{break-inside:avoid!important;page-break-inside:avoid!important;border:1px solid #9fb9ae!important;border-radius:0!important}.dish-head{padding:2mm!important;background:#f7faf8!important;border-bottom:1px solid #9fb9ae!important}.dish-head h3{font-size:9.5pt!important;line-height:1.12!important}.institution-row{display:grid!important;grid-template-columns:25mm 1fr 7mm!important;gap:1.5mm!important;padding:1.5mm 2mm!important;font-size:7.2pt!important}.service-summary{break-inside:avoid!important;margin-top:2.5mm!important;padding:2mm!important;font-size:7.2pt!important}.report-footer{font-size:6.5pt!important;margin-top:2mm!important;padding-top:2mm!important}}`}</style>
 <div className="report-page mx-auto max-w-5xl space-y-4">
  <section className="report-head bg-white">
   <div className="border-b-4 border-[#0B3B78] px-4 py-4 text-center print:px-0 print:py-2">
    <div className="text-[22px] font-black tracking-tight text-[#0B3B78] print:text-[16pt]">ALEMSI · CASINO MAMUIL</div>
    <div className="mt-1 text-[19px] font-black text-[#0B3B78] print:text-[13pt]">REPORTE DIARIO DE PRODUCCIÓN</div>
   </div>
   <div className="grid grid-cols-2 border border-[#9fb9ae] text-sm print:text-[8pt]"><div className="bg-[#f4f7f5] p-2"><b>Fecha</b> &nbsp; {fechaVisible(fecha)}</div><div className="p-2 text-right"><b>Total general</b> &nbsp; {totalGeneral} raciones</div></div>
   <div className="print-hide mt-3 flex flex-wrap items-end justify-between gap-3"><div className="flex gap-2"><Link href={volver} className="rounded-lg border border-[#0B2D5B] px-4 py-2 text-sm font-black text-[#0B2D5B]">← Volver</Link><PrintProductionReportButton/></div><form className="flex items-end gap-2"><input type="hidden" name="origen" value={origen}/><label className="text-sm font-bold">Fecha<input type="date" name="fecha" defaultValue={fecha} className="ml-2 rounded-lg border p-2"/></label><button className="rounded-lg bg-[#0B2D5B] px-4 py-2 font-bold text-white">Consultar</button></form></div>
  </section>
  {q.envio&&<div className="print-hide rounded-xl border p-3 text-sm font-bold">{q.envio==='ok'?'Reporte enviado por correo correctamente.':`Estado de envío: ${q.envio}`}</div>}
  <section className="print-hide rounded-xl border bg-white p-4"><form action={enviarReporteProduccionAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="fecha" value={fecha}/><input type="hidden" name="origen" value={origen}/><label className="text-sm font-bold">Enviar reporte a<input type="email" name="correo" required placeholder="correo@empresa.cl" className="ml-2 rounded-lg border p-2"/></label><button disabled={!rows.length} className="rounded-lg bg-[#087A46] px-4 py-2 font-black text-white disabled:opacity-40">Enviar correo</button></form></section>
  {!rows.length&&<section className="rounded border p-4">No hay reservas activas con plato para esta fecha.</section>}
  {servicios.map(servicio=>{const sr=rows.filter(r=>r.servicio===servicio);const grupos=[...new Set(sr.map(r=>`${r.tipo_opcion||'Sin opción'}|||${r.plato}`))];return <section key={servicio} className="service-block rounded-xl border border-[#9fb9ae] bg-white p-4">
   <div className="mb-3 grid grid-cols-[1fr_auto] overflow-hidden border border-[#9fb9ae]"><div className="bg-[#087A46] px-3 py-2 font-black text-white">{servicio.toUpperCase()}</div><div className="bg-[#0B3B78] px-4 py-2 font-black text-white">{sr.length} RACIONES</div></div>
   <div className="dish-grid grid gap-3 md:grid-cols-2">{grupos.map(key=>{const [opcion,plato]=key.split('|||');const pr=sr.filter(r=>(r.tipo_opcion||'Sin opción')===opcion&&r.plato===plato);const instituciones=[...new Set(pr.map(r=>r.institucion))];return <article key={key} className="dish-card overflow-hidden border border-[#9fb9ae]">
    <div className="dish-head bg-[#f7faf8] p-3"><div className="text-[10px] font-black uppercase text-[#087A46]">{opcion}</div><div className="flex gap-2"><h3 className="flex-1 text-base font-black text-[#0B2D5B]">{plato}</h3><b className="text-base text-[#0B2D5B]">{pr.length}</b></div></div>
    <div>{instituciones.map(inst=>{const personas=pr.filter(r=>r.institucion===inst);return <div key={inst} className="institution-row grid grid-cols-[130px_1fr_35px] gap-2 border-t border-[#cbd9d3] p-2"><b>{inst}</b><span>{personas.map(p=>p.nombre).join(', ')}</span><b className="text-right">{personas.length}</b></div>})}</div>
   </article>})}</div>
   <div className="service-summary mt-3 border border-[#9fb9ae] p-3"><b className="text-[#0B2D5B]">RESUMEN {servicio.toUpperCase()}</b><div className="mt-1 grid gap-x-5 gap-y-1 md:grid-cols-2 print:grid-cols-2">{grupos.map(key=>{const [opcion,plato]=key.split('|||');const n=sr.filter(r=>(r.tipo_opcion||'Sin opción')===opcion&&r.plato===plato).length;return <div key={key} className="flex justify-between gap-2"><span>{opcion} · {plato}</span><b>{n}</b></div>})}</div><div className="mt-2 flex justify-between border-t border-[#9fb9ae] pt-2 font-black"><span>TOTAL {servicio.toUpperCase()}</span><span>{sr.length}</span></div></div>
  </section>})}
  <footer className="report-footer border-t border-[#9fb9ae] py-2 text-center text-xs font-bold text-[#52615b]">ALEMSI · Casino Mamuil · Producción diaria</footer>
 </div></AppShell>;
}
