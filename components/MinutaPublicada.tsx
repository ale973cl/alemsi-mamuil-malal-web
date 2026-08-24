import type { MinutaRow } from '@/lib/db/minutas';

export default function MinutaPublicada({rows,empty='No existe minuta publicada para el período.'}:{rows:MinutaRow[];empty?:string}){
  const fechas=[...new Set(rows.map(row=>String(row.fecha)))];
  return <div className="mt-3 space-y-4">{fechas.map(fecha=><section key={fecha} className="rounded-xl border p-4"><h3 className="font-black">{fecha}</h3><div className="mt-2 overflow-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="text-left"><th>Servicio</th><th>Opción</th><th>Plato</th></tr></thead><tbody>{rows.filter(row=>String(row.fecha)===fecha).map((row,index)=><tr key={`${row.servicio}-${row.tipo_opcion}-${row.plato}-${index}`} className="border-t"><td className="py-2 font-bold">{row.servicio}</td><td>{row.tipo_opcion||'—'}</td><td>{row.plato}</td></tr>)}</tbody></table></div></section>)}{!rows.length&&<p className="rounded-xl bg-[#F6F3EA] p-4 text-sm">{empty}</p>}</div>;
}
