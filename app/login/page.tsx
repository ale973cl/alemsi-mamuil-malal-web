import Image from 'next/image';
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
    <main className={mostrarPersonal
      ? 'min-h-screen overflow-y-auto bg-[#EEF7F6] px-4 py-5 text-[#0B2D5B] md:px-8'
      : 'grid h-[calc(100dvh-41px)] grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden bg-[#EEF7F6] px-4 py-2 text-[#0B2D5B] md:px-8 md:py-3'}>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <div>
          <p className="text-base font-black tracking-[.18em] text-[#0D9B91]">ALEMSI</p>
          <p className="text-xs font-semibold text-[#566B69]">Casino Mamuil Malal</p>
        </div>
        <Link
          href={mostrarPersonal ? '/login' : '/login?personal=1#ingreso-alemsi'}
          className="rounded-lg border border-[#0B2D5B]/20 bg-white px-3 py-2 text-xs font-bold shadow-sm transition hover:border-[#0D9B91] hover:text-[#087A73]"
        >
          {mostrarPersonal ? 'Volver' : 'Ingreso ALEMSI'}
        </Link>
      </header>

      {!mostrarPersonal ? (
        <section className="mx-auto grid h-full min-h-0 w-full max-w-5xl grid-rows-[minmax(0,.9fr)_minmax(0,1.1fr)] overflow-hidden rounded-[24px] border border-[#0D9B91]/20 bg-white shadow-lg md:grid-cols-2 md:grid-rows-1">
          <div className="flex min-h-0 flex-col items-center justify-center p-5 text-center sm:p-7 md:p-9">
            <h1 className="text-3xl font-black leading-tight sm:text-4xl md:text-5xl">Ingreso comensal</h1>
            <p className="mt-3 max-w-md text-base font-semibold leading-6 text-[#425F65] sm:text-lg md:text-xl">Haz tu reserva de forma sencilla antes de subir al complejo.</p>
            <Link href="/reserva" className="mt-6 w-full max-w-sm rounded-2xl bg-[#0D9B91] px-8 py-4 text-center text-xl font-black text-white shadow-md transition hover:bg-[#087A73] sm:min-w-64 sm:w-fit">Haz tu reserva</Link>
          </div>

          <div className="flex min-h-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#0B2D5B] to-[#0D756F] p-3 md:p-6">
            <div className="text-center">
              <Image
                src="/email/septiembre/alemzin-chef-email.png"
                alt="ALEMZÍN, mascota de ALEMSI"
                width={180}
                height={187}
                priority
                className="mx-auto h-auto w-36 drop-shadow-xl sm:w-44 md:w-56"
              />
              <p className="mt-1 hidden text-sm font-bold text-white/90 sm:block">Tu reserva, simple y anticipada</p>
            </div>
          </div>
        </section>
      ) : (
        <section id="ingreso-alemsi" className="mx-auto mt-7 max-w-md rounded-[22px] border border-[#0D9B91]/20 bg-white p-7 shadow-lg md:p-8">
          <p className="text-xs font-extrabold tracking-[.16em] text-[#0D9B91]">ACCESO ADMINISTRATIVO</p>
          <h1 className="mt-2 text-2xl font-black">Ingreso personal ALEMSI</h1>
          <p className="mt-2 text-sm text-[#566B69]">Acceso exclusivo para usuarios internos autorizados.</p>
          {q.error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Usuario o contraseña no válidos.</div> : null}
          {q.clave ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Contraseña actualizada. Ya puedes ingresar.</div> : null}
          <form action={loginAction} className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-[#203747]">Usuario
              <input name="username" autoComplete="username" required className="mt-1 min-h-11 w-full rounded-xl border border-[#AFCBC6] bg-white px-3 outline-none transition focus:border-[#0D9B91] focus:ring-2 focus:ring-[#0D9B91]/20" />
            </label>
            <label className="block text-sm font-bold text-[#203747]">Contraseña
              <input name="password" type="password" autoComplete="current-password" required className="mt-1 min-h-11 w-full rounded-xl border border-[#AFCBC6] bg-white px-3 outline-none transition focus:border-[#0D9B91] focus:ring-2 focus:ring-[#0D9B91]/20" />
            </label>
            <button className="min-h-11 w-full rounded-xl bg-[#0D9B91] font-extrabold text-white shadow-sm transition hover:bg-[#087A73]">Ingresar</button>
          </form>
          <Link href="/recuperar-clave" className="mt-4 inline-block text-sm font-bold text-[#0D9B91] hover:underline">¿Olvidaste tu contraseña?</Link>
        </section>
      )}
    </main>
  );
}
