'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { correoHtmlEstandar, escCorreo } from '@/lib/email/standard-layout';
import { agruparProduccion } from '@/lib/produccion/agrupacion';
import { generarProduccionPdf } from '@/lib/email/produccion-pdf';

function fechaValida(value:string){ return /^\d{4}-\d{2}-\d{2}$/.test(value); }
function correoValido(value:string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function fechaVisible(iso:string){ const [y,m,d]=iso.split('-'); return `${d}-${m}-${y}`; }
function destino(origen:string,fecha:string,estado:string){const safeOrigen=origen==='admin'?'admin':'cocina';return `/produccion/reporte?fecha=${encodeURIComponent(fecha)}&origen=${safeOrigen}&envio=${estado}`;}

export async function enviarReporteProduccionAction(formData:FormData){
  await requireUser(['Cocina','AdminCasino','AdminTotal']);
  const fecha=String(formData.get('fecha')||'').trim(); const correo=String(formData.get('correo')||'').trim(); const origen=String(formData.get('origen')||'cocina').trim();
  if(!fechaValida(fecha) || !correoValido(correo)) redirect(destino(origen,fecha||'', 'datos-invalidos'));
  const rows=await detalleProduccionFecha(fecha); if(!rows.length) redirect(destino(origen,fecha,'sin-datos'));
  const grupos=agruparProduccion(rows);

  const bloques=grupos.map(g=>`<div style="margin-top:20px"><div style="background:#0B3B78;color:#fff;padding:10px 12px;font-weight:800">${escCorreo(g.servicio)} <span style="float:right">${g.total} raciones</span></div>${g.preparaciones.map(p=>`<div style="border:1px solid #d7e1dc;border-top:0;padding:12px"><div style="font-size:12px;font-weight:800;color:#0D9B91">${escCorreo(p.opcion)} · ${p.total} raciones</div><div style="margin-top:3px;font-size:15px;font-weight:800;color:#0B2D5B">${escCorreo(p.plato)}</div>${p.instituciones.map(i=>`<div style="margin-top:10px;background:#f7faf8;padding:8px 10px"><div style="font-size:11px;font-weight:800;color:#0B3B78">${escCorreo(i.institucion)} · ${i.personas.length} ${i.personas.length===1?'ración':'raciones'}</div><div style="margin-top:4px;font-size:12px;color:#42515a">${i.personas.map(persona=>escCorreo(persona.nombre)).join(' · ')}</div></div>`).join('')}</div>`).join('')}</div>`).join('');
  const html=correoHtmlEstandar('Reporte diario de producción',`<table role="presentation" width="100%" style="border-collapse:collapse;background:#f7faf8;border:1px solid #d7e1dc"><tr><td style="padding:10px;color:#5b6670">Fecha</td><td style="padding:10px;font-weight:800;color:#0B2D5B">${escCorreo(fechaVisible(fecha))}</td></tr><tr><td style="padding:10px;color:#5b6670">Comensales</td><td style="padding:10px;font-weight:800;color:#0B2D5B">${new Set(rows.map(r=>r.rut)).size}</td></tr><tr><td style="padding:10px;color:#5b6670">Raciones</td><td style="padding:10px;font-weight:800;color:#087A46">${rows.length}</td></tr></table>${bloques}<div style="margin-top:18px;padding:12px;background:#eef7f6;border-left:4px solid #0D9B91;font-size:12px;color:#42515a">Se adjunta el PDF consolidado con la misma estructura operativa.</div>`);

  const lineas:string[]=[`ALEMSI · REPORTE DIARIO DE PRODUCCIÓN`,`Fecha: ${fechaVisible(fecha)}`,`Comensales: ${new Set(rows.map(r=>r.rut)).size}`,`Total general: ${rows.length} raciones`,''];
  for(const g of grupos){lineas.push(`${g.servicio.toUpperCase()} · ${g.total} raciones`);for(const p of g.preparaciones){lineas.push(`${p.opcion} · ${p.plato} · ${p.total} raciones`);for(const i of p.instituciones)lineas.push(`  ${i.institucion} · ${i.personas.length}: ${i.personas.map(x=>x.nombre).join(', ')}`);}lineas.push('');}
  const h=await headers();const host=h.get('x-forwarded-host')||h.get('host');const proto=h.get('x-forwarded-proto')||'https';if(host)lineas.push(`Reporte en sistema: ${proto}://${host}/produccion/reporte?fecha=${encodeURIComponent(fecha)}&origen=${origen==='admin'?'admin':'cocina'}`);
  const pdf=await generarProduccionPdf(fecha,rows);
  const result=await enviarCorreoSmtp({to:correo,subject:`ALEMSI · Producción diaria ${fechaVisible(fecha)}`,text:lineas.join('\n'),html,attachments:[{filename:`ALEMSI-Produccion-${fecha}.pdf`,contentType:'application/pdf',content:pdf}]});
  redirect(destino(origen,fecha,result.ok?'ok':`error-${result.errorType}`));
}
