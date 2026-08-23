export function formatFecha(value?: string | null): string {
  const raw=String(value||'').trim();
  if(!raw) return '—';
  const iso=/^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if(iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const d=new Date(raw);
  if(Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'numeric'}).format(d).replaceAll('/','-');
}

export function formatFechaHora(value?: string | null): string {
  const raw=String(value||'').trim();
  if(!raw) return '—';
  const d=new Date(raw);
  if(Number.isNaN(d.getTime())) return formatFecha(raw);
  const parts=new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
  const pick=(type:string)=>parts.find(p=>p.type===type)?.value||'';
  return `${pick('day')}-${pick('month')}-${pick('year')} ${pick('hour')}:${pick('minute')}`;
}

export function formatPeriodo(inicio?:string|null,fin?:string|null){
  return `${formatFecha(inicio)} al ${formatFecha(fin)}`;
}

export function numeroReserva(codigo?:string|null,referencia?:string|null):string{
  const publicCode=String(codigo||'').trim();
  if(publicCode && !/^MM-/i.test(publicCode)) return publicCode;
  const ref=String(referencia||'').trim();
  const groups=ref.match(/\d+/g)||[];
  const tail=groups.slice(-2).join('');
  if(tail) return tail.slice(-8).padStart(Math.min(8,tail.length),'0');
  return publicCode||ref||'—';
}
