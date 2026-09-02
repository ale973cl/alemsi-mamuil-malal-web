'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { correoHtmlEstandar, escCorreo } from '@/lib/email/standard-layout';

function fechaValida(value:string){ return /^\d{4}-\d{2}-\d{2}$/.test(value); }
function correoValido(value:string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function fechaVisible(iso:string){ const [y,m,d]=iso.split('-'); return `${d}-${m}-${y}`; }
function destino(origen:string,fecha:string,estado:string){
  const safeOrigen=origen==='admin'?'admin':'cocina';
  return `/produccion/reporte?fecha=${encodeURIComponent(fecha)}&origen=${safeOrigen}&envio=${estado}`;
}

export async function enviarReporteProduccionAction(formData:FormData){
  await requireUser(['Cocina','AdminCasino','AdminTotal']);
  const fecha=String(formData.get('fecha')||'').trim();
  const correo=String(formData.get('correo')||'').trim();
  const origen=String(formData.get('origen')||'cocina').trim();
  if(!fechaValida(fecha) || !correoValido(correo)) redirect(destino(origen,fecha||'', 'datos-invalidos'));

  const rows=await detalleProduccionFecha(fecha);
  if(!rows.length) redirect(destino(origen,fecha,'sin-datos'));

  const servicios=[...new Set(rows.map(r=>r.servicio))];
  const comensales=new Set(rows.map(r=>r.rut)).size;
  const lineas:string[]=[
    'ALEMSI · REPORTE DIARIO DE PRODUCCIÓN',
    `Fecha: ${fechaVisible(fecha)}`,
    `Total general: ${rows.length} raciones`,
    '',
  ];
  for(const servicio of servicios){
    const sr=rows.filter(r=>r.servicio===servicio);
    lineas.push(`${servicio.toUpperCase()} · ${sr.length} raciones`);
    const grupos=[...new Set(sr.map(r=>`${r.tipo_opcion||'Sin opción'}|||${r.plato}`))];
    for(const key of grupos){
      const [opcion,plato]=key.split('|||');
      const pr=sr.filter(r=>(r.tipo_opcion||'Sin opción')===opcion && r.plato===plato);
      lineas.push(`- ${opcion} · ${plato}: ${pr.length}`);
      for(const inst of [...new Set(pr.map(r=>r.institucion))]){
        const personas=pr.filter(r=>r.institucion===inst);
        lineas.push(`  ${inst}: ${personas.map(p=>p.nombre).join(', ')} (${personas.length})`);
      }
    }
    lineas.push('');
  }

  const h=await headers();
  const host=h.get('x-forwarded-host')||h.get('host');
  const proto=h.get('x-forwarded-proto')||'https';
  const reporteUrl=host?`${proto}://${host}/produccion/reporte?fecha=${encodeURIComponent(fecha)}&origen=${origen==='admin'?'admin':'cocina'}`:'';
  if(reporteUrl) lineas.push(`Reporte en sistema: ${reporteUrl}`);
  lineas.push('', 'ALEMSI · Servicios Integrales');

  const secciones=servicios.map(servicio=>{
    const sr=rows.filter(r=>r.servicio===servicio);
    const grupos=[...new Set(sr.map(r=>`${r.tipo_opcion||'Sin opción'}|||${r.plato}`))];
    const filas=grupos.flatMap(key=>{
      const [opcion,plato]=key.split('|||');
      const pr=sr.filter(r=>(r.tipo_opcion||'Sin opción')===opcion&&r.plato===plato);
      return [...new Set(pr.map(r=>r.institucion))].map(institucion=>{
        const personas=pr.filter(r=>r.institucion===institucion);
        return `<tr>
          <td style="padding:8px;border-top:1px solid #d7e1dc;vertical-align:top">${escCorreo(opcion)}</td>
          <td style="padding:8px;border-top:1px solid #d7e1dc;vertical-align:top;font-weight:700;color:#0B2D5B">${escCorreo(plato)}</td>
          <td style="padding:8px;border-top:1px solid #d7e1dc;vertical-align:top">${escCorreo(institucion)}</td>
          <td style="padding:8px;border-top:1px solid #d7e1dc;vertical-align:top">${personas.map(p=>escCorreo(p.nombre)).join('<br>')}</td>
          <td style="padding:8px;border-top:1px solid #d7e1dc;vertical-align:top;text-align:center;font-weight:800">${personas.length}</td>
        </tr>`;
      });
    }).join('');
    return `<div style="margin-top:22px">
      <table role="presentation" width="100%" style="border-collapse:collapse;background:#0B2D5B;color:#fff"><tr><td style="padding:10px 12px;font-size:15px;font-weight:800">${escCorreo(servicio)}</td><td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:800">${sr.length} raciones</td></tr></table>
      <table role="table" width="100%" style="border-collapse:collapse;border:1px solid #d7e1dc;font-size:12px">
        <thead><tr style="background:#eef7f6;color:#0B2D5B"><th style="padding:8px;text-align:left">Opción</th><th style="padding:8px;text-align:left">Plato</th><th style="padding:8px;text-align:left">Institución</th><th style="padding:8px;text-align:left">Comensales</th><th style="padding:8px;text-align:center">Cant.</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
  }).join('');

  const html=correoHtmlEstandar('Reporte diario de producción',`
    <table role="presentation" width="100%" style="border-collapse:collapse;background:#f7faf8;border:1px solid #d7e1dc">
      <tr><td style="padding:10px;text-align:center"><div style="font-size:11px;color:#5b6670">FECHA</div><b style="color:#0B2D5B">${escCorreo(fechaVisible(fecha))}</b></td><td style="padding:10px;text-align:center;border-left:1px solid #d7e1dc"><div style="font-size:11px;color:#5b6670">COMENSALES</div><b style="font-size:18px;color:#087A46">${comensales}</b></td><td style="padding:10px;text-align:center;border-left:1px solid #d7e1dc"><div style="font-size:11px;color:#5b6670">RACIONES</div><b style="font-size:18px;color:#087A46">${rows.length}</b></td></tr>
    </table>
    ${secciones}
    <table role="presentation" width="100%" style="margin-top:20px;border-collapse:collapse;background:#eef7f6;border:1px solid #cfe5df"><tr><td style="padding:12px;font-weight:800;color:#0B2D5B">TOTAL GENERAL</td><td style="padding:12px;text-align:right;font-size:17px;font-weight:800;color:#087A46">${rows.length} raciones</td></tr></table>
    ${reporteUrl?`<div style="margin-top:20px;text-align:center"><a href="${escCorreo(reporteUrl)}" style="display:inline-block;background:#0D9B91;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:8px">Abrir reporte en el sistema</a></div>`:''}
  `,'COCINA / PRODUCCIÓN');

  const result=await enviarCorreoSmtp({
    to:correo,
    subject:`ALEMSI · Producción diaria ${fechaVisible(fecha)}`,
    text:lineas.join('\n'),
    html,
  });
  redirect(destino(origen,fecha,result.ok?'ok':`error-${result.errorType}`));
}
