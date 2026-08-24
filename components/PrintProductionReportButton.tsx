'use client';

export default function PrintProductionReportButton(){
  return <button type="button" onClick={()=>window.print()} className="rounded-xl bg-[#0E2A23] px-4 py-2 font-black text-white print:hidden">Imprimir / Guardar PDF</button>;
}
