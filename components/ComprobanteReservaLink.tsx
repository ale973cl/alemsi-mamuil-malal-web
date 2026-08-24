export default function ComprobanteReservaLink({token,estado}:{token?:string|null;estado?:string|null}){
  if(!token) return null;
  const actual=String(estado||'').trim().toUpperCase();
  const recargable=!actual||actual==='OBSERVADO'||actual==='RECHAZADO';
  const label=actual==='OBSERVADO'||actual==='RECHAZADO'?'Cargar nuevo comprobante':recargable?'Cargar comprobante':'Ver estado del comprobante';
  return <a href={`/comprobante/${encodeURIComponent(token)}`} className="inline-flex rounded-lg bg-[#0E2A23] px-3 py-2 text-sm font-bold text-white">{label}</a>;
}
