'use server';
import { guardarReclamo } from '@/lib/db/comensal-gestion';
import { getComensalSession } from '@/lib/auth/comensal-session';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { redirect } from 'next/navigation';

export async function reclamoAction(fd:FormData){
  const session=await getComensalSession();
  const rut=session?.rut||String(fd.get('rut')||'');
  const registro=await guardarReclamo(rut,String(fd.get('tipo')||''),String(fd.get('categoria')||''),String(fd.get('mensaje')||''));
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
          'Admin Casino revisará tu solicitud. El seguimiento y la respuesta quedarán asociados a este mismo registro.',
          'Conserva este correo como comprobante de ingreso.'
        ].join('\n\n')
      });
    }catch(error){console.error('RECLAMO_SMTP_ERROR',error);}
  }
  redirect(`/reclamos?ok=1&folio=${encodeURIComponent(`R-${String(registro.id).padStart(6,'0')}`)}`);
}
