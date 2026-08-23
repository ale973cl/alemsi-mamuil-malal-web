import { notFound } from 'next/navigation';
import ComprobanteUploader from '@/components/ComprobanteUploader';
import { comprobanteYaCargado, obtenerReservaPorPagoToken } from '@/lib/db/comprobantes';

export const dynamic = 'force-dynamic';

export default async function ComprobantePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reserva = await obtenerReservaPorPagoToken(token);
  if (!reserva) notFound();
  const cargado = await comprobanteYaCargado(token);
  const estado = String(reserva.estado_pago || '').toUpperCase();
  const recarga =  estado.includes('RECHAZ');

  return (
    <main className="min-h-screen bg-[#F6F3EA] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[#A6B0AA]/35 bg-[#FFFDF8] shadow-[0_18px_60px_rgba(14,42,35,0.08)]">
        <header className="bg-[#0E2A23] px-6 py-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DB954]">ALEMSI · Pago</p>
          <h1 className="mt-1 text-2xl font-extrabold">Comprobante de reserva</h1>
          <p className="mt-2 text-sm text-white/70">{reserva.referencia_reserva}</p>
        </header>
        <div className="p-6">
          {cargado ? (
            <div className="rounded-2xl border border-[#1DB954]/30 bg-[#1DB954]/10 p-5">
              <h2 className="font-extrabold text-[#0E2A23]">✓ Comprobante recibido</h2>
              <p className="mt-1 text-sm text-[#6B7570]">Finanzas realizará la validación. La carga del archivo no equivale todavía a pago validado.</p>
            </div>
          ) : (
            <><ComprobanteUploader token={token} />{reserva.estado_pago==='Rechazado'&&<p className="mt-3 text-sm font-semibold text-[#9B2C2C]">El comprobante anterior fue rechazado. Puedes cargar uno nuevo para la misma reserva.</p>}</>
          )}
          <a className="mt-5 inline-flex font-bold text-[#0E2A23] underline" href={`/mis-reservas?rut=${encodeURIComponent(reserva.rut)}`}>Volver a Mis reservas</a>
        </div>
      </div>
    </main>
  );
}
