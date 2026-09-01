'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { usePathname, useSearchParams } from 'next/navigation';
import { movimientoReclamoAction } from '@/app/actions/reclamos-expediente';

const AREAS=[
  ['ADMIN_CASINO','Administración Casino'],
  ['CASINO','Casino'],
  ['COORDINACION','Coordinación'],
  ['FINANZAS','Finanzas'],
  ['GERENCIA','Gerencia'],
  ['COCINA','Cocina'],
] as const;

const ESTADO_POR_ACCION:Record<string,string>={
  SEGUIMIENTO:'En gestión',
  DERIVAR:'Derivado',
  RESPONDER:'Resuelto',
  SOLICITAR_ANTECEDENTES:'Pendiente',
  CERRAR:'Cerrado',
};

function BotonGuardar(){
  const {pending}=useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-lg bg-[#0E2A23] px-5 py-2 font-black text-white disabled:cursor-wait disabled:opacity-60">
    {pending?'Guardando gestión…':'Registrar gestión'}
  </button>;
}

export default function GestionReclamoAcciones(){
  const params=useSearchParams();
  const pathname=usePathname();
  const caso=Number(params.get('caso')||0);
  const guardado=params.get('guardado')||'';
  const [accion,setAccion]=useState('SEGUIMIENTO');
  const estado=ESTADO_POR_ACCION[accion]||'En gestión';
  const retorno=pathname.startsWith('/admin-casino')
    ? `/admin-casino?tab=reclamos&caso=${caso}`
    : `/reclamos-gestion?caso=${caso}`;

  if(!caso) return <div className="rounded-xl border border-dashed bg-white p-4 text-sm text-[#6B7570]">Selecciona un reclamo para registrar seguimiento, derivarlo o cerrarlo.</div>;

  return <section className="rounded-2xl border border-[#A6B0AA]/25 bg-[#FFFDF8] p-4">
    {guardado&&<div className="mb-4 rounded-xl border border-[#0D9B91]/40 bg-[#E8F7F5] p-3 text-sm font-bold text-[#075E58]">
      <span className="mr-2 rounded-full bg-[#0D9B91] px-2 py-1 text-[11px] font-black text-white">GUARDADO</span>
      Gestión registrada correctamente. Ya está incorporada en la trazabilidad del expediente.
    </div>}
    <h3 className="text-lg font-black">Gestión del reclamo R-{String(caso).padStart(6,'0')}</h3>
    <p className="mt-1 text-sm text-[#6B7570]">Cada acción actualiza el estado lógico del expediente. La derivación solo se habilita cuando corresponde y el sistema obtiene automáticamente el responsable y su correo desde el maestro.</p>
    <form action={movimientoReclamoAction} className="mt-4 grid gap-3">
      <input type="hidden" name="reclamo_id" value={caso}/>
      <input type="hidden" name="retorno" value={retorno}/>
      <input type="hidden" name="estado" value={estado}/>
      <div className={`grid gap-3 ${accion==='DERIVAR'?'md:grid-cols-3':'md:grid-cols-2'}`}>
        <label className="text-sm font-bold">Acción
          <select name="accion" value={accion} onChange={e=>setAccion(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal">
            <option value="SEGUIMIENTO">Registrar seguimiento</option>
            <option value="DERIVAR">Derivar a otra área</option>
            <option value="RESPONDER">Registrar respuesta / solución</option>
            <option value="SOLICITAR_ANTECEDENTES">Solicitar antecedentes internos</option>
            <option value="CERRAR">Cerrar reclamo</option>
          </select>
        </label>
        {accion==='DERIVAR'&&<label className="text-sm font-bold">Derivar a
          <select name="destino_area" defaultValue="" required className="mt-1 w-full rounded-lg border bg-white p-2 font-normal">
            <option value="" disabled>Selecciona un área</option>
            {AREAS.map(([key,nombre])=><option key={key} value={key}>{nombre}</option>)}
          </select>
        </label>}
        <div className="text-sm font-bold">Estado resultante
          <div className="mt-1 rounded-lg border bg-[#F6F3EA] p-2 font-black text-[#0E2A23]">{estado}</div>
        </div>
      </div>
      <label className="text-sm font-bold">Gestión / instrucción / respuesta interna
        <textarea name="mensaje" rows={4} required placeholder="Indica qué se hizo, qué debe revisar el área o cuál es la solución adoptada." className="mt-1 w-full rounded-lg border p-3 font-normal"/>
      </label>
      <label className="text-sm font-bold">Adjuntar antecedente (opcional)
        <input type="file" name="archivo" accept="application/pdf,image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded-lg border bg-white p-2 font-normal"/>
      </label>
      <div className="flex justify-end"><BotonGuardar/></div>
    </form>
  </section>;
}
