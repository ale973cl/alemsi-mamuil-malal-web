import Link from 'next/link';
import AppShell from '@/components/AppShell';
import ConfiguracionReclamos from '@/components/ConfiguracionReclamos';
import GestionReclamoAcciones from '@/components/GestionReclamoAcciones';
import { requireUser } from '@/lib/auth/session';
import { obtenerComensal } from '@/lib/db/comensales';
import { listarMisReservas } from '@/lib/db/comensal-gestion';
import { listarReclamosParaRol, obtenerConfiguracionReclamos, obtenerDetalleReclamoParaRol, puedeGestionarReclamo, type RolReclamo } from '@/lib/db/reclamos';
import { fechaVisible } from '@/lib/fecha-hora';

export const dynamic='force-dynamic';
const ROLES=['AdminTotal','AdminCasino','Finanzas','Coordinacion','Gerencia','Cocina'] as const;

function mensajeGuardado(tipo?:string,detalle?:string){
  if(!tipo) return '';
  if(tipo==='responsable') return `Responsable ${detalle?`de ${detalle} `:''}guardado correctamente.`;
  if(tipo==='ruteo') return 'Asignación principal por concepto guardada correctamente.';
  if(tipo==='matriz') return 'Matriz COPIA / VER / SOLUCIONAR guardada correctamente.';
  const acciones:Record<string,string>={SEGUIMIENTO:'Seguimiento registrado',DERIVAR:'Derivación registrada',RESPONDER:'Respuesta / solución registrada',SOLICITAR_ANTECEDENTES:'Solicitud de antecedentes registrada',CERRAR:'Cierre registrado'};
  return `${acciones[tipo]||'Acción registrada'} correctamente en la trazabilidad del expediente.`;
}

