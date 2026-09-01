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
  const margen=seleccion?.margen_produccion_pct||0;
  const merma=seleccion?.merma_pct||0;
  const personasProduccion=Math.ceil(personas*(1+margen/100));
  const factor=seleccion?personasProduccion/seleccion.porciones_base:1;
  const factorMerma=merma>0?1/(1-merma/100):1;
  const nueva=puedeEditar&&(q.nueva==='1'||Boolean(platoSolicitado&&!recetaPorPlato));
  const filas=nueva?[]:(seleccion?.ingredientes||[]);
  const totalFilas=Math.max(10,Math.min(20,filas.length+3));

  return <AppShell user={u}><div className="space-y-5">
    <section className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border bg-white p-5">
      <div><p className="text-xs font-extrabold tracking-[.18em] text-[#1DB954]">RECETAS ESTÁNDAR</p><h1 className="text-2xl font-black text-[#0E2A23]">Maestro de platos y producción</h1><p className="mt-1 max-w-3xl text-sm text-[#6B7570]">Cada plato concentra su receta, porciones base, margen de producción y merma. Administración define estos parámetros dentro del mismo maestro y Cocina consume ese único estándar.</p></div>
      <Link href="/cocina" className="rounded-xl border border-[#0D9B91] px-4 py-2 text-sm font-black text-[#0D9B91]">Volver a Cocina</Link>
    </section>

    {q.guardado==='1'&&<div className="rounded-xl border border-green-300 bg-green-50 p-4 font-bold text-green-800">Plato, receta y parámetros de producción guardados correctamente.</div>}

    <section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-bold">Plato del maestro<select name="plato" defaultValue={platoBase} className="mt-1 block min-w-72 rounded-lg border bg-white p-2">{platosMaestro.map(p=><option key={p.plato} value={p.plato}>{p.plato}{p.receta_id?' · receta cargada':' · desde minuta'}</option>)}</select></label>
          {!puedeEditar&&<label className="text-sm font-bold">Porciones / reservas base<input name="personas" type="number" min="1" defaultValue={personas} className="mt-1 block w-40 rounded-lg border p-2"/></label>}
          <button className="rounded-lg bg-[#0E2A23] px-4 py-2 font-bold text-white">{puedeEditar?'Abrir / editar':'Calcular producción'}</button>
        </form>
        {puedeEditar&&<Link href="/recetas?nueva=1" className="rounded-lg border border-[#1DB954] px-4 py-2 font-black text-[#0E2A23]">Agregar plato no existente</Link>}
      </div>
      <p className="mt-3 text-xs text-[#6B7570]">Prioridad: usar siempre el plato proveniente de la minuta. “Agregar plato no existente” queda solo como excepción.</p>
    </section>

    {!puedeEditar&&seleccion&&<section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black tracking-[.14em] text-[#0D9B91]">RECETA DE PRODUCCIÓN</p><h2 className="text-2xl font-black">{seleccion.plato}</h2><p className="mt-1 text-sm text-[#6B7570]">Base estándar: {seleccion.porciones_base} porciones · Reservas/raciones base: <b>{personas}</b> · Margen: <b>{numero(margen)}%</b> · Producción: <b>{personasProduccion}</b> · Merma: <b>{numero(merma)}%</b></p></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#F6F3EA] p-3"><div className="text-xs font-bold text-[#6B7570]">Raciones base</div><div className="text-xl font-black">{personas}</div></div><div className="rounded-xl bg-[#F6F3EA] p-3"><div className="text-xs font-bold text-[#6B7570]">Margen aplicado</div><div className="text-xl font-black">{numero(margen)}% → {personasProduccion}</div></div><div className="rounded-xl bg-[#F6F3EA] p-3"><div className="text-xs font-bold text-[#6B7570]">Merma del plato</div><div className="text-xl font-black">{numero(merma)}%</div></div></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-sm"><thead><tr className="bg-[#F6F3EA] text-left"><th className="p-3">Ingrediente</th><th className="p-3">Cantidad base</th><th className="p-3">Neto producción</th><th className="p-3">Final con merma</th><th className="p-3">Unidad</th></tr></thead><tbody>{seleccion.ingredientes.map(i=>{const neto=i.cantidad*factor;const bruto=neto*factorMerma;return <tr key={i.id||`${i.ingrediente}-${i.orden}`} className="border-b"><td className="p-3 font-bold">{i.ingrediente}</td><td className="p-3">{numero(i.cantidad)}</td><td className="p-3">{numero(neto)}</td><td className="p-3 text-lg font-black text-[#0D9B91]">{numero(bruto)}</td><td className="p-3">{i.unidad||'—'}</td></tr>})}</tbody></table></div>
      <div className="mt-5 rounded-xl bg-[#F7FAF8] p-4"><h3 className="font-black">Preparación estándar</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#35443E]">{seleccion.preparacion}</p></div>
    </section>}

    {!puedeEditar&&!seleccion&&<div className="rounded-2xl bg-[#F6F3EA] p-5 text-sm font-bold">El plato seleccionado todavía no tiene una receta estándar cargada por Administración de Casino.</div>}

    {puedeEditar&&<section className="rounded-2xl border bg-white p-5">
      <div><p className="text-xs font-extrabold tracking-[.16em] text-[#1DB954]">ADMINISTRACIÓN DE RECETAS</p><h2 className="text-xl font-black">{nueva?(platoSolicitado?`Completar receta · ${platoSolicitado}`:'Agregar plato y receta'):seleccion?`Editar · ${seleccion.plato}`:'Crear primera receta'}</h2><p className="mt-1 text-sm text-[#6B7570]">Los parámetros de margen y merma pertenecen a este plato y se guardan junto con su receta estándar. No existe una configuración separada para aplicarlos globalmente.</p></div>
      <form action={guardarRecetaAction} className="mt-5 space-y-5">
        {!nueva&&seleccion&&<input type="hidden" name="id" value={seleccion.id}/>} 
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]"><label className="text-sm font-bold">Nombre del plato<input name="plato" required readOnly={Boolean(platoSolicitado)} defaultValue={nueva?platoBase:seleccion?.plato||platoBase} className="mt-1 block w-full rounded-lg border p-2 read-only:bg-[#F6F3EA]"/></label><label className="text-sm font-bold">Porciones base<input name="porciones_base" type="number" min="1" required defaultValue={nueva?4:seleccion?.porciones_base||4} className="mt-1 block w-full rounded-lg border p-2"/></label><label className="flex items-end gap-2 pb-2 text-sm font-bold"><input type="checkbox" name="activo" defaultChecked={nueva?true:Boolean(seleccion?.activo)}/> Activa</label></div>
        <div className="grid gap-3 rounded-xl border border-[#0D9B91]/25 bg-[#F7FAF8] p-4 md:grid-cols-2"><label className="text-sm font-bold">Margen de producción del plato (%)<input name="margen_produccion_pct" type="number" min="0" max="100" step="0.01" required defaultValue={nueva?0:seleccion?.margen_produccion_pct||0} className="mt-1 block w-full rounded-lg border bg-white p-2"/><span className="mt-1 block text-xs font-normal text-[#6B7570]">Aumenta las raciones de este plato sobre las reservas/raciones reales.</span></label><label className="text-sm font-bold">Merma del plato (%)<input name="merma_pct" type="number" min="0" max="99.99" step="0.01" required defaultValue={nueva?0:seleccion?.merma_pct||0} className="mt-1 block w-full rounded-lg border bg-white p-2"/><span className="mt-1 block text-xs font-normal text-[#6B7570]">Ajusta la cantidad bruta de ingredientes necesaria para este plato.</span></label><p className="md:col-span-2 text-xs text-[#6B7570]">Cálculo: raciones reales → margen del plato → receta estándar → merma del plato → cantidad final de ingredientes.</p></div>
        <label className="block text-sm font-bold">Preparación / instrucciones<textarea name="preparacion" required rows={7} defaultValue={nueva?'':seleccion?.preparacion||''} placeholder="Describe cómo preparar el plato, orden de incorporación, cocción, tiempos y criterios de terminación." className="mt-1 block w-full rounded-lg border p-3"/></label>
        <div><h3 className="font-black">Ingredientes y cantidad base</h3><p className="text-sm text-[#6B7570]">Completa solo las filas necesarias. La unidad se selecciona desde medidas estandarizadas de cocina para mantener consistencia en recetas y cálculos.</p><div className="mt-3 space-y-2">{Array.from({length:totalFilas},(_,index)=>{const actual=filas[index];const unidadActual=String(actual?.unidad||'');const unidadEsConocida=UNIDADES_COCINA.some(u=>u.value===unidadActual);return <div key={index} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]"><input name={`ingrediente_${index}`} defaultValue={actual?.ingrediente||''} placeholder={`Ingrediente ${index+1}`} className="rounded-lg border p-2"/><input name={`cantidad_${index}`} type="number" min="0" step="0.001" defaultValue={actual?.cantidad??''} placeholder="Cantidad" className="rounded-lg border p-2"/><select name={`unidad_${index}`} defaultValue={unidadEsConocida?unidadActual:''} className="rounded-lg border bg-white p-2"><option value="">Unidad</option>{UNIDADES_COCINA.map(unidad=><option key={unidad.value} value={unidad.value}>{unidad.label}</option>)}</select></div>})}</div></div>
        <button className="rounded-xl bg-[#1DB954] px-5 py-3 font-black text-[#071814]">Guardar plato y parámetros de producción</button>
      </form>
    </section>}
  </div></AppShell>;
}
