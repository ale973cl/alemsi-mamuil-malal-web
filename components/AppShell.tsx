import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import type { SessionUser } from '@/lib/auth/session';
import { HOME_BY_ROLE, MODULES_BY_ROLE, ROLE_LABEL } from '@/lib/reglas/permisos';

export default function AppShell({user,children}:{user:SessionUser;children:React.ReactNode}){
  const links=MODULES_BY_ROLE[user.rol];
  return <div className="min-h-screen bg-[#F6F3EA] text-[#071814]">
    <header className="border-b border-[#A6B0AA]/30 bg-[#FFFDF8]"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4"><div><div className="text-xs font-extrabold tracking-[.22em] text-[#1DB954]">ALEMSI</div><div className="font-extrabold text-[#0E2A23]">Mamuil Malal · {ROLE_LABEL[user.rol]}</div></div><div className="text-right text-sm"><b>{user.nombre}</b><div className="text-xs text-[#6B7570]">{ROLE_LABEL[user.rol]}</div></div></div></header>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[220px_1fr]"><aside className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-3 shadow-sm"><Link href={HOME_BY_ROLE[user.rol]} className="mb-3 block rounded-xl border px-3 py-2 text-sm font-bold">Inicio</Link><nav className="space-y-1">{links.map(({href,label})=><Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm font-bold text-[#0E2A23] hover:bg-[#1DB954]/10">{label}</Link>)}</nav><form action={logoutAction} className="mt-4 border-t pt-3"><button className="w-full rounded-xl border border-[#A6B0AA]/40 px-3 py-2 text-sm font-bold">Cerrar sesión</button></form></aside><main className="min-w-0">{children}</main></div>
  </div>;
}
