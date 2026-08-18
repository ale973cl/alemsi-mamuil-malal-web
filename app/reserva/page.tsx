import ReservaWizard from '@/components/ReservaWizard';

export const dynamic = 'force-dynamic';

export default function ReservaPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EA]">
      <header className="border-b border-[#A6B0AA]/40 bg-[#FFFDF8]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1DB954]">ALEMSI</p>
            <h1 className="text-lg font-extrabold text-[#0E2A23] sm:text-xl">Alimentación · Mamuil Malal</h1>
          </div>
          <span className="rounded-full border border-[#1DB954]/30 bg-[#1DB954]/10 px-3 py-1 text-xs font-semibold text-[#0E2A23]">
            Reserva segura
          </span>
        </div>
      </header>
      <ReservaWizard />
    </main>
  );
}
