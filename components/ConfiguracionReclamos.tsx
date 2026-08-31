import { AREAS_RECLAMOS, CATEGORIAS_RECLAMOS } from '@/lib/db/reclamos';
import { guardarMatrizReclamosAction, guardarResponsableReclamoAction } from '@/app/admin-casino/actions';
import GestionReclamoAcciones from '@/components/GestionReclamoAcciones';

type Responsable={area_key:string;responsable:string;correo:string;activo:boolean};
type Permiso={categoria_key:string;area_key:string;puede_ver:boolean;puede_solucionar:boolean};

export default function ConfiguracionReclamos({responsables,permisos}:{responsables:Responsable[];permisos:Permiso[]}){
  const responsable=(key:string)=>responsables.find(item=>item.area_key===key);
  const permiso=(categoria:string,area:string)=>permisos.find(item=>item.categoria_key===categoria&&item.area_key===area);
  return <div className="mt-5 space-y-5">
    <GestionReclamoAcciones/>
    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-[#FFFDF8] p-4">
      <h3 className="text-lg font-black">1. Maestro de responsables</h3>
      <p className="text-sm text-[#6B7570]">Configura una sola vez el responsable y correo activo de cada área. Las derivaciones utilizan estos datos automáticamente.</p>
      <div className="mt-3 space-y-2">{AREAS_RECLAMOS.map(area=>{const actual=responsable(area.key);return <form action={guardarResponsableReclamoAction} key={area.key} className="grid min-w-0 gap-2 rounded-xl border bg-white p-3 md:grid-cols-[minmax(150px,1fr)_minmax(180px,1fr)_minmax(220px,1.2fr)_auto_auto] md:items-end">
        <input type="hidden" name="area_key" value={area.key}/><div><div className="text-xs font-bold text-[#6B7570]">Área</div><div className="font-black">{area.nombre}</div></div>
        <label className="min-w-0 text-xs font-bold">Responsable<input name="responsable" defaultValue={actual?.responsable||''} className="mt-1 w-full min-w-0 rounded-lg border p-2 text-sm font-normal"/></label>
        <label className="min-w-0 text-xs font-bold">Correo<input type="email" name="correo" defaultValue={actual?.correo||''} className="mt-1 w-full min-w-0 rounded-lg border p-2 text-sm font-normal"/></label>
        <label className="flex items-center gap-2 rounded-lg bg-[#F6F3EA] px-3 py-2 text-sm font-bold"><input type="checkbox" name="activo" defaultChecked={actual?.activo??true}/> Activo</label>
        <button className="rounded-lg bg-[#0E2A23] px-4 py-2 text-sm font-black text-white">Guardar</button>
      </form>})}</div>
    </section>
    <section className="rounded-2xl border border-[#A6B0AA]/25 bg-[#FFFDF8] p-4">
      <h3 className="text-lg font-black">2. Matriz VER / SOLUCIONAR</h3>
      <p className="text-sm text-[#6B7570]">Define qué área puede ver o solucionar cada tipo de reclamo. Los permisos son independientes.</p>
      <form action={guardarMatrizReclamosAction} className="mt-3"><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full min-w-[980px] text-sm"><thead><tr className="bg-[#F6F3EA] text-left"><th className="p-3">Categoría</th>{AREAS_RECLAMOS.map(area=><th key={area.key} className="p-3 text-center">{area.nombre}</th>)}</tr></thead><tbody>{CATEGORIAS_RECLAMOS.map(categoria=><tr key={categoria.key} className="border-t"><th className="p-3 text-left">{categoria.nombre}</th>{AREAS_RECLAMOS.map(area=>{const actual=permiso(categoria.key,area.key);return <td key={area.key} className="p-3"><div className="flex justify-center gap-4"><label className="flex items-center gap-1"><input type="checkbox" name={`ver__${categoria.key}__${area.key}`} defaultChecked={actual?.puede_ver??false}/> VER</label><label className="flex items-center gap-1"><input type="checkbox" name={`solucionar__${categoria.key}__${area.key}`} defaultChecked={actual?.puede_solucionar??false}/> SOLUCIONAR</label></div></td>})}</tr>)}</tbody></table></div><button className="mt-3 rounded-lg bg-[#1DB954] px-5 py-2 font-black">Guardar matriz de permisos</button></form>
    </section>
  </div>;
}
