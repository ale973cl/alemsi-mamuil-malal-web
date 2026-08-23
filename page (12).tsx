import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/ui/PageHeader';
import SectionCard from '@/components/ui/SectionCard';
import StatCard from '@/components/ui/StatCard';
import { requireUser } from '@/lib/auth/session';
import { resumenAdmin } from '@/lib/db/admin';
import { listarFinanzas, resumenFinanzas } from '@/lib/db/finanzas';

export const dynamic='force-dynamic';
export default async function Page(){
  const u=await requireUser(['AdminTotal']);
  const [operacion,pagos]=await Promise.all([resumenAdmin(),listarFinanzas()]);
  const f=resumenFinanzas(pagos);
  const cards=[
    {href:'/admin-casino',title:'Operación de casino',desc:'Minutas, demanda y reglas operacionales.'},
    {href:'/cocina',title:'Producción',desc:'Jornada, raciones y preparaciones.'},
    {href:'/finanzas',title:'Pagos y comprobantes',desc:'Validaciones, deuda e historial.'},
    {href:'/coordinacion',title:'Revisión de minutas',desc:'Seguimiento de coordinación.'},
    {href:'/gerencia',title:'Resumen ejecutivo',desc:'Lectura consolidada del sistema.'},
  ];
  return <AppShell user={u}><div className="space-y-5">
    <PageHeader eyebrow="ADMINISTRADOR TOTAL" title="Administración general" description="Gobierno y supervisión del sistema sobre una sola fuente de información."/>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Reservas futuras" value={Number(operacion.reservas||0)}/><StatCard label="Raciones futuras" value={Number(operacion.raciones||0)}/><StatCard label="Comprobantes por validar" value={f.comprobantes} tone={f.comprobantes?'warning':'success'}/><StatCard label="Monto pendiente" value={`$${f.monto_pendiente.toLocaleString('es-CL')}`}/></section>
    <SectionCard title="Áreas del sistema" description="Acceso administrativo por tarea. Bodega, recetas e inventario se preservan en código pero no forman parte de la navegación principal de esta versión."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{cards.map(c=><Link key={c.href} href={c.href} className="rounded-2xl border border-[#DDE5E2] bg-[#FFFDF9] p-5 transition hover:-translate-y-0.5 hover:border-[#BFE7D0] hover:shadow-md"><div className="font-black text-[#17352E]">{c.title}</div><div className="mt-1 text-sm leading-6 text-[#667572]">{c.desc}</div><div className="mt-4 text-xs font-black uppercase tracking-[.08em] text-[#169B62]">Abrir →</div></Link>)}</div></SectionCard>
    <div className="grid gap-5 lg:grid-cols-2"><SectionCard title="Configuración" description="La administración de instituciones, modalidades, datos de pago, destinatarios, platos, recetas e insumos se mantiene como capa de gobierno. Sus pantallas específicas se incorporarán sin duplicar datos."><div className="rounded-2xl bg-[#F6F8F7] p-4 text-sm leading-6 text-[#4F605C]">La base funcional existente se conserva. Esta versión reorganiza el acceso y mantiene ocultos los módulos no operativos para evitar una interfaz sobrecargada.</div></SectionCard><SectionCard title="Sistema" description="Auditoría, respaldo y mantenimiento deben quedar separados de la operación cotidiana."><Link href="/gerencia" className="inline-flex rounded-xl border border-[#DDE5E2] px-4 py-2.5 text-sm font-black text-[#27423B]">Consultar actividad</Link></SectionCard></div>
  </div></AppShell>;
}
