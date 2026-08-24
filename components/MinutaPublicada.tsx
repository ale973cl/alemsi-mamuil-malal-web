import type { MinutaRow } from '@/lib/db/minutas';

const ORDEN_SERVICIO=['Desayuno','Almuerzo','Once','Cena'];

function hoyChile(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

function fechaLarga(fecha:string){
  const [y,m,d]=fecha.split('-').map(Number);
  if(!y||!m||!d) return fecha;
  return new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Santiago'}).format(new Date(Date.UTC(y,m-1,d,12)));
}

export default function MinutaPublicada({rows,empty='No existe minuta publicada para el período.'}:{rows:MinutaRow[];empty?:string}){
  const hoy=hoyChile();
  const fechas=[...new Set(rows.map(row=>String(row.fecha)))].sort();

  return <div className="mt-4 space-y-5">
    {fechas.map(fecha=>{
      const filas=rows.filter(row=>String(row.fecha)===fecha);
      const servicios=[...new Set(filas.map(row=>row.servicio))].sort((a,b)=>{
        const ia=ORDEN_SERVICIO.indexOf(a); const ib=ORDEN_SERVICIO.indexOf(b);
        return (ia<0?99:ia)-(ib<0?99:ib);
      });
      const esHoy=fecha===hoy;

      return <section key={fecha} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${esHoy?'border-[#1DB954] ring-2 ring-[#1DB954]/20':'border-[#A6B0AA]/30'}`}>
        <header className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${esHoy?'bg-[#1DB954]/10':'bg-[#F6F3EA]'}`}>
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[.16em] text-[#6B7570]">Minuta publicada</div>
            <h3 className="mt-1 text-xl font-black capitalize text-[#0E2A23]">{fechaLarga(fecha)}</h3>
          </div>
          <div className="flex items-center gap-2">
            {esHoy&&<span className="rounded-full bg-[#1DB954] px-3 py-1 text-xs font-black text-[#071814]">HOY</span>}
            <span className="rounded-full border border-[#A6B0AA]/40 bg-white px-3 py-1 text-xs font-bold text-[#6B7570]">{fecha}</span>
          </div>
        </header>

        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {servicios.map(servicio=>{
            const opciones=filas.filter(row=>row.servicio===servicio);
            return <article key={servicio} className="rounded-2xl border border-[#A6B0AA]/25 bg-[#FFFDF8] p-4">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#A6B0AA]/20 pb-3">
                <h4 className="text-lg font-black uppercase tracking-wide text-[#0E2A23]">{servicio}</h4>
                <span className="text-xs font-bold text-[#6B7570]">{opciones.length} opción(es)</span>
              </div>
              <div className="space-y-3">
                {opciones.map((row,index)=><div key={`${row.servicio}-${row.tipo_opcion}-${row.plato}-${index}`} className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#1DB954]">{row.tipo_opcion||'Sin opción'}</div>
                  <div className="mt-1 text-base font-black text-[#0E2A23]">{row.plato}</div>
                </div>)}
              </div>
            </article>;
          })}
        </div>
      </section>;
    })}
    {!rows.length&&<p className="rounded-2xl bg-[#F6F3EA] p-5 text-sm text-[#6B7570]">{empty}</p>}
  </div>;
}
