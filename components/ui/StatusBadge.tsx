export default function StatusBadge({value}:{value:string|number|null|undefined}){
  const text=String(value||'Sin estado');
  const upper=text.toUpperCase();
  let cls='border-[#DDE5E2] bg-[#F7F9F8] text-[#50615D]';
  if(/PAGADO|VALIDADO|AUTORIZADA|PUBLICADA|FINALIZADO/.test(upper)) cls='border-[#BFE7D0] bg-[#EFFAF3] text-[#176B42]';
  else if(/RECHAZ|ERROR|VENC/.test(upper)) cls='border-[#EEC7C7] bg-[#FFF1F1] text-[#9B2C2C]';
  else if(/PEND|RECIBIDO|REVISION|BORRADOR/.test(upper)) cls='border-[#F1DCA7] bg-[#FFF8E8] text-[#805B16]';
  else if(/OBSERV/.test(upper)) cls='border-[#D7C9EC] bg-[#F7F2FF] text-[#68429A]';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${cls}`}>{text}</span>;
}
