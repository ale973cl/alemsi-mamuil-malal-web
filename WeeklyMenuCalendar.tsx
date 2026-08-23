import StatusBadge from './StatusBadge';
import { formatFecha } from '@/lib/ui/format';

type MenuRow={id?:number;fecha:string;servicio:string;tipo_opcion?:string;plato?:string;estado?:string};
type DemandRow={fecha:string;servicio:string;tipo_opcion?:string;plato?:string;institucion?:string;cantidad:number;comensales?:string[]};

const orderService=['Desayuno','Almuerzo','Once','Cena'];
const optionOrder=['OPCION 1','OPCION 2','OPCION 3','HIPOCALORICO','TIPO R'];

function weekday(value:string){
  const d=new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('es-CL',{weekday:'long'}).format(d);
}
function sameText(a?:string,b?:string){return String(a||'').trim().toUpperCase()===String(b||'').trim().toUpperCase()}
function unique<T>(values:T[]){return [...new Set(values)]}

export default function WeeklyMenuCalendar({rows,demand=[]}:{rows:MenuRow[];demand?:DemandRow[]}){
  const dates=unique(rows.map(r=>String(r.fecha))).sort();
  if(!dates.length) return <div className="rounded-2xl bg-[#F6F8F7] p-6 text-sm text-[#667572]">No hay minuta cargada para el período seleccionado.</div>;
  return <div className="overflow-x-auto pb-2 print:overflow-visible">
    <div className="grid min-w-[1020px] gap-3 print:min-w-0 print:grid-cols-7" style={{gridTemplateColumns:`repeat(${Math.min(Math.max(dates.length,1),7)}, minmax(190px,1fr))`}}>
      {dates.map(fecha=>{
        const dayRows=rows.filter(r=>String(r.fecha)===fecha);
        const dayDemand=demand.filter(r=>String(r.fecha)===fecha);
        const totalDay=dayDemand.reduce((s,r)=>s+Number(r.cantidad||0),0);
        const serviceTotals=orderService.map(servicio=>({servicio,total:dayDemand.filter(r=>sameText(r.servicio,servicio)).reduce((s,r)=>s+Number(r.cantidad||0),0)})).filter(x=>x.total>0||dayRows.some(r=>sameText(r.servicio,x.servicio)));
        return <details key={fecha} className="group rounded-2xl border border-[#DDE5E2] bg-[#FFFDF9] shadow-[0_8px_20px_rgba(14,42,35,.05)] print:break-inside-avoid" open={dates.length<=3}>
          <summary className="cursor-pointer list-none p-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E8EEEB] pb-3">
              <div><div className="text-xs font-extrabold uppercase tracking-[.12em] text-[#169B62]">{weekday(fecha)}</div><div className="mt-1 text-lg font-black text-[#0B2B32]">{formatFecha(fecha)}</div></div>
              <div className="rounded-full bg-[#0B2B32] px-2.5 py-1 text-xs font-black text-white">{totalDay} raciones</div>
            </div>
            <div className="mt-3 space-y-1.5">{serviceTotals.map(x=><div key={x.servicio} className="flex items-center justify-between text-sm"><span className="font-bold text-[#42534F]">{x.servicio}</span><span className="font-black text-[#17352E]">{x.total}</span></div>)}</div>
            <div className="mt-3 text-[11px] font-bold text-[#71807C] group-open:hidden">Abrir detalle del día</div>
          </summary>
          <div className="border-t border-[#E8EEEB] px-4 pb-4 pt-3">
            <div className="space-y-4">
              {orderService.map(servicio=>{
                const serviceRows=dayRows.filter(r=>sameText(r.servicio,servicio));
                if(!serviceRows.length) return null;
                const sd=dayDemand.filter(r=>sameText(r.servicio,servicio));
                const total=sd.reduce((s,r)=>s+Number(r.cantidad||0),0);
                return <section key={servicio} className="rounded-xl bg-[#F6F8F7] p-3">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-black text-[#0B2B32]">{servicio}</h3><span className="text-xs font-extrabold text-[#169B62]">{total} raciones</span></div>
                  <div className="mt-2 space-y-2">
                    {[...serviceRows].sort((a,b)=>optionOrder.indexOf(String(a.tipo_opcion||''))-optionOrder.indexOf(String(b.tipo_opcion||''))).map((r,i)=>{
                      const plateRows=sd.filter(d=>sameText(d.tipo_opcion,r.tipo_opcion)&&sameText(d.plato,r.plato));
                      const count=plateRows.reduce((s,d)=>s+Number(d.cantidad||0),0);
                      const institutions=unique(plateRows.map(d=>String(d.institucion||'Sin institución'))).map(name=>({name,total:plateRows.filter(d=>String(d.institucion||'Sin institución')===name).reduce((s,d)=>s+Number(d.cantidad||0),0),names:unique(plateRows.filter(d=>String(d.institucion||'Sin institución')===name).flatMap(d=>d.comensales||[]))})).sort((a,b)=>b.total-a.total);
                      return <details key={`${r.id||i}-${r.tipo_opcion}`} className="rounded-xl border border-[#E5EBE8] bg-white p-2.5">
                        <summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-2"><div><div className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71807C]">{r.tipo_opcion||'Opción'}</div><div className="mt-1 text-sm font-bold leading-5 text-[#17352E]">{r.plato||'Sin plato'}</div></div><span className="rounded-full bg-[#E9F8EF] px-2 py-0.5 text-xs font-black text-[#176B42]">{count}</span></div></summary>
                        <div className="mt-2 border-t border-[#EDF1EF] pt-2 text-xs">
                          {institutions.length?institutions.map(inst=><details key={inst.name} className="mb-1 rounded-lg bg-[#F7F9F8] p-2"><summary className="cursor-pointer font-bold text-[#42534F]">{inst.name} — {inst.total}</summary>{inst.names.length>0&&<ul className="mt-2 space-y-1 pl-3 text-[#667572]">{inst.names.map(name=><li key={name}>• {name}</li>)}</ul>}</details>):<div className="text-[#71807C]">Sin reservas asignadas aún.</div>}
                        </div>
                      </details>
                    })}
                  </div>
                </section>
              })}
            </div>
            <div className="mt-4"><StatusBadge value={dayRows[0]?.estado}/></div>
          </div>
        </details>
      })}
    </div>
  </div>;
}
