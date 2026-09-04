import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clave?: string; personal?: string }>;
}) {
  const q = await searchParams;
  const mostrarPersonal = q.personal === '1' || Boolean(q.error) || Boolean(q.clave);

  return (
    <main className="min-h-screen bg-[#EEF7F6] px-4 py-5 text-[#0B2D5B] md:px-8 md:py-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black tracking-[.22em] text-[#0D9B91]">ALEMSI</p>
          <p className="text-xs font-bold text-[#4C6664]">Casino Mamuil Malal</p>
        </div>
        <Link
          href={mostrarPersonal ? '/login' : '/login?personal=1#ingreso-alemsi'}
          className="rounded-lg border border-[#0B2D5B]/25 bg-white px-3 py-2 text-xs font-bold text-[#0B2D5B] shadow-sm transition hover:border-[#0D9B91] hover:text-[#087A73]"
        >
          {mostrarPersonal ? 'Volver al portal comensal' : 'Ingreso ALEMSI'}
        </Link>
      </header>

      {!mostrarPersonal ? (
        <section className="mx-auto mt-5 max-w-6xl overflow-hidden rounded-[28px] border border-[#0D9B91]/20 bg-white shadow-xl md:mt-8">
          <div className="grid md:grid-cols-[1.12fr_.88fr]">
            <div className="bg-[#0B2D5B] p-8 text-white md:p-14">
              <span className="inline-flex rounded-full bg-[#0D9B91]/25 px-3 py-1 text-xs font-black tracking-[.14em] text-[#9BF1E8]">MARCHA BLANCA</span>
              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight md:text-5xl">Reserva tu alimentación antes de subir al complejo</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/85 md:text-lg">Selecciona desde tu casa las fechas, el almuerzo y/o la cena. Revisa previamente la minuta y recibe el detalle de tu reserva por correo.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/reserva" className="rounded-xl bg-[#12A89A] px-6 py-4 text-center text-lg font-black text-white shadow-sm transition hover:bg-[#0D8F83]">Realizar una reserva</Link>
                <Link href="/mis-reservas" className="rounded-xl border border-white/35 px-6 py-4 text-center font-bold text-white transition hover:bg-white/10">Gestionar mis reservas</Link>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <p className="text-xs font-black tracking-[.18em] text-[#0D9B91]">RÁPIDO Y SENCILLO</p>
              <h2 className="mt-2 text-2xl font-black">¿Cómo funciona?</h2>
              <ol className="mt-6 space-y-5">
                {[
                  ['1', 'Identifícate', 'Ingresa tu RUT para acceder a tu ficha.'],
                  ['2', 'Elige las fechas', 'Selecciona un período de hasta 7 días corridos.'],
                  ['3', 'Selecciona tus menús', 'Escoge almuerzo y/o cena y confirma tu reserva.'],
                ].map(([numero, titulo, detalle]) => (
                  <li key={numero} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E2F5F2] font-black text-[#087A73]">{numero}</span>
                    <span><strong className="block text-[#0B2D5B]">{titulo}</strong><span className="mt-1 block text-sm leading-6 text-[#566B69]">{detalle}</span></span>
                  </li>
                ))}
              </ol>
              <p className="mt-7 rounded-xl bg-[#F5F2E9] p-4 text-sm leading-6 text-[#56635E]">Durante la marcha blanca se mantendrá temporalmente la reserva en papel mientras incorporamos progresivamente el sistema online.</p>
            </div>
          </div>
        </section>
      ) : (
        <section id="ingreso-alemsi" className="mx-auto mt-8 max-w-md rounded-[24px] border border-[#0D9B91]/20 bg-white p-7 shadow-xl md:p-9">
          <p className="text-xs font-extrabold tracking-[.18em] text-[#0D9B91]">ACCESO ADMINISTRATIVO</p>
          <h1 className="mt-2 text-2xl font-black text-[#0B2D5B]">Ingreso personal ALEMSI</h1>
          <p className="mt-2 text-sm text-[#566B69]">Acceso exclusivo para usuarios internos autorizados.</p>
          {q.error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Usuario o contraseña no válidos.</div> : null}
          {q.clave ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Contraseña actualizada. Ya puedes ingresar.</div> : null}
          <form action={loginAction} className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-[#203747]">Usuario
              <input name="username" autoComplete="username" required className="mt-1 min-h-12 w-full rounded-xl border border-[#AFCBC6] bg-white px-3 outline-none transition focus:border-[#0D9B91] focus:ring-2 focus:ring-[#0D9B91]/20" />
            </label>
            <label className="block text-sm font-bold text-[#203747]">Contraseña
              <input name="password" type="password" autoComplete="current-password" required className="mt-1 min-h-12 w-full rounded-xl border border-[#AFCBC6] bg-white px-3 outline-none transition focus:border-[#0D9B91] focus:ring-2 focus:ring-[#0D9B91]/20" />
            </label>
            <button className="min-h-12 w-full rounded-xl bg-[#0D9B91] font-extrabold text-white shadow-sm transition hover:bg-[#087A73]">Ingresar</button>
          </form>
          <Link href="/recuperar-clave" className="mt-4 inline-block text-sm font-bold text-[#0D9B91] hover:underline">¿Olvidaste tu contraseña?</Link>
        </section>
      )}
    </main>
  );
}
