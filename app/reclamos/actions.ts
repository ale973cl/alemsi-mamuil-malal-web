'use server';
import { guardarReclamo } from '@/lib/db/comensal-gestion';
import { agregarAdjuntoInicial } from '@/lib/db/reclamos';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { correoHtmlEstandar } from '@/lib/email/standard-layout';
import { redirect } from 'next/navigation';
import { fechaHoraVisibleChile } from '@/lib/fecha-hora';

function esc(v:unknown){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
function layout(title:string,content:string){return correoHtmlEstandar(title,content,'ATENCIÓN AL COMENSAL');}

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
  const registro=await guardarReclamo(rut,String(fd.get('tipo')||''),String(fd.get('categoria')||''),String(fd.get('mensaje')||''));
  const file=fd.get('archivo');
  if(file instanceof File&&file.size>0){
    if(file.size>5*1024*1024) throw new Error('El archivo supera 5 MB.');
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
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#42515a">${esc(perfil.apertura)}</p>
        <div style="margin-bottom:18px;padding:15px 16px;background:#eef7f6;border-left:4px solid #0D9B91;color:#24434a"><div style="font-size:11px;line-height:16px;color:#5b6670;text-transform:uppercase;letter-spacing:.4px">Estado del caso</div><div style="margin-top:3px;font-size:17px;line-height:22px;font-weight:800;color:#087A46">Pendiente de revisión</div></div>
        <table role="presentation" width="100%" style="border-collapse:collapse;background:#f7faf8;border:1px solid #d7e1dc">
          <tr><td style="padding:9px;color:#5b6670;width:38%">Tipo</td><td style="padding:9px;font-weight:700;color:#0B2D5B">${esc(registro.tipo)}</td></tr>
          <tr><td style="padding:9px;color:#5b6670;border-top:1px solid #e4ebe7">Categoría</td><td style="padding:9px;font-weight:700;color:#0B2D5B;border-top:1px solid #e4ebe7">${esc(registro.categoria)}</td></tr>
        </table>
        <div style="margin-top:18px;font-size:16px;font-weight:800;color:#0B2D5B">Mensaje recibido</div>
        <div style="margin-top:8px;padding:16px;background:#fff;border:1px solid #cfe5df;border-radius:8px;font-size:15px;line-height:1.6;color:#24434a">${esc(registro.mensaje)}</div>
        <div style="margin-top:14px;padding:12px 14px;background:#f7faf8;border:1px solid #d7e1dc;border-radius:8px;font-size:13px;color:#42515a">${tieneArchivo?`<b>Antecedente recibido:</b> ${esc(file.name)}`:'No se adjuntaron antecedentes en este ingreso.'}</div>
        <p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:#42515a">${esc(perfil.seguimiento)}</p>
        <p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#42515a">${esc(detalleGestion)}</p>
        <table role="presentation" width="100%" style="margin-top:18px;border-collapse:collapse;border-top:1px solid #d7e1dc;font-size:12px;color:#5b6670">
          <tr><td style="padding:9px 0;width:38%">Folio de seguimiento</td><td style="padding:9px 0;font-weight:700;color:#0B2D5B">${esc(folio)}</td></tr>
          <tr><td style="padding:0 0 9px">Fecha y hora</td><td style="padding:0 0 9px;font-weight:700;color:#0B2D5B">${esc(fechaHoraVisibleChile(new Date(registro.fecha)))}</td></tr>
        </table>`);
      const text=[
        `Hola ${registro.nombre},`,perfil.apertura,`Folio de seguimiento: ${folio}`,`Fecha y hora: ${fechaHoraVisibleChile(new Date(registro.fecha))}`,`Tipo: ${registro.tipo}`,`Categoría: ${registro.categoria}`,'Estado: Pendiente de revisión',`Tu mensaje: ${registro.mensaje}`,
        tieneArchivo?`Antecedente recibido: ${file.name}`:'No se adjuntaron antecedentes en este ingreso.',perfil.seguimiento,detalleGestion,'ALEMSI · Casino Mamuil'
      ].join('\n\n');
      await enviarCorreoSmtp({to:registro.correo,subject:`ALEMSI · Reclamo · ${folio}`,text,html,thread:{key:`alemsi-reclamo-${registro.id}-comensal`,reply:false}});
    }catch(error){console.error('RECLAMO_SMTP_ERROR',error);}
  }
  redirect(`/reclamos?ok=1&folio=${encodeURIComponent(`R-${String(registro.id).padStart(6,'0')}`)}`);
}
