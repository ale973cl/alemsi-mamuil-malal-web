import StatusBadge from './StatusBadge';

type MenuRow={id?:number;fecha:string;servicio:string;tipo_opcion?:string;plato?:string;estado?:string};
type DemandRow={fecha:string;servicio:string;tipo_opcion?:string;plato?:string;institucion?:string;cantidad:number};

const orderService=['Desayuno','Almuerzo','Once','Cena'];
const optionOrder=['OPCION 1','OPCION 2','OPCION 3','HIPOCALORICO','TIPO R'];

function fmtDate(value:string){
  const d=new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('es-CL',{weekday:'short',day:'2-digit',month:'short'}).format(d).replace('.','');
}

function sameText(a?:string,b?:string){return String(a||'').trim().toUpperCase()===String(b||'').trim().toUpperCase()}

export default function WeeklyMenuCalendar({rows,demand=[]}:{rows:MenuRow[];demand?:DemandRow[]}){
  const dates=[...new Set(rows.map(r=>String(r.fecha)))].sort();
  if(!dates.length) return <div className="rounded-2xl bg-[#F6F8F7] p-6 text-sm text-[#667572]">No hay minuta cargada para el período seleccionado.</div>;
  return <div className="overflow-x-auto pb-2">
    <div className="grid min-w-[980px] gap-3" style={{gridTemplateColumns:`repeat(${Math.min(Math.max(dates.length,1),7)}, minmax(180px,1fr))`}}>
      {dates.map(fecha=>{
        const dayRows=rows.filter(r=>String(r.fecha)===fecha);
        const dayDemand=demand.filter(r=>String(r.fecha)===fecha);
        const totalDay=dayDemand.reduce((s,r)=>s+Number(r.cantidad||0),0);
        return <article key={fecha} className="rounded-2xl border border-[#DDE5E2] bg-[#FFFDF9] p-3 shadow-[0_8px_20px_rgba(14,42,35,.05)]">
          <div className="mb-3 border-b border-[#E8EEEB] pb-3">
            <div className="text-xs font-extrabold uppercase tracking-[.12em] text-[#169B62]">{fmtDate(fecha)}</div>
            <div className="mt-1 flex items-center justify-between gap-2"><span className="text-sm font-black text-[#0B2B32]">{fecha}</span><span className="rounded-full bg-[#0B2B32] px-2 py-1 text-xs font-black text-white">{totalDay} serv.</span></div>
          </div>
          <div className="space-y-4">
            {orderService.map(servicio=>{
              const serviceRows=dayRows.filter(r=>sameText(r.servicio,servicio));
              if(!serviceRows.length) return null;
              const sd=dayDemand.filter(r=>sameText(r.servicio,servicio));
              const total=sd.reduce((s,r)=>s+Number(r.cantidad||0),0);
              const inst=[...new Set(sd.map(r=>String(r.institucion||'').trim()).filter(Boolean))].map(name=>({name,total:sd.filter(r=>String(r.institucion||'').trim()===name).reduce((s,r)=>s+Number(r.cantidad||0),0)})).sort((a,b)=>b.total-a.total);
              return <div key={servicio}>
                <div className="flex items-center justify-between"><h3 className="text-sm font-black text-[#0B2B32]">{servicio}</h3><span className="text-xs font-extrabold text-[#169B62]">{total} personas</span></div>
                {inst.length>0&&<div className="mt-1 flex flex-wrap gap-1">{inst.slice(0,4).map(x=><span key={x.name} className="rounded-full bg-[#F0F4F2] px-2 py-1 text-[10px] font-bold text-[#5B6A67]">{x.name} {x.total}</span>)}</div>}
                <div className="mt-2 space-y-2">
                  {serviceRows.sort((a,b)=>optionOrder.indexOf(String(a.tipo_opcion||''))-optionOrder.indexOf(String(b.tipo_opcion||''))).map((r,i)=>{
                    const count=sd.filter(d=>sameText(d.tipo_opcion,r.tipo_opcion)&&sameText(d.plato,r.plato)).reduce((s,d)=>s+Number(d.cantidad||0),0);
                    return <div key={`${r.id||i}-${r.tipo_opcion}`} className="rounded-xl border border-[#E5EBE8] bg-white p-2.5">
                      <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#71807C]">{r.tipo_opcion||'Opción'}</span><span className="rounded-full bg-[#E9F8EF] px-2 py-0.5 text-xs font-black text-[#176B42]">{count}</span></div>
                      <div className="mt-1 text-sm font-bold leading-5 text-[#17352E]">{r.plato||'Sin plato'}</div>
                    </div>
                  })}
                </div>
              </div>
            })}
          </div>
          <div className="mt-4"><StatusBadge value={dayRows[0]?.estado}/></div>
        </article>
      })}
    </div>
  </div>;
}
