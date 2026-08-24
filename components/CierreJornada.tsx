'use client';
import { useMemo, useState } from 'react';
import { cerrarAction } from '@/app/cocina/actions';

type Row={id:number;servicio:string;tipo_opcion:string;plato:string;reservadas:number;producidas:number|null;entregadas:number|null;motivo_diferencia?:string};
type Value={id:number;reservadas:number;producidas:string;entregadas:string;motivo:string};

export default function CierreJornada({fecha,rows}:{fecha:string;rows:Row[]}){
  const [values,setValues]=useState<Value[]>(()=>rows.map(r=>({
    id:r.id,
    reservadas:Number(r.reservadas),
    producidas:r.producidas===null||r.producidas===undefined?'':String(r.producidas),
    entregadas:r.entregadas===null||r.entregadas===undefined?'':String(r.entregadas),
    motivo:r.motivo_diferencia||''
  })));

  const faltanDatos=useMemo(()=>values.some(v=>v.producidas===''||v.entregadas===''),[values]);
  const faltanMotivos=useMemo(()=>values.some(v=>{
    if(v.producidas===''||v.entregadas==='') return false;
    const producidas=Number(v.producidas);
    const entregadas=Number(v.entregadas);
    return (producidas!==v.reservadas||entregadas!==producidas)&&!v.motivo.trim();
  }),[values]);

  function patch(i:number,key:'producidas'|'entregadas'|'motivo',value:string){
    setValues(v=>v.map((x,j)=>j===i?{...x,[key]:value}:x));
  }

  const items=values.map(v=>({
    id:v.id,
    reservadas:v.reservadas,
    producidas:v.producidas===''?null:Number(v.producidas),
    entregadas:v.entregadas===''?null:Number(v.entregadas),
    motivo:v.motivo
  }));

  return <form action={cerrarAction} className="mt-5 space-y-3">
    <input type="hidden" name="fecha" value={fecha}/><input type="hidden" name="items" value={JSON.stringify(items)}/>
    {rows.map((r,i)=><div key={r.id} className="rounded-xl border p-3"><div className="font-black">{r.servicio} · {r.tipo_opcion||'—'} · {r.plato}</div><div className="mt-2 grid gap-2 sm:grid-cols-4"><label className="text-sm">Reservadas<input readOnly value={r.reservadas} className="mt-1 w-full rounded-lg border bg-[#F6F3EA] p-2"/></label><label className="text-sm">Producidas<input type="number" min="0" value={values[i].producidas} onChange={e=>patch(i,'producidas',e.target.value)} placeholder="Ingresar" className="mt-1 w-full rounded-lg border bg-white p-2"/></label><label className="text-sm">Entregadas<input type="number" min="0" value={values[i].entregadas} onChange={e=>patch(i,'entregadas',e.target.value)} placeholder="Ingresar" className="mt-1 w-full rounded-lg border bg-white p-2"/></label><label className="text-sm">Motivo diferencia<input value={values[i].motivo} onChange={e=>patch(i,'motivo',e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"/></label></div></div>)}
    {faltanDatos&&<div className="rounded-xl border border-[#A6B0AA] bg-[#F6F3EA] p-3 text-sm font-bold">Debes ingresar las cantidades producidas y entregadas antes de cerrar.</div>}
    {faltanMotivos&&<div className="rounded-xl border border-[#D4AF37] bg-[#D4AF37]/10 p-3 text-sm font-bold">Hay diferencias sin motivo obligatorio.</div>}
    <textarea name="novedades" placeholder="Novedades generales de la jornada" className="min-h-24 w-full rounded-xl border p-3"/>
    <label className="flex items-center gap-2 rounded-xl bg-[#F6F3EA] p-3 text-sm font-bold"><input type="checkbox" name="confirmacion" required/> Confirmo que revisé producción, entregas, diferencias y novedades</label>
    <button disabled={faltanDatos||faltanMotivos} className="rounded-xl bg-[#1DB954] px-5 py-3 font-black disabled:opacity-40">Finalizar jornada</button>
  </form>
}
