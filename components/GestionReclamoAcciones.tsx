'use client';

import { useSearchParams } from 'next/navigation';
import { movimientoReclamoAction } from '@/app/actions/reclamos-expediente';

const AREAS=[
  ['ADMIN_CASINO','Administración Casino'],
  ['CASINO','Casino'],
  ['COORDINACION','Coordinación'],
  ['FINANZAS','Finanzas'],
  ['GERENCIA','Gerencia'],
  ['COCINA','Cocina'],
] as const;

export default function GestionReclamoAcciones(){
  const params=useSearchParams();
  const caso=Number(params.get('caso')||0);
  if(!caso) return <div className="rounded-xl border border-dashed bg-white p-4 text-sm text-[#6B7570]">Selecciona un reclamo para registrar seguimiento, derivarlo o cerrarlo.</div>;

  return <section className="rounded-2xl border border-[#A6B0AA]/25 bg-[#FFFDF8] p-4">
    <h3 className="text-lg font-black">Gestión del reclamo R-{String(caso).padStart(6,'0')}</h3>
    <p className="mt-1 text-sm text-[#6B7570]">Registra la acción y, si corresponde, selecciona el área. El sistema obtiene automáticamente el responsable y su correo desde el maestro; no se escribe ningún destinatario manualmente.</p>
    <form action={movimientoReclamoAction} className="mt-4 grid gap-3">
      <input type="hidden" name="reclamo_id" value={caso}/>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-bold">Acción
          <select name="accion" defaultValue="SEGUIMIENTO" className="mt-1 w-full rounded-lg border bg-white p-2 font-normal">
            <option value="SEGUIMIENTO">Registrar seguimiento</option>
            <option value="DERIVAR">Derivar a otra área</option>
            <option value="RESPONDER">Registrar respuesta / solución</option>
            <option value="SOLICITAR_ANTECEDENTES">Solicitar antecedentes internos</option>
            <option value="CERRAR">Cerrar reclamo</option>
          </select>
        </label>
        <label className="text-sm font-bold">Derivar a
          <select name="destino_area" defaultValue="" className="mt-1 w-full rounded-lg border bg-white p-2 font-normal">
            <option value="">Sin derivación</option>
            {AREAS.map(([key,nombre])=><option key={key} value={key}>{nombre}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">Estado
          <select name="estado" defaultValue="En gestión" className="mt-1 w-full rounded-lg border bg-white p-2 font-normal">
            <option value="Pendiente">Pendiente</option>
            <option value="En gestión">En gestión</option>
            <option value="Derivado">Derivado</option>
            <option value="Resuelto">Resuelto</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </label>
      </div>
      <label className="text-sm font-bold">Gestión / instrucción / respuesta interna
        <textarea name="mensaje" rows={4} required placeholder="Indica qué se hizo, qué debe revisar el área o cuál es la solución adoptada." className="mt-1 w-full rounded-lg border p-3 font-normal"/>
      </label>
      <label className="text-sm font-bold">Adjuntar antecedente (opcional)
        <input type="file" name="archivo" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded-lg border bg-white p-2 font-normal"/>
      </label>
      <div className="flex justify-end"><button className="rounded-lg bg-[#0E2A23] px-5 py-2 font-black text-white">Registrar gestión</button></div>
    </form>
  </section>;
}
