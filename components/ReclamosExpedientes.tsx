import { listarReclamosParaRol, type RolReclamo } from '@/lib/db/reclamos';
import type { SessionUser } from '@/lib/auth/session';
import { movimientoReclamoAction } from '@/app/actions/reclamos-expediente';

const destinos:Record<RolReclamo,{value:RolReclamo;label:string}[]>={
  AdminCasino:[{value:'Coordinacion',label:'Coordinación'},{value:'Gerencia',label:'Gerencia'},{value:'Finanzas',label:'Finanzas'}],
  AdminTotal:[{value:'AdminCasino',label:'Admin Casino'},{value:'Coordinacion',label:'Coordinación'},{value:'Gerencia',label:'Gerencia'},{value:'Finanzas',label:'Finanzas'}],
  Coordinacion:[{value:'AdminCasino',label:'Admin Casino / ALEMSI'},{value:'Gerencia',label:'Gerencia ALEMSI'}],
  Gerencia:[{value:'AdminCasino',label:'Admin Casino'},{value:'Coordinacion',label:'Coordinación'},{value:'Finanzas',label:'Finanzas'}],
  Finanzas:[{value:'AdminCasino',label:'Admin Casino'},{value:'Gerencia',label:'Gerencia'}],
};

export default async function ReclamosExpedientes({user,titulo='Seguimiento de reclamos'}:{user:SessionUser;titulo?:string}){
  const rol=user.rol as RolReclamo;
  const casos=await listarReclamosParaRol(rol);
  const puedeGestionar=['AdminCasino','AdminTotal','Coordinacion','Gerencia','Finanzas'].includes(rol);
  return <section className="rounded-2xl border border-[#A6B0AA]/25 bg-white p-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">{titulo}</h2><p className="text-sm text-[#6B7570]">Un expediente por folio. Derivaciones, descargos, respuestas, Finanzas y antecedentes permanecen en la misma cadena.</p></div><span className="rounded-full bg-[#F6F3EA] px-3 py-1 text-sm font-black">{casos.length} caso(s)</span></div>
    <div className="mt-4 space-y-3">{casos.map((r:any)=>{
      const folio=`R-${String(r.id).padStart(6,'0')}`;
      return <details key={r.id} className="rounded-xl border p-4">
        <summary className="cursor-pointer list-none"><div className="grid gap-2 md:grid-cols-[140px_1fr_160px_150px]"><b>{folio}</b><div><b>{r.tipo} · {r.categoria}</b><div className="text-sm text-[#6B7570]">{r.nombre} · RUT {r.rut}</div></div><div className="text-sm"><b>{r.estado}</b><br/>{r.area_actual||'AdminCasino'}</div><div className="text-sm">{r.fecha}</div></div></summary>
        <div className="mt-4 border-t pt-4"><div className="rounded-lg bg-[#F6F3EA] p-3 text-sm"><b>Mensaje original</b><p className="mt-1 whitespace-pre-wrap">{r.mensaje}</p></div>
          {(r.adjuntos||[]).length>0&&<div className="mt-3"><h3 className="font-black">Antecedentes</h3><ul className="mt-1 space-y-1 text-sm">{r.adjuntos.map((a:any)=><li key={a.id}><a className="font-bold underline" target="_blank" rel="noreferrer" href={`/api/reclamos/adjuntos/${a.id}`}>{a.nombre}</a> · {a.cargado_rol} · {a.cargado_por} · {a.fecha}</li>)}</ul></div>}
          <div className="mt-4"><h3 className="font-black">Historial del expediente</h3><div className="mt-2 space-y-2">{(r.movimientos||[]).map((m:any)=><div key={m.id} className="rounded-lg border p-3 text-sm"><div><b>{m.accion}</b> · {m.actor_rol} · {m.actor} · {m.fecha}</div>{m.destino_rol&&<div><b>Derivado a:</b> {m.destino_rol}</div>}{m.mensaje&&<p className="mt-1 whitespace-pre-wrap">{m.mensaje}</p>}{m.estado&&<div className="mt-1"><b>Estado:</b> {m.estado}</div>}</div>)}{!(r.movimientos||[]).length&&<p className="text-sm text-[#6B7570]">Aún no hay gestiones posteriores al ingreso.</p>}</div></div>
          {puedeGestionar&&r.estado!=='Cerrado'&&<form action={movimientoReclamoAction} className="mt-4 grid gap-2 rounded-xl bg-[#F6F3EA] p-3 md:grid-cols-2" encType="multipart/form-data"><input type="hidden" name="reclamo_id" value={r.id}/><label className="text-sm font-bold">Acción<select name="accion" className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"><option value="RESPONDER">Responder / agregar gestión</option><option value="DERIVAR">Derivar / solicitar acción</option>{rol==='Coordinacion'&&<option value="SOLICITAR_DESCARGOS">Solicitar descargos a ALEMSI</option>}<option value="ADJUNTAR_ANTECEDENTE">Adjuntar antecedente</option><option value="CERRAR">Cerrar caso</option></select></label><label className="text-sm font-bold">Destino<select name="destino_rol" className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"><option value="">Mantener responsable actual</option>{(destinos[rol]||[]).map(d=><option key={d.value} value={d.value}>{d.label}</option>)}</select></label><label className="text-sm font-bold md:col-span-2">Respuesta / instrucción<textarea name="mensaje" className="mt-1 min-h-24 w-full rounded-lg border bg-white p-2 font-normal" placeholder="Respuesta, descargo, solicitud de acción o explicación del antecedente"/></label><label className="text-sm font-bold">Estado<select name="estado" defaultValue="En gestión" className="mt-1 w-full rounded-lg border bg-white p-2 font-normal"><option>Pendiente</option><option>En revisión</option><option>En gestión</option><option>Respondido</option><option>Cerrado</option></select></label><label className="text-sm font-bold">Adjuntar evidencia<input type="file" name="archivo" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm font-normal"/></label><button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-black text-white md:col-span-2">Registrar en el mismo expediente</button></form>}
        </div>
      </details>})}{!casos.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">No hay casos visibles para este perfil.</p>}</div>
  </section>;
}
