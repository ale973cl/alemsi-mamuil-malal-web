import { NextResponse } from 'next/server';
import { comprobanteYaCargado, guardarComprobanteEnPostgres, obtenerReservaPorPagoToken } from '@/lib/db/comprobantes';
import { enviarCorreoSmtp } from '@/lib/email/smtp';
import { formatFechaHora, numeroReserva } from '@/lib/ui/format';

const MAX_BYTES = 10 * 1024 * 1024;
const MIME_PERMITIDOS = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const reserva = await obtenerReservaPorPagoToken(token);
    if (!reserva) return NextResponse.json({ error: 'El enlace de comprobante no es válido.' }, { status: 404 });
    if (await comprobanteYaCargado(token)) return NextResponse.json({ error: 'Ya existe un comprobante asociado a esta reserva.' }, { status: 409 });

    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Archivo no recibido.' }, { status: 400 });
    if (!MIME_PERMITIDOS.has(file.type)) return NextResponse.json({ error: 'Formato permitido: PDF, JPG o PNG.' }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo debe pesar entre 1 byte y 10 MB.' }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    await guardarComprobanteEnPostgres({
      token,
      referencia: reserva.referencia_reserva,
      rut: reserva.rut,
      nombre: file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180),
      mimeType: file.type,
      bytes,
    });

    const correo=String(reserva.correo||'').trim();
    if(correo){
      console.info('COMPROBANTE_EMAIL_START',{reserva:numeroReserva(reserva.codigo_reserva,reserva.referencia_reserva)});
      const delivery=await enviarCorreoSmtp({
        to:correo,
        subject:`ALEMSI · Comprobante recibido · Reserva ${numeroReserva(reserva.codigo_reserva,reserva.referencia_reserva)}`,
        text:[
          'Hola,',
          '',
          'Hemos recibido correctamente tu comprobante de pago.',
          `N.º de reserva: ${numeroReserva(reserva.codigo_reserva,reserva.referencia_reserva)}`,
          `Institución: ${reserva.institucion||'—'}`,
          `Fecha de recepción: ${formatFechaHora(new Date().toISOString())}`,
          '',
          'Finanzas revisará el comprobante. La carga del archivo no equivale todavía a pago validado.',
          '',
          'Saludos cordiales,',
          'ALEMSI · Casino Mamuil Malal',
        ].join('\n'),
      });
      if(delivery.ok) console.info('COMPROBANTE_EMAIL_OK'); else console.error('COMPROBANTE_EMAIL_ERROR',delivery.errorType);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('ALEMSI comprobante:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible guardar el comprobante.' }, { status: 500 });
  }
}
