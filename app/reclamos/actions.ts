'use server';
import { guardarReclamo } from '@/lib/db/comensal-gestion';
import { agregarAdjuntoInicial } from '@/lib/db/reclamos';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

function esc(v:unknown){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
function layout(title:string,content:string){
  const banner=String(process.env.SEPTEMBER_EMAIL_BANNER_URL||'').trim();
  return `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#14232d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f5;padding:24px 10px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border:1px solid #d7e1dc;border-radius:12px;overflow:hidden">${banner?`<tr><td style="padding:0"><img src="${esc(banner)}" alt="ALEMSI Casino" width="680" style="display:block;width:100%;max-width:680px;height:auto;border:0"/></td></tr>`:`<tr><td style="background:#0B2D5B;padding:20px 24px;color:white"><div style="font-size:20px;font-weight:800;letter-spacing:.5px">ALEMSI · CASINO MAMUIL</div><div style="margin-top:4px;color:#7FE1D6;font-size:12px;font-weight:700">ATENCIÓN AL COMENSAL</div></td></tr>`}<tr><td style="padding:24px"><div style="font-size:22px;font-weight:800;color:#0B2D5B;margin-bottom:18px">${esc(title)}</div>${content}</td></tr><tr><td style="border-top:1px solid #d7e1dc;padding:14px 24px;font-size:11px;color:#6b7570">ALEMSI · Casino Mamuil · Alimentamos bien, cuidamos a las personas.</td></tr></table></td></tr></table></body></html>`;
}

function plantillaConfirmacion(tipoOriginal:string){
  const tipo=tipoOriginal.trim().toLowerCase();
  if(tipo==='felicitación'||tipo==='felicitacion'){
    return {
      asunto:'Gracias por tu felicitación',
      apertura:'Muchas gracias por tomarte el tiempo de compartir tu felicitación con nosotros.',
      seguimiento:'Tu reconocimiento será compartido con el equipo o área correspondiente. Valoramos especialmente estos mensajes porque nos permiten reconocer el trabajo bien realizado.'
    };
  }
  if(tipo==='sugerencia'){
    return {
      asunto:'Hemos recibido tu sugerencia',
      apertura:'Gracias por compartir tu sugerencia. Tus comentarios son importantes para seguir mejorando el servicio.',
      seguimiento:'La revisaremos y la derivaremos al área que corresponda para su evaluación. El seguimiento quedará asociado al folio indicado en este correo.'
    };
  }
  return {
    asunto:'Hemos recibido tu reclamo',
    apertura:'Hemos recibido tu reclamo y queremos que sepas que será revisado con atención.',
    seguimiento:'Tu experiencia nos importa y nos ayuda a mejorar. Revisaremos los antecedentes del caso y realizaremos las gestiones, solicitudes de información o acciones que correspondan. El seguimiento y la respuesta quedarán asociados al mismo folio.'
  };
}

export async function reclamoAction(fd:FormData){
  const session=await getComensalSession();
  const rut=session?.rut||String(fd.get('rut')||'');
  const h=await headers(); const host=h.get('x-forwarded-host')||h.get('host'); const proto=h.get('x-forwarded-proto')||'https'; const origin=host?`${proto}://${host}`:undefined;
  const registro=await guardarReclamo(rut,String(fd.get('tipo')||''),String(fd.get('categoria')||''),String(fd.get('mensaje')||''),origin);
  const file=fd.get('archivo');
  if(file instanceof File&&file.size>0){
    if(file.size>10*1024*1024) throw new Error('El archivo supera 10 MB.');
    const permitidos=['application/pdf','image/jpeg','image/png','image/webp'];
    if(!permitidos.includes(file.type)) throw new Error('Adjunta PDF, JPG, PNG o WEBP.');
    await agregarAdjuntoInicial({reclamoId:registro.id,actor:registro.nombre||registro.rut,nombre:file.name||'antecedente',mime:file.type,bytes:new Uint8Array(await file.arrayBuffer())});
  }
  if(registro.correo){
    try{
      const folio=`R-${String(registro.id).padStart(6,'0')}`;
      const perfil=plantillaConfirmacion(registro.tipo);
      const tieneArchivo=file instanceof File&&file.size>0;
      const detalleGestion=registro.tipo.trim().toLowerCase()==='reclamo'
        ? 'Si necesitamos antecedentes adicionales o corresponde una gestión con Admin Casino, Coordinación, Gerencia o Finanzas, quedará vinculada a este mismo caso.'
        : 'Conserva este correo y el folio como comprobante de ingreso y referencia de seguimiento.';
      const html=layout(perfil.asunto,`
        <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#42515a">Hola <b>${esc(registro.nombre)}</b>,</p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#42515a">${esc(perfil.apertura)}</p>
        <table role="presentation" width="100%" style="border-collapse:collapse;background:#f7faf8;border:1px solid #d7e1dc">
          <tr><td style="padding:8px;color:#5b6670;width:38%">Folio de seguimiento</td><td style="padding:8px;font-weight:800;color:#0B2D5B">${esc(folio)}</td></tr>
          <tr><td style="padding:8px;color:#5b6670">Fecha y hora</td><td style="padding:8px;font-weight:700">${esc(registro.fecha)}</td></tr>
          <tr><td style="padding:8px;color:#5b6670">Tipo</td><td style="padding:8px;font-weight:700">${esc(registro.tipo)}</td></tr>
          <tr><td style="padding:8px;color:#5b6670">Categoría</td><td style="padding:8px;font-weight:700">${esc(registro.categoria)}</td></tr>
          <tr><td style="padding:8px;color:#5b6670">Estado</td><td style="padding:8px;font-weight:800;color:#087A46">Pendiente de revisión</td></tr>
        </table>
        <div style="margin-top:18px;padding:14px 16px;background:#eef7f6;border:1px solid #cfe5df;border-radius:8px;font-size:14px;line-height:1.5;color:#24434a"><b>Tu mensaje</b><br>${esc(registro.mensaje)}</div>
        <div style="margin-top:14px;padding:12px 14px;background:#f7faf8;border:1px solid #d7e1dc;border-radius:8px;font-size:13px;color:#42515a">${tieneArchivo?`<b>Antecedente recibido:</b> ${esc(file.name)}`:'No se adjuntaron antecedentes en este ingreso.'}</div>
        <p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:#42515a">${esc(perfil.seguimiento)}</p>
        <p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#42515a">${esc(detalleGestion)}</p>`);
      const text=[
        `Hola ${registro.nombre},`,perfil.apertura,`Folio de seguimiento: ${folio}`,`Fecha y hora: ${registro.fecha}`,`Tipo: ${registro.tipo}`,`Categoría: ${registro.categoria}`,'Estado: Pendiente de revisión',`Tu mensaje: ${registro.mensaje}`,
        tieneArchivo?`Antecedente recibido: ${file.name}`:'No se adjuntaron antecedentes en este ingreso.',perfil.seguimiento,detalleGestion,'ALEMSI · Casino Mamuil'
      ].join('\n\n');
      await enviarCorreoSmtp({to:registro.correo,subject:`ALEMSI · ${perfil.asunto} · ${folio}`,text,html});
    }catch(error){console.error('RECLAMO_SMTP_ERROR',error);}
  }
  redirect(`/reclamos?ok=1&folio=${encodeURIComponent(`R-${String(registro.id).padStart(6,'0')}`)}`);
}
