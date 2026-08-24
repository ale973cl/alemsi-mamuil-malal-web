'use client';

import { useState } from 'react';
import { guardarMinutasAction } from '@/app/admin-casino/actions';
import { OPCIONES_MINUTA, SERVICIOS_MINUTA, normalizarFilaMinuta, validarFilasMinuta, type FilaMinutaInput } from '@/lib/reglas/minutas';

const VACIA:FilaMinutaInput={fecha:'',servicio:'Almuerzo',tipo_opcion:'OPCION 1',plato:''};

function csvLine(line:string){
  const values:string[]=[]; let value=''; let quoted=false;
  for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(char===','&&!quoted){values.push(value.trim());value=''}else value+=char}
  values.push(value.trim()); return values;
}

function parseCsv(text:string):FilaMinutaInput[]{
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());
  if(!lines.length) return [];
  const headers=csvLine(lines[0]).map(value=>value.toLocaleLowerCase('es-CL'));
  const required=['fecha','servicio','opcion','plato'];
  if(required.some(name=>!headers.includes(name))) throw new Error('El CSV debe contener: fecha, servicio, opcion, plato.');
  return lines.slice(1).map(line=>{const values=csvLine(line);const get=(name:string)=>values[headers.indexOf(name)]||'';return normalizarFilaMinuta({fecha:get('fecha'),servicio:get('servicio'),tipo_opcion:get('opcion'),plato:get('plato')})});
}

export default function MinutaCarga({platos}:{platos:Array<{plato:string;tiene_receta:boolean}>}){
  const [rows,setRows]=useState<FilaMinutaInput[]>([{...VACIA}]); const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false);
  const errors=validarFilasMinuta(rows); const patch=(index:number,key:keyof FilaMinutaInput,value:string)=>setRows(current=>current.map((row,i)=>i===index?{...row,[key]:value}:row));
  async function fileChanged(file?:File){if(!file)return;setMessage('');try{const parsed=parseCsv(await file.text());setRows(parsed.length?parsed:[{...VACIA}])}catch(error){setMessage(error instanceof Error?error.message:'CSV inválido.')}}
  async function save(){setMessage('');if(errors.length){setMessage('Corrige los errores antes de guardar.');return}setSaving(true);try{const result=await guardarMinutasAction(rows);if(result.ok){setMessage(`${result.cantidad} filas guardadas como PUBLICABLE.`);setRows([{...VACIA}])}else setMessage(result.errores.map(error=>`Fila ${error.fila}: ${error.mensaje}`).join(' | '))}catch(error){setMessage(error instanceof Error?error.message:'No fue posible guardar la minuta.')}finally{setSaving(false)}}
  return <div className="mt-4 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Carga manual, semimasiva o CSV</h3><p className="text-sm text-[#6B7570]">Prepara y revisa todas las filas antes de guardarlas.</p></div><div className="flex flex-wrap gap-2"><a download="plantilla_minuta.csv" href={'data:text/csv;charset=utf-8,'+encodeURIComponent(`fecha,servicio,opcion,plato\n${new Date().toLocaleDateString('en-CA',{timeZone:'America/Santiago'})},Almuerzo,OPCION 1,`)} className="rounded-lg border px-3 py-2 text-sm font-bold">Descargar plantilla CSV</a><label className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-bold">Cargar CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={event=>fileChanged(event.target.files?.[0])}/></label></div></div>
    <datalist id="platos-minuta">{platos.map(item=><option key={item.plato} value={item.plato}/>)}</datalist>
    <div className="mt-4 overflow-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left"><th>#</th><th>Fecha</th><th>Servicio</th><th>Opción</th><th>Plato</th><th/></tr></thead><tbody>{rows.map((row,index)=><tr key={index} className="border-t"><td>{index+1}</td><td><input type="date" value={row.fecha} onChange={e=>patch(index,'fecha',e.target.value)} className="rounded-lg border p-2"/></td><td><select value={row.servicio} onChange={e=>patch(index,'servicio',e.target.value)} className="rounded-lg border p-2">{SERVICIOS_MINUTA.map(value=><option key={value}>{value}</option>)}</select></td><td><select value={row.tipo_opcion} onChange={e=>patch(index,'tipo_opcion',e.target.value)} className="rounded-lg border p-2">{OPCIONES_MINUTA.map(value=><option key={value}>{value}</option>)}</select></td><td><input list="platos-minuta" value={row.plato} onChange={e=>patch(index,'plato',e.target.value)} className="w-full rounded-lg border p-2" placeholder="Buscar o escribir plato"/></td><td><button type="button" onClick={()=>setRows(current=>current.filter((_,i)=>i!==index))} className="rounded-lg border px-2 py-1">Quitar</button></td></tr>)}</tbody></table></div>
    {errors.length>0&&<ul className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.map((error,index)=><li key={index}>Fila {error.fila} · {error.campo}: {error.mensaje}</li>)}</ul>}
    {rows.some(row=>{const item=platos.find(plato=>plato.plato.toLocaleLowerCase('es-CL')===row.plato.trim().toLocaleLowerCase('es-CL'));return item&&!item.tiene_receta})&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Advertencia: uno o más platos no tienen receta activa; Producción no podrá calcular sus insumos teóricos.</p>}
    {message&&<p className="mt-3 rounded-lg bg-[#F6F3EA] p-3 text-sm font-bold">{message}</p>}
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>setRows(current=>[...current,{...VACIA}])} className="rounded-lg border px-4 py-2 font-bold">Agregar fila</button><button type="button" onClick={save} disabled={saving||!rows.length||errors.length>0} className="rounded-lg bg-[#1DB954] px-4 py-2 font-black disabled:opacity-40">{saving?'Guardando…':`Guardar ${rows.length} fila(s)`}</button></div>
  </div>;
}
