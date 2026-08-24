'use server';
import { guardarReclamo } from '@/lib/db/comensal-gestion';
import { agregarAdjuntoInicial } from '@/lib/db/reclamos';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { redirect } from 'next/navigation';

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
      await enviarCorreoSmtp({
        to:registro.correo,
        subject:`ALEMSI · ${perfil.asunto} · ${folio}`,
        text:[
          `Hola ${registro.nombre},`,
          perfil.apertura,
          `Folio de seguimiento: ${folio}`,
          `Fecha y hora: ${registro.fecha}`,
          `Tipo: ${registro.tipo}`,
          `Categoría: ${registro.categoria}`,
          `Estado: Pendiente de revisión`,
          `Tu mensaje: ${registro.mensaje}`,
          tieneArchivo?`Antecedente recibido: ${file.name}`:'No se adjuntaron antecedentes en este ingreso.',
          perfil.seguimiento,
          registro.tipo.trim().toLowerCase()==='reclamo'
            ? 'Si necesitamos antecedentes adicionales o corresponde una gestión con Admin Casino, Coordinación, Gerencia o Finanzas, quedará vinculada a este mismo caso.'
            : 'Conserva este correo y el folio como comprobante de ingreso y referencia de seguimiento.',
          'ALEMSI · Servicios de Higiene y Desinfección'
        ].join('\n\n')
      });
    }catch(error){console.error('RECLAMO_SMTP_ERROR',error);}
  }
  redirect(`/reclamos?ok=1&folio=${encodeURIComponent(`R-${String(registro.id).padStart(6,'0')}`)}`);
}
