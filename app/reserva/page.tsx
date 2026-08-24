import ReservaWizard from '@/components/ReservaWizard';
import ComensalNav from '@/components/ComensalNav';
import { getComensalSession } from '@/lib/auth/comensal-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function ReservaPage() {
  const session=await getComensalSession();
  return (
    <main className="min-h-screen bg-[#F6F3EA]">
      <header className="border-b border-[#A6B0AA]/40 bg-[#FFFDF8]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1DB954]">ALEMSI</p>
            <h1 className="text-lg font-extrabold text-[#0E2A23] sm:text-xl">Alimentación · Mamuil Malal</h1>
          </div>
          {session?<ComensalNav backHref="/login" backLabel="Volver"/>:<span className="rounded-full border border-[#1DB954]/30 bg-[#1DB954]/10 px-3 py-1 text-xs font-semibold text-[#0E2A23]">Reserva segura</span>}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6"><div className="flex flex-wrap gap-2"><a href="/mis-reservas" className="rounded-lg border bg-white px-3 py-2 text-sm font-bold">Mis reservas</a><a href="/reclamos" className="rounded-lg border bg-white px-3 py-2 text-sm font-bold">Reclamos / experiencia del cliente</a></div></div>
      <ReservaWizard initialRut={session?.rut||''}/>
    </main>
  );
}
