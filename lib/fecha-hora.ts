export const ZONA_CHILE='America/Santiago' as const;

const partes=(date:Date,conHora=false)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
  timeZone:ZONA_CHILE,year:'numeric',month:'2-digit',day:'2-digit',
  ...(conHora?{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23' as const}:{}),
}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value])) as Record<string,string>;

export function fechaIsoChile(date=new Date()):string{const p=partes(date);return `${p.year}-${p.month}-${p.day}`;}
export function fechaVisible(fecha:string|Date):string{
  const iso=fecha instanceof Date?fechaIsoChile(fecha):String(fecha).slice(0,10);
  const [y,m,d]=iso.split('-');return y&&m&&d?`${d}-${m}-${y}`:String(fecha);
}
export function fechaHoraVisibleChile(date=new Date()):string{const p=partes(date,true);return `${p.day}-${p.month}-${p.year} · ${p.hour}:${p.minute}:${p.second}`;}

export function epochHoraChile(fechaIso:string,hora=0,minuto=0):number{
  const [year,month,day]=fechaIso.split('-').map(Number);
  let guess=Date.UTC(year,month-1,day,hora,minuto,0);
  for(let i=0;i<3;i+=1){
    const p=partes(new Date(guess),true);
    const mostrado=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute),Number(p.second));
    guess+=Date.UTC(year,month-1,day,hora,minuto,0)-mostrado;
  }
  return guess;
}