export default async function Page({searchParams}:{searchParams:Promise<{caso?:string;pagina?:string;guardado?:string;detalle?:string}>}){
  const u=await requireUser([...ROLES]);
  const rol=u.rol as RolReclamo;
  const params=await searchParams;
  const pagina=Math.max(1,Number(params.pagina||1));
  const reclamos=await listarReclamosParaRol(rol,pagina,25);
  const casoId=Number(params.caso||0);
  const caso=casoId>0?await obtenerDetalleReclamoParaRol(casoId,rol):null;
  const [comensal,reservasInfo]=caso?.rut?await Promise.all([
    obtenerComensal(String(caso.rut)).catch(()=>null),
    listarMisReservas(String(caso.rut)).catch(()=>null),
  ]):[null,null];
  const reservas=Array.isArray((reservasInfo as any)?.cab)?(reservasInfo as any).cab.slice(0,5):[];
  const lineasReserva=Array.isArray((reservasInfo as any)?.lineas)?(reservasInfo as any).lineas:[];
  const puedeGestionar=caso?await puedeGestionarReclamo(caso.id,rol):false;
  const puedeConfigurar=rol==='Gerencia'||rol==='AdminTotal';
  const configuracion=puedeConfigurar?await obtenerConfiguracionReclamos():null;
  const confirmacion=mensajeGuardado(params.guardado,params.detalle);

  return <AppShell user={u}><div className="space-y-5">
    <section><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">RECLAMOS</p><h1 className="text-2xl font-black text-[#0E2A23]">Bandeja operacional</h1><p className="mt-1 text-sm text-[#6B7570]">Solo aparecen los casos que tu perfil puede ver según la matriz central. Los casos asignados o derivados directamente a tu perfil quedan destacados.</p></section>
    {confirmacion&&<section className="rounded-2xl border border-[#0D9B91]/40 bg-[#E8F7F5] p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#0D9B91] px-2.5 py-1 text-xs font-black text-white">GUARDADO</span><p className="font-bold text-[#075E58]">{confirmacion}</p></div>{caso&&<p className="mt-1 text-sm text-[#075E58]">Verificación: la acción ya aparece en la trazabilidad del reclamo R-{String(caso.id).padStart(6,'0')}.</p>}</section>}
    <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(320px,.9fr)_minmax(0,1.4fr)]">
      <div className="space-y-2 rounded-2xl border bg-white p-4"><h2 className="font-black">Casos visibles</h2>{reclamos.map((r:any)=>{
        const propio=String(r.area_actual||'')===rol;
        const derivado=propio&&String(r.estado||'').toLocaleLowerCase('es-CL').includes('derivad');
        return <Link key={r.id} href={`/reclamos-gestion?caso=${r.id}&pagina=${pagina}`} className={`block min-w-0 rounded-xl border p-3 transition ${propio?'border-[#0D9B91] bg-[#E8F7F5] shadow-sm':'hover:bg-[#F6F3EA]'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">R-{String(r.id).padStart(6,'0')} · {r.tipo}</div>{propio&&<span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${derivado?'bg-[#D4AF37]/25 text-[#6D5200]':'bg-[#0D9B91]/15 text-[#075E58]'}`}>{derivado?'DERIVADO A TU PERFIL':'ASIGNADO A TU PERFIL'}</span>}</div>
          <div className="truncate text-sm">{r.nombre} · {r.categoria}</div><div className="text-xs text-[#6B7570]">{fechaVisible(r.fecha)} · {r.estado} · {r.area_actual}</div>
        </Link>})}{!reclamos.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No hay reclamos visibles para este perfil.</p>}<div className="flex justify-between pt-2"><Link href={`/reclamos-gestion?pagina=${Math.max(1,pagina-1)}`} className="rounded-lg border px-3 py-2 text-sm font-bold">Anterior</Link><Link href={`/reclamos-gestion?pagina=${pagina+1}`} className="rounded-lg border px-3 py-2 text-sm font-bold">Siguiente</Link></div></div>
      <div className="space-y-4">{caso?<><article className="min-w-0 rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black">R-{String(caso.id).padStart(6,'0')} · {caso.estado}</h2><span className="rounded-full bg-[#F6F3EA] px-3 py-1 text-xs font-black">Área actual: {caso.area_actual}</span></div><p className="mt-2 text-sm"><b>{caso.tipo} · {caso.categoria}</b></p><p className="mt-1 text-xs text-[#6B7570]">Ingresado: {fechaVisible(caso.fecha)}</p><p className="mt-2 break-words text-sm">{caso.mensaje}</p>
        <div className="mt-4 rounded-xl border border-[#0D9B91]/25 bg-[#F7FAF8] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-[#0E2A23]">Datos del comensal</h3><span className="text-xs font-bold text-[#6B7570]">Contacto para seguimiento</span></div><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><span className="block text-xs font-bold text-[#6B7570]">Nombre</span><span className="font-bold">{comensal?.nombre||caso.nombre||'No registrado'}</span></div><div><span className="block text-xs font-bold text-[#6B7570]">RUT</span><span className="font-bold">{comensal?.rut||caso.rut||'No registrado'}</span></div><div><span className="block text-xs font-bold text-[#6B7570]">Correo</span>{comensal?.correo?<a className="break-all font-bold text-[#0D9B91] underline" href={`mailto:${comensal.correo}`}>{comensal.correo}</a>:<span className="font-bold">No registrado</span>}</div><div><span className="block text-xs font-bold text-[#6B7570]">Teléfono</span>{comensal?.telefono?<a className="font-bold text-[#0D9B91] underline" href={`tel:${comensal.telefono}`}>{comensal.telefono}</a>:<span className="font-bold">No registrado</span>}</div><div className="sm:col-span-2"><span className="block text-xs font-bold text-[#6B7570]">Institución</span><span className="font-bold">{comensal?.institucion||'No registrada'}</span></div></div></div>
        <div className="mt-4 rounded-xl border bg-[#FFFDF7] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-[#0E2A23]">Referencias de reserva del comensal</h3><span className="text-xs font-bold text-[#6B7570]">Para identificar semana, día y servicio</span></div>{reservas.length?<div className="mt-3 space-y-3">{reservas.map((reserva:any)=>{const codigo=String(reserva.codigo_reserva||reserva.referencia_reserva||'Sin código');const detalles=lineasReserva.filter((l:any)=>String(l.codigo_reserva||l.referencia_reserva||'')===codigo);return <div key={codigo} className="rounded-lg border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">Reserva {codigo}</div><div className="text-xs font-bold text-[#6B7570]">{fechaVisible(reserva.desde)}{String(reserva.hasta||'')&&String(reserva.hasta)!==String(reserva.desde||'')?` → ${fechaVisible(reserva.hasta)}`:''}</div></div>{detalles.length?<div className="mt-2 flex flex-wrap gap-2">{detalles.slice(0,8).map((d:any)=><span key={`${d.id}-${d.fecha}-${d.servicio}`} className="rounded-full bg-[#F6F3EA] px-2.5 py-1 text-xs font-bold">{fechaVisible(d.fecha)} · {d.servicio}{d.plato_reservado?` · ${d.plato_reservado}`:''}</span>)}</div>:<div className="mt-2 text-xs text-[#6B7570]">Sin detalle de servicios disponible.</div>}</div>})}</div>:<p className="mt-3 text-sm text-[#6B7570]">No hay reservas registradas para este comensal en Preview.</p>}<p className="mt-3 text-xs text-[#6B7570]">Esta sección muestra referencias reales del historial del comensal y no asigna automáticamente una reserva al reclamo.</p></div>
        <h3 className="mt-4 font-black">Trazabilidad</h3><div className="mt-2 space-y-2">{caso.movimientos.map((m:any)=><div key={m.id} className="rounded-lg bg-[#F6F3EA] p-3 text-sm"><div><b>{m.accion}</b> · {m.actor}</div><div className="text-xs text-[#6B7570]">{m.estado||'—'} · {m.destino_rol||'sin derivación'}</div>{m.mensaje&&<div className="mt-1">{m.mensaje}</div>}</div>)}</div><h3 className="mt-4 font-black">Adjuntos</h3><div className="mt-2 flex flex-wrap gap-2">{caso.adjuntos.map((a:any)=><a key={a.id} href={`/api/reclamos/adjuntos/${a.id}`} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-lg border px-3 py-2 text-sm underline">{a.nombre}</a>)}{!caso.adjuntos.length&&<span className="text-sm text-[#6B7570]">Sin adjuntos.</span>}</div></article>{puedeGestionar?<GestionReclamoAcciones/>:<div className="rounded-xl border border-dashed bg-white p-4 text-sm text-[#6B7570]">Tu perfil puede ver este expediente, pero no tiene permiso SOLUCIONAR para esta categoría.</div>}</>:<div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-[#6B7570]">Selecciona un reclamo de la bandeja para abrir su expediente.</div>}</div>
    </section>
    {puedeConfigurar&&configuracion&&<section id="configuracion" className="rounded-2xl border bg-white p-5"><div><p className="text-xs font-extrabold tracking-[.14em] text-[#1DB954]">GOBIERNO DE RECLAMOS</p><h2 className="text-xl font-black">Configuración de responsables y permisos</h2><p className="text-sm text-[#6B7570]">Gerencia administra responsables, asignación por concepto y permisos. Admin Total conserva acceso de respaldo.</p></div><ConfiguracionReclamos responsables={configuracion.responsables} permisos={configuracion.permisos} categorias={configuracion.categorias}/></section>}
  </div></AppShell>;
}
