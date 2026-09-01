import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import type { SessionUser } from '@/lib/auth/session';
import { HOME_BY_ROLE, MODULES_BY_ROLE, ROLE_LABEL } from '@/lib/reglas/permisos';
import { contarReclamosPendientesAsignados, type RolReclamo } from '@/lib/db/reclamos';
import { contarActividadFinanzas } from '@/lib/db/finanzas';

function visibleTopLinks(user:SessionUser){
  return MODULES_BY_ROLE[user.rol]
    .filter(({href})=>href!=='/admin-casino/produccion')
    .map((item)=>item.href==='/cocina'?{...item,label:'Cocina'}:item);
}

const ROLES_RECLAMOS=new Set<RolReclamo>(['AdminCasino','AdminTotal','Coordinacion','Gerencia','Finanzas','Cocina']);

async function contarReclamosNotificacion(user:SessionUser){
  if(!ROLES_RECLAMOS.has(user.rol as RolReclamo)) return 0;
  try{return await contarReclamosPendientesAsignados(user.rol as RolReclamo);}catch(error){console.error('RECLAMOS_BADGE_ERROR',{rol:user.rol,error});return 0;}
}

async function contarFinanzasNotificacion(user:SessionUser){
  const tieneFinanzas=MODULES_BY_ROLE[user.rol].some(item=>item.href==='/finanzas');
  if(!tieneFinanzas) return {porValidar:0,sinComprobante:0,total:0};
  try{return await contarActividadFinanzas();}catch(error){console.error('FINANZAS_BADGE_ERROR',{rol:user.rol,error});return {porValidar:0,sinComprobante:0,total:0};}
}

export default async function AppShell({user,children}:{user:SessionUser;children:React.ReactNode}){
  const links=visibleTopLinks(user); const roleLabel=ROLE_LABEL[user.rol];
  const [reclamosPendientes,actividadFinanzas]=await Promise.all([contarReclamosNotificacion(user),contarFinanzasNotificacion(user)]);
  const mostrarAlertaFinanzas=user.rol==='Finanzas'&&actividadFinanzas.total>0;

  return <div className="min-h-screen bg-[#F6F3EA] text-[#071814]">
    <header className="border-b border-[#A6B0AA]/30 bg-[#FFFDF8] shadow-sm"><div className="mx-auto max-w-7xl px-4 py-3 sm:px-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center justify-between gap-4"><div className="min-w-0"><div className="text-xs font-extrabold tracking-[.22em] text-[#1DB954]">ALEMSI</div><div className="truncate text-base font-extrabold text-[#0E2A23]">Mamuil Malal · {roleLabel}</div></div></div><div className="flex flex-wrap items-center gap-3 lg:justify-end"><div className="min-w-0 text-left lg:text-right"><div className="truncate text-sm font-extrabold text-[#0E2A23]">Hola, {user.nombre}</div><div className="text-xs font-semibold text-[#6B7570]">{roleLabel}</div></div><form action={logoutAction}><button className="rounded-xl border border-[#A6B0AA]/45 bg-white px-3 py-2 text-sm font-bold text-[#0E2A23] hover:bg-[#F6F3EA]">Cerrar sesión</button></form></div></div>
      <nav className="mt-3 flex flex-wrap gap-2 border-t border-[#A6B0AA]/25 pt-3" aria-label="Módulos principales"><Link href={HOME_BY_ROLE[user.rol]} className="rounded-xl border border-[#0E2A23]/25 bg-white px-3 py-2 text-sm font-bold text-[#0E2A23] hover:bg-[#1DB954]/10">Inicio</Link>{links.map(({href,label})=>{const esReclamos=href==='/reclamos-gestion';const esFinanzas=href==='/finanzas';const badge=esReclamos?reclamosPendientes:esFinanzas?actividadFinanzas.total:0;const title=esReclamos?`${reclamosPendientes} reclamos pendientes asignados`:esFinanzas?`${actividadFinanzas.porValidar} comprobantes por validar · ${actividadFinanzas.sinComprobante} sin comprobante`:'';return <Link key={href} href={href} className="relative inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-bold text-[#0E2A23] hover:border-[#A6B0AA]/35 hover:bg-[#1DB954]/10"><span>{label}</span>{badge>0&&<span aria-label={title} title={title} className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-black leading-none text-white shadow-sm">{badge>=50?'50+':badge}</span>}</Link>})}</nav>
      {mostrarAlertaFinanzas&&<div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/45 bg-[#FFF9E8] px-4 py-3"><div><div className="text-sm font-black text-[#0E2A23]">Tienes actividad pendiente en Finanzas</div><div className="mt-0.5 text-xs font-bold text-[#6B5A24]"><span>{actividadFinanzas.porValidar} comprobante(s) por validar</span><span className="mx-2">·</span><span>{actividadFinanzas.sinComprobante} reserva(s) sin comprobante</span></div></div><Link href="/finanzas" className="rounded-lg bg-[#0E2A23] px-4 py-2 text-sm font-black text-white">Revisar Finanzas</Link></div>}
    </div></header>
    <main className="mx-auto min-w-0 max-w-7xl px-4 py-5 sm:px-6">{children}</main>
  </div>;
}
