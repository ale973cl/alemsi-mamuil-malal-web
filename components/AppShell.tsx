import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import type { SessionUser } from '@/lib/auth/session';
import { HOME_BY_ROLE, MODULES_BY_ROLE, ROLE_LABEL } from '@/lib/reglas/permisos';
import { BRANDING } from '@/lib/branding';

export default function AppShell({user,children}:{user:SessionUser;children:React.ReactNode}){
  const links=MODULES_BY_ROLE[user.rol];
  return <div className="min-h-screen bg-[#F4F7F5] text-[#071814]">
    <header className="sticky top-0 z-40 border-b border-[#DDE5E2] bg-white/95 shadow-[0_4px_18px_rgba(14,42,35,.04)] backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href={HOME_BY_ROLE[user.rol]} className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0B2B32] text-sm font-black text-white shadow-sm">A</div>
          <div className="min-w-0"><div className="truncate text-xs font-black tracking-[.18em] text-[#169B62]">{BRANDING.company}</div><div className="truncate text-sm font-black text-[#0B2B32] md:text-base">{BRANDING.product}</div></div>
        </Link>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><div className="text-sm font-black text-[#0B2B32]">{user.nombre}</div><div className="text-xs text-[#667572]">{ROLE_LABEL[user.rol]}</div></div><form action={logoutAction}><button className="rounded-xl border border-[#D7E0DD] bg-white px-3 py-2 text-xs font-black text-[#42534F] hover:bg-[#F5F8F6]">Salir</button></form></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-[1500px] gap-5 px-3 py-4 md:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-6">
      <aside className="hidden self-start rounded-3xl border border-[#DDE5E2] bg-white p-3 shadow-[0_12px_32px_rgba(14,42,35,.05)] lg:sticky lg:top-24 lg:block">
        <div className="mb-2 px-3 py-2"><div className="text-[10px] font-black uppercase tracking-[.16em] text-[#81908C]">Perfil</div><div className="mt-1 text-sm font-black text-[#0B2B32]">{ROLE_LABEL[user.rol]}</div></div>
        <nav className="space-y-1">{links.map(({href,label})=><Link key={href} href={href} className="block rounded-2xl px-3 py-2.5 text-sm font-bold text-[#27423B] transition hover:bg-[#EAF7EF] hover:text-[#176B42]">{label}</Link>)}</nav>
      </aside>
      <div className="min-w-0">
        <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">{links.map(({href,label})=><Link key={href} href={href} className="whitespace-nowrap rounded-full border border-[#DDE5E2] bg-white px-3 py-2 text-xs font-black text-[#27423B] shadow-sm">{label}</Link>)}</nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
    <div className="pointer-events-none fixed bottom-3 right-3 z-30 hidden rounded-full border border-[#DDE5E2] bg-white/90 px-3 py-1.5 text-[10px] font-black tracking-[.14em] text-[#169B62] shadow-sm md:block">{BRANDING.company}</div>
  </div>;
}
