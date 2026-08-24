'use server';
import { guardarReclamo } from '@/lib/db/comensal-gestion';
import { agregarAdjuntoInicial } from '@/lib/db/reclamos';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { redirect } from 'next/navigation';

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
      await enviarCorreoSmtp({
        to:registro.correo,
        subject:`ALEMSI · ${registro.tipo} recibido · ${folio}`,
        text:[
          `Hola ${registro.nombre},`,
          `Hemos recibido y registrado tu ${registro.tipo.toLowerCase()}.`,
          `Folio: ${folio}`,
          `Fecha y hora: ${registro.fecha}`,
          `Categoría: ${registro.categoria}`,
          `Estado: Pendiente de revisión`,
          `Mensaje: ${registro.mensaje}`,
          file instanceof File&&file.size>0?`Antecedente adjunto registrado: ${file.name}`:'Sin archivo adjunto.',
          'Admin Casino revisará tu solicitud. El seguimiento y la respuesta quedarán asociados a este mismo registro.',
          'Conserva este correo como comprobante de ingreso.'
        ].join('\n\n')
      });
    }catch(error){console.error('RECLAMO_SMTP_ERROR',error);}
  }
  redirect(`/reclamos?ok=1&folio=${encodeURIComponent(`R-${String(registro.id).padStart(6,'0')}`)}`);
}
