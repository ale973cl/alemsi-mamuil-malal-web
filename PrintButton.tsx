'use client';
export default function PrintButton({label='Imprimir / Guardar PDF'}:{label?:string}){
  return <button type="button" onClick={()=>window.print()} className="rounded-xl border border-[#DDE5E2] bg-white px-3 py-2 text-xs font-black text-[#27423B] hover:bg-[#F6F8F7]">{label}</button>;
}
