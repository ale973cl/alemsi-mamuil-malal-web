'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { detalleProduccionFecha } from '@/lib/db/produccion-vista';
import { enviarCorreoSmtp } from '@/lib/email/smtp';

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
  if(host) lineas.push(`Reporte en sistema: ${proto}://${host}/produccion/reporte?fecha=${encodeURIComponent(fecha)}&origen=${origen==='admin'?'admin':'cocina'}`);
  lineas.push('', 'ALEMSI · Servicios Integrales');

  const result=await enviarCorreoSmtp({
    to:correo,
    subject:`ALEMSI · Producción diaria ${fechaVisible(fecha)}`,
    text:lineas.join('\n'),
  });
  redirect(destino(origen,fecha,result.ok?'ok':`error-${result.errorType}`));
}
