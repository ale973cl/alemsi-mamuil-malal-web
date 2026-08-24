import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PrintProductionReportButton from '@/components/PrintProductionReportButton';
import { requireUser } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';
import { enviarReporteProduccionAction } from './actions';

export const dynamic='force-dynamic';

function fechaChile(date=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function fechaValida(value?:string){return Boolean(value&&/^\d{4}-\d{2}-\d{2}$/.test(value));}
function fechaVisible(iso:string){const [y,m,d]=iso.split('-');return `${d}-${m}-${y}`;}

export default async function Page({searchParams}:{searchParams:Promise<{fecha?:string;origen?:string;envio?:string}>}){
  const u=await requireUser(['Cocina','AdminCasino','AdminTotal']);
  const q=await searchParams;
  const fecha=fechaValida(q.fecha)?q.fecha!:fechaChile();
  const origen=q.origen==='admin'?'admin':'cocina';
  const volver=origen==='admin'?`/admin-casino/produccion?fecha=${fecha}`:`/cocina?fecha=${fecha}`;
  const rows=await detalleProduccionFecha(fecha);
  const servicios=[...new Set(rows.map(r=>r.servicio))];
  const totalGeneral=rows.length;

  return <AppShell user={u}>
    <style>{`
      @page { size: Letter portrait; margin: 8mm; }
      @media print {
        html, body { width: 215.9mm; min-height: 279.4mm; background: white !important; }
        body { font-size: 8.5pt; line-height: 1.18; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .report-page { width: auto !important; max-width: none !important; margin: 0 !important; }
        .report-header { margin-bottom: 4mm !important; }
        .service-block { border: 0 !important; padding: 0 !important; margin-top: 4mm !important; break-before: auto; }
        .service-title { margin-bottom: 2.5mm !important; padding-bottom: 1.5mm !important; }
        .dish-grid { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 3mm !important; align-items: start !important; }
        .dish-card { break-inside: avoid !important; page-break-inside: avoid !important; border-radius: 2mm !important; }
        .dish-head { padding: 2.2mm 2.5mm !important; }
        .dish-head h3 { font-size: 10pt !important; line-height: 1.1 !important; }
        .dish-head .option { font-size: 6.8pt !important; }
        .institution-row { display: grid !important; grid-template-columns: 28mm minmax(0,1fr) 8mm !important; gap: 1.5mm !important; padding: 1.8mm 2.5mm !important; font-size: 7.4pt !important; line-height: 1.15 !important; }
        .service-summary { margin-top: 2.5mm !important; padding: 2mm 2.5mm !important; font-size: 7.4pt !important; break-inside: avoid !important; }
        .report-footer { padding: 2mm 0 0 !important; margin-top: 3mm !important; font-size: 6.8pt !important; }
      }
    `}</style>
    <div className="report-page mx-auto max-w-5xl space-y-5 print:space-y-0">
    <section className="report-header overflow-hidden rounded-2xl border border-[#0B2D5B]/20 bg-white print:rounded-none print:border-0">
      <div className="bg-[#0B2D5B] px-5 py-4 text-white print:px-3 print:py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/40 bg-white text-[10px] font-black leading-tight text-[#0B2D5B] print:h-9 print:w-9">ALEMSI</div><div><div className="text-sm font-black tracking-[.16em]">ALEMSI</div><div className="text-xs font-bold tracking-[.12em] text-[#7FE1D6] print:text-[7pt]">SERVICIOS INTEGRALES · ADMINISTRACIÓN DE CASINOS</div></div></div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-black print:px-3 print:py-1 print:text-[7pt]">REPORTE OPERATIVO</div>
        </div>
      </div>
      <div className="p-5 print:p-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-extrabold tracking-[.18em] text-[#0D9B91] print:text-[7pt]">PRODUCCIÓN DIARIA</p><h1 className="text-2xl font-black text-[#0B2D5B] print:text-[15pt]">Reporte diario de cocina</h1><p className="text-sm text-[#5B6670] print:text-[8pt]">Fecha: <b>{fechaVisible(fecha)}</b> · Total general: <b>{totalGeneral} raciones</b></p></div>
          <div className="flex flex-wrap gap-2 print:hidden"><Link href={volver} className="rounded-lg border border-[#0B2D5B] px-4 py-2 text-sm font-black text-[#0B2D5B]">← Volver a producción</Link><PrintProductionReportButton/></div>
        </div>
        <form className="mt-4 flex flex-wrap items-end gap-2 print:hidden"><input type="hidden" name="origen" value={origen}/><label className="text-sm font-bold">Fecha<input type="date" name="fecha" defaultValue={fecha} className="mt-1 block rounded-lg border p-2"/></label><button className="rounded-lg bg-[#0B2D5B] px-4 py-2 font-bold text-white">Consultar</button></form>
      </div>
    </section>

    {q.envio&&<div className={`rounded-xl border p-4 text-sm font-bold print:hidden ${q.envio==='ok'?'border-[#0D9B91]/30 bg-[#0D9B91]/10 text-[#0B2D5B]':'border-amber-300 bg-amber-50 text-amber-900'}`}>{q.envio==='ok'?'Reporte enviado por correo correctamente.':q.envio==='sin-datos'?'No hay producción para enviar en la fecha seleccionada.':q.envio==='datos-invalidos'?'Revisa la fecha y el correo destinatario.':`No fue posible enviar el correo (${q.envio.replace('error-','')}).`}</div>}

    <section className="rounded-2xl border border-[#0D9B91]/25 bg-white p-5 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.16em] text-[#0D9B91]">DISTRIBUCIÓN</p><h2 className="text-lg font-black text-[#0B2D5B]">Enviar este reporte por correo</h2><p className="text-sm text-[#5B6670]">Envía el resumen de la misma fecha y un enlace al reporte revisado.</p></div>
      <form action={enviarReporteProduccionAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="fecha" value={fecha}/><input type="hidden" name="origen" value={origen}/><label className="text-sm font-bold">Destinatario<input type="email" name="correo" required placeholder="correo@empresa.cl" className="mt-1 block min-w-64 rounded-lg border p-2"/></label><button disabled={!rows.length} className="rounded-lg bg-[#0D9B91] px-4 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Enviar reporte</button></form></div>
    </section>

    {!rows.length&&<section className="rounded-2xl border bg-white p-5"><p className="font-bold">No hay reservas activas con plato para esta fecha.</p></section>}

    {servicios.map(servicio=>{
      const sr=rows.filter(r=>r.servicio===servicio);
      const grupos=[...new Set(sr.map(r=>`${r.tipo_opcion||'Sin opción'}|||${r.plato}`))];
      return <section key={servicio} className="service-block rounded-2xl border border-[#0B2D5B]/20 bg-white p-5">
        <div className="service-title mb-4 flex items-center justify-between gap-3 border-b border-[#0D9B91]/30 pb-2"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-[#0D9B91] print:text-[6.8pt]">Servicio</div><h2 className="text-xl font-black text-[#0B2D5B] print:text-[12pt]">{servicio}</h2></div><span className="rounded-full bg-[#0D9B91]/10 px-3 py-1 font-black text-[#0B2D5B] print:text-[8pt]">{sr.length} raciones</span></div>
        <div className="dish-grid grid gap-4 md:grid-cols-2">{grupos.map(key=>{
          const [opcion,plato]=key.split('|||');
          const pr=sr.filter(r=>(r.tipo_opcion||'Sin opción')===opcion&&r.plato===plato);
          const instituciones=[...new Set(pr.map(r=>r.institucion))];
          return <article key={key} className="dish-card overflow-hidden rounded-xl border border-[#0B2D5B]/15"><div className="dish-head bg-[#EEF7F6] p-3"><div className="option text-xs font-black uppercase tracking-wide text-[#0D9B91]">{opcion}</div><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black text-[#0B2D5B]">{plato}</h3><div className="shrink-0 text-lg font-black text-[#0B2D5B]">{pr.length}</div></div></div><div className="divide-y divide-[#0B2D5B]/10">{instituciones.map(inst=>{const personas=pr.filter(r=>r.institucion===inst);return <div key={inst} className="institution-row grid gap-1 p-3 sm:grid-cols-[145px_1fr_40px]"><div className="font-black text-[#0B2D5B]">{inst}</div><div className="text-sm print:text-[7.4pt]">{personas.map(p=>p.nombre).join(', ')}</div><div className="text-sm font-black text-right print:text-[7.4pt]">{personas.length}</div></div>})}</div></article>
        })}</div>
        <div className="service-summary mt-4 rounded-xl bg-[#F5F8FA] p-3"><div className="font-black text-[#0B2D5B]">Resumen {servicio}</div><div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-1 text-sm print:grid-cols-2 print:text-[7.4pt]">{grupos.map(key=>{const [opcion,plato]=key.split('|||');const n=sr.filter(r=>(r.tipo_opcion||'Sin opción')===opcion&&r.plato===plato).length;return <div key={`res-${key}`} className="flex justify-between gap-3"><span>{opcion} · {plato}</span><b>{n}</b></div>})}<div className="mt-1 flex justify-between border-t border-[#0B2D5B]/20 pt-1 font-black"><span>TOTAL {servicio.toUpperCase()}</span><b>{sr.length}</b></div></div></div>
      </section>;
    })}
    <footer className="report-footer border-t border-[#0D9B91]/30 py-3 text-center text-xs font-bold text-[#5B6670]">ALEMSI · Servicios Integrales · Reporte generado desde Producción</footer>
  </div></AppShell>;
}
