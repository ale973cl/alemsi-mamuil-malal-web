import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';

export const dynamic='force-dynamic';

const bloques=[
  {titulo:'Usuarios y permisos',estado:'Pendiente de conexión',descripcion:'Crear, desactivar y mantener usuarios, roles, responsables y recuperación de acceso desde una fuente central.'},
  {titulo:'Comunicaciones',estado:'Pendiente de conexión',descripcion:'Evento → PARA / CC / CCO / plantilla / activo. Debe alimentar Reserva, Finanzas, Reclamos, Cocina y excepciones desde un único motor.'},
  {titulo:'Instituciones y reglas',estado:'Parcial',descripcion:'Centralizar instituciones, servicios permitidos, tipos de comensal y excepciones sin distribuir reglas entre pantallas.'},
  {titulo:'Tarifas y vigencias',estado:'Pendiente de conexión',descripcion:'Mantener valores por institución, tipo y servicio con vigencia, conservando el monto histórico de reservas ya emitidas.'},
  {titulo:'Responsables operativos',estado:'Pendiente de conexión',descripcion:'Definir quién recibe cierres de Cocina, reclamos, excepciones, alertas y derivaciones sin destinatarios hardcodeados.'},
  {titulo:'Auditoría y trazabilidad',estado:'Parcial',descripcion:'Consolidar cambios de configuración y eventos de mantenimiento con usuario, fecha/hora y resultado.'},
] as const;

export default async function Page(){
  const u=await requireUser(['AdminTotal']);
  return <AppShell user={u}><div className="space-y-5">
    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">ADMIN TOTAL</p><h1 className="text-2xl font-black text-[#0E2A23]">Centro de administración y mantenimiento</h1><p className="mt-1 max-w-4xl text-sm text-[#6B7570]">Panel reservado para parámetros administrables. Los motores críticos, seguridad y estructura de datos permanecen fuera de esta pantalla.</p></section>

    <section className="grid gap-3 md:grid-cols-3"><Link href="/admin-casino" className="rounded-2xl border bg-white p-4 hover:bg-[#F6F3EA]"><div className="text-xs font-bold text-[#6B7570]">OPERACIÓN</div><div className="mt-1 font-black text-[#0E2A23]">Admin Casino</div><p className="mt-1 text-sm text-[#6B7570]">Minuta oficial, excepciones y reglas operativas.</p></Link><Link href="/finanzas" className="rounded-2xl border bg-white p-4 hover:bg-[#F6F3EA]"><div className="text-xs font-bold text-[#6B7570]">CONTROL</div><div className="mt-1 font-black text-[#0E2A23]">Finanzas</div><p className="mt-1 text-sm text-[#6B7570]">Consulta del circuito financiero ya operativo.</p></Link><Link href="/gerencia" className="rounded-2xl border bg-white p-4 hover:bg-[#F6F3EA]"><div className="text-xs font-bold text-[#6B7570]">SUPERVISIÓN</div><div className="mt-1 font-black text-[#0E2A23]">Gerencia</div><p className="mt-1 text-sm text-[#6B7570]">Indicadores y visión ejecutiva.</p></Link></section>

    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Mantenimiento del sistema</h2><p className="text-sm text-[#6B7570]">Inventario de configuraciones que deben quedar administrables sin modificar código.</p></div><span className="rounded-full bg-[#D4AF37]/15 px-3 py-1 text-xs font-black text-[#6B4D00]">Implementación gradual</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{bloques.map(b=><article key={b.titulo} className="rounded-xl border border-[#A6B0AA]/30 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-black text-[#0E2A23]">{b.titulo}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${b.estado==='Parcial'?'bg-[#D4AF37]/15 text-[#6B4D00]':'bg-[#A6B0AA]/15 text-[#59635E]'}`}>{b.estado}</span></div><p className="mt-2 text-sm leading-5 text-[#6B7570]">{b.descripcion}</p></article>)}</div></section>

    <section className="rounded-2xl border border-[#1DB954]/25 bg-[#1DB954]/5 p-5"><h2 className="font-black text-[#0E2A23]">Regla de implementación</h2><p className="mt-1 text-sm text-[#4A5550]">Cada bloque se conectará únicamente cuando exista una fuente de datos y una acción segura definida. Esta pantalla no crea configuraciones paralelas ni reemplaza los motores actuales.</p></section>
  </div></AppShell>;
}
