'use client';
import { useMemo, useState } from 'react';
import { cerrarAction } from '@/app/cocina/actions';

type Row={id:number;servicio:string;tipo_opcion:string;plato:string;reservadas:number;producidas:number;entregadas:number;motivo_diferencia?:string};
export default function CierreJornada({fecha,rows}:{fecha:string;rows:Row[]}){
  const [values,setValues]=useState(()=>rows.map(r=>({id:r.id,reservadas:Number(r.reservadas),producidas:Number(r.producidas||r.reservadas),entregadas:Number(r.entregadas||r.reservadas),motivo:r.motivo_diferencia||''})));
  const faltan=useMemo(()=>values.some(v=>(v.producidas!==v.reservadas||v.entregadas!==v.reservadas)&&!v.motivo.trim()),[values]);
  function patch(i:number,key:'producidas'|'entregadas'|'motivo',value:string){ setValues(v=>v.map((x,j)=>j===i?{...x,[key]:key==='motivo'?value:Number(value)}:x)); }
  return <form action={cerrarAction} className="mt-5 space-y-3">
    <input type="hidden" name="fecha" value={fecha}/><input type="hidden" name="items" value={JSON.stringify(values)}/>
    {rows.map((r,i)=><div key={r.id} className="rounded-xl border p-3"><div className="font-black">{r.servicio} · {r.tipo_opcion||'—'} · {r.plato}</div><div className="mt-2 grid gap-2 sm:grid-cols-4"><label className="text-sm">Reservadas<input readOnly value={r.reservadas} className="mt-1 w-full rounded-lg border bg-[#F6F3EA] p-2"/></label><label className="text-sm">Producidas<input type="number" min="0" value={values[i].producidas} onChange={e=>patch(i,'producidas',e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-sm">Entregadas<input type="number" min="0" value={values[i].entregadas} onChange={e=>patch(i,'entregadas',e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-sm">Motivo diferencia<input value={values[i].motivo} onChange={e=>patch(i,'motivo',e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label></div></div>)}
    {faltan&&<div className="rounded-xl border border-[#D4AF37] bg-[#D4AF37]/10 p-3 text-sm font-bold">Hay diferencias sin motivo obligatorio.</div>}
    <textarea name="novedades" placeholder="Novedades generales de la jornada" className="min-h-24 w-full rounded-xl border p-3"/>
    <label className="flex items-center gap-2 rounded-xl bg-[#F6F3EA] p-3 text-sm font-bold"><input type="checkbox" name="confirmacion" required/> Confirmo que revisé producción, entregas, diferencias y novedades</label>
    <button disabled={faltan} className="rounded-xl bg-[#1DB954] px-5 py-3 font-black disabled:opacity-40">Finalizar jornada</button>
  </form>
}
