import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import type { SessionUser } from '@/lib/auth/session';
import { HOME_BY_ROLE, MODULES_BY_ROLE, ROLE_LABEL } from '@/lib/reglas/permisos';

function visibleTopLinks(user:SessionUser){
  return MODULES_BY_ROLE[user.rol]
    .filter(({href})=>href!=='/admin-casino/produccion')
    .map((item)=>item.href==='/cocina'?{...item,label:'Cocina'}:item);
}

export default function AppShell({user,children}:{user:SessionUser;children:React.ReactNode}){
  const links=visibleTopLinks(user);
  const roleLabel=ROLE_LABEL[user.rol];

  return <div className="min-h-screen bg-[#F6F3EA] text-[#071814]">
    <header className="border-b border-[#A6B0AA]/30 bg-[#FFFDF8] shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-extrabold tracking-[.22em] text-[#1DB954]">ALEMSI</div>
              <div className="truncate text-base font-extrabold text-[#0E2A23]">Mamuil Malal · {roleLabel}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <div className="min-w-0 text-left lg:text-right">
              <div className="truncate text-sm font-extrabold text-[#0E2A23]">Hola, {user.nombre}</div>
              <div className="text-xs font-semibold text-[#6B7570]">{roleLabel}</div>
            </div>
            <form action={logoutAction}>
              <button className="rounded-xl border border-[#A6B0AA]/45 bg-white px-3 py-2 text-sm font-bold text-[#0E2A23] hover:bg-[#F6F3EA]">Cerrar sesión</button>
            </form>
          </div>
        </div>

        <nav className="mt-3 flex flex-wrap gap-2 border-t border-[#A6B0AA]/25 pt-3" aria-label="Módulos principales">
          <Link href={HOME_BY_ROLE[user.rol]} className="rounded-xl border border-[#0E2A23]/25 bg-white px-3 py-2 text-sm font-bold text-[#0E2A23] hover:bg-[#1DB954]/10">Inicio</Link>
          {links.map(({href,label})=><Link key={href} href={href} className="rounded-xl border border-transparent px-3 py-2 text-sm font-bold text-[#0E2A23] hover:border-[#A6B0AA]/35 hover:bg-[#1DB954]/10">{label}</Link>)}
        </nav>
      </div>
    </header>

    <main className="mx-auto min-w-0 max-w-7xl px-4 py-5 sm:px-6">{children}</main>
  </div>;
}
