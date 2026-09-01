import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { requireUser } from '@/lib/auth/session';
import { listarPlatosMaestro, listarRecetas } from '@/lib/db/recetas';
import { guardarRecetaAction } from './actions';

export const dynamic='force-dynamic';

const UNIDADES_COCINA=[
  {value:'g',label:'g · gramos'},
  {value:'kg',label:'kg · kilogramos'},
  {value:'ml',label:'ml · mililitros'},
  {value:'L',label:'L · litros'},
  {value:'un',label:'un · unidad'},
  {value:'porción',label:'porción'},
  {value:'cucharadita',label:'cucharadita'},
  {value:'cucharada',label:'cucharada'},
  {value:'taza',label:'taza'},
] as const;

function numero(v:number){return new Intl.NumberFormat('es-CL',{maximumFractionDigits:3}).format(v);}

export default async function Page({searchParams}:{searchParams:Promise<{receta?:string;plato?:string;personas?:string;nueva?:string;guardado?:string}>}){
  const u=await requireUser(['Cocina','AdminCasino','AdminTotal']);
  const q=await searchParams;
  const puedeEditar=u.rol==='AdminCasino'||u.rol==='AdminTotal';
  const [recetas,platosMaestro]=await Promise.all([listarRecetas(),listarPlatosMaestro()]);
  const activas=recetas.filter(r=>r.activo);
  const platoSolicitado=String(q.plato||'').trim();
  const idSolicitado=Number(q.receta||0);
  const recetaPorPlato=platoSolicitado?recetas.find(r=>r.plato.localeCompare(platoSolicitado,'es',{sensitivity:'base'})===0):null;
  const seleccion=recetas.find(r=>r.id===idSolicitado)||recetaPorPlato||(puedeEditar?recetas[0]:activas[0])||null;
  const platoBase=platoSolicitado||seleccion?.plato||platosMaestro[0]?.plato||'';
  const personas=Math.max(1,Math.trunc(Number(q.personas||seleccion?.porciones_base||1))||1);
  const factor=seleccion?personas/seleccion.porciones_base:1;
  const nueva=puedeEditar&&(q.nueva==='1'||Boolean(platoSolicitado&&!recetaPorPlato));
  const filas=nueva?[]:(seleccion?.ingredientes||[]);
  const totalFilas=Math.max(10,Math.min(20,filas.length+3));

  return <AppShell user={u}><div className="space-y-5">
    <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border bg-white p-5">
      <div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">RECETAS ESTÁNDAR</p><h1 className="text-2xl font-black text-[#0E2A23]">Maestro de platos y producción</h1><p className="mt-1 max-w-3xl text-sm text-[#6B7570]">El maestro se alimenta primero de los platos publicados en la minuta. Administración selecciona un plato de esa lista, completa o edita su receta y la guarda como receta estándar. Si un plato aún no existe en minuta, también puede agregarse manualmente.</p></div>
      <Link href="/cocina" className="rounded-xl border border-[#0D9B91] px-4 py-2 text-sm font-black text-[#0D9B91]">Volver a Cocina</Link>
    </section>

    {q.guardado==='1'&&<div className="rounded-xl border border-green-300 bg-green-50 p-4 font-bold text-green-800">Receta guardada correctamente en el maestro de platos.</div>}

    <section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-bold">Plato del maestro<select name="plato" defaultValue={platoBase} className="mt-1 block min-w-72 rounded-lg border bg-white p-2">{platosMaestro.map(p=><option key={p.plato} value={p.plato}>{p.plato}{p.receta_id?' · receta cargada':' · desde minuta'}</option>)}</select></label>
          {!puedeEditar&&<label className="text-sm font-bold">Porciones a producir<input name="personas" type="number" min="1" defaultValue={personas} className="mt-1 block w-40 rounded-lg border p-2"/></label>}
          <button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-bold text-white">{puedeEditar?'Abrir / editar':'Calcular cantidades'}</button>
        </form>
        {puedeEditar&&<Link href="/recetas?nueva=1" className="rounded-lg border border-[#1DB954] px-4 py-2 font-black text-[#0E2A23]">Agregar plato no existente</Link>}
      </div>
      <p className="mt-3 text-xs text-[#6B7570]">Prioridad: usar siempre el plato proveniente de la minuta. “Agregar plato no existente” queda solo como excepción.</p>
    </section>

    {!puedeEditar&&seleccion&&<section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black tracking-[.14em] text-[#0D9B91]">RECETA DE PRODUCCIÓN</p><h2 className="text-2xl font-black">{seleccion.plato}</h2><p className="mt-1 text-sm text-[#6B7570]">Base estándar: {seleccion.porciones_base} porciones · Producción solicitada: <b>{personas} porciones</b> · Factor {numero(factor)}</p></div></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-sm"><thead><tr className="bg-[#F6F3EA] text-left"><th className="p-3">Ingrediente</th><th className="p-3">Cantidad base</th><th className="p-3">Cantidad para {personas}</th><th className="p-3">Unidad</th></tr></thead><tbody>{seleccion.ingredientes.map(i=><tr key={i.id||`${i.ingrediente}-${i.orden}`} className="border-b"><td className="p-3 font-bold">{i.ingrediente}</td><td className="p-3">{numero(i.cantidad)}</td><td className="p-3 text-lg font-black text-[#0D9B91]">{numero(i.cantidad*factor)}</td><td className="p-3">{i.unidad||'—'}</td></tr>)}</tbody></table></div>
      <div className="mt-5 rounded-xl bg-[#F7FAF8] p-4"><h3 className="font-black">Preparación estándar</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#35443E]">{seleccion.preparacion}</p></div>
    </section>}

    {!puedeEditar&&!seleccion&&<div className="rounded-2xl bg-[#F6F3EA] p-5 text-sm font-bold">El plato seleccionado todavía no tiene una receta estándar cargada por Administración de Casino.</div>}

    {puedeEditar&&<section className="rounded-2xl border bg-white p-5">
      <div><p className="text-xs font-extrabold tracking-[.16em] text-[#1DB954]">ADMINISTRACIÓN DE RECETAS</p><h2 className="text-xl font-black">{nueva?(platoSolicitado?`Completar receta · ${platoSolicitado}`:'Agregar plato y receta'):seleccion?`Editar · ${seleccion.plato}`:'Crear primera receta'}</h2><p className="mt-1 text-sm text-[#6B7570]">Cuando el plato proviene de la minuta, su nombre queda precargado para evitar duplicarlo o escribirlo distinto. Luego se registran porciones base, preparación e ingredientes.</p></div>
      <form action={guardarRecetaAction} className="mt-5 space-y-5">
        {!nueva&&seleccion&&<input type="hidden" name="id" value={seleccion.id}/>} 
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]"><label className="text-sm font-bold">Nombre del plato<input name="plato" required readOnly={Boolean(platoSolicitado)} defaultValue={nueva?platoBase:seleccion?.plato||platoBase} className="mt-1 block w-full rounded-lg border p-2 read-only:bg-[#F6F3EA]"/></label><label className="text-sm font-bold">Porciones base<input name="porciones_base" type="number" min="1" required defaultValue={nueva?4:seleccion?.porciones_base||4} className="mt-1 block w-full rounded-lg border p-2"/></label><label className="flex items-end gap-2 pb-2 text-sm font-bold"><input type="checkbox" name="activo" defaultChecked={nueva?true:Boolean(seleccion?.activo)}/> Activa</label></div>
        <label className="block text-sm font-bold">Preparación / instrucciones<textarea name="preparacion" required rows={7} defaultValue={nueva?'':seleccion?.preparacion||''} placeholder="Describe cómo preparar el plato, orden de incorporación, cocción, tiempos y criterios de terminación." className="mt-1 block w-full rounded-lg border p-3"/></label>
        <div><h3 className="font-black">Ingredientes y cantidad base</h3><p className="text-sm text-[#6B7570]">Completa solo las filas necesarias. La unidad se selecciona desde medidas estandarizadas de cocina para mantener consistencia en recetas y cálculos.</p><div className="mt-3 space-y-2">{Array.from({length:totalFilas},(_,index)=>{const actual=filas[index];const unidadActual=String(actual?.unidad||'');const unidadEsConocida=UNIDADES_COCINA.some(u=>u.value===unidadActual);return <div key={index} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]"><input name={`ingrediente_${index}`} defaultValue={actual?.ingrediente||''} placeholder={`Ingrediente ${index+1}`} className="rounded-lg border p-2"/><input name={`cantidad_${index}`} type="number" min="0" step="0.001" defaultValue={actual?.cantidad??''} placeholder="Cantidad" className="rounded-lg border p-2"/><select name={`unidad_${index}`} defaultValue={unidadEsConocida?unidadActual:''} className="rounded-lg border bg-white p-2"><option value="">Unidad</option>{UNIDADES_COCINA.map(unidad=><option key={unidad.value} value={unidad.value}>{unidad.label}</option>)}</select></div>})}</div></div>
        <button className="rounded-xl bg-[#1DB954] px-5 py-3 font-black text-[#071814]">Guardar en maestro de platos</button>
      </form>
    </section>}
  </div></AppShell>;
}
