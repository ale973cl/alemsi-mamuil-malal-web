import { NextResponse } from 'next/server';
import { comprobanteYaCargado, guardarComprobanteEnPostgres, obtenerReservaPorPagoToken } from '@/lib/db/comprobantes';
import { notificarComprobanteRecibido } from '@/lib/email/notificaciones';

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

    const correo = reserva.correo
      ? await notificarComprobanteRecibido({ correo: reserva.correo, referencia: reserva.referencia_reserva, pagoToken: token, origin: new URL(request.url).origin })
      : null;

    return NextResponse.json({ ok: true, correo });
  } catch (error) {
    console.error('ALEMSI comprobante:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible guardar el comprobante.' }, { status: 500 });
  }
}
