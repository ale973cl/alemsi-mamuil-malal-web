export type ProduccionAgrupable={servicio:string;tipo_opcion?:string|null;plato:string;institucion:string;nombre:string;rut:string};

export function opcionVisible(v?:string|null){
  const s=String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  if(s.includes('OPCION 1')) return 'Opción 1';
  if(s.includes('OPCION 2')) return 'Opción 2';
  if(s.includes('HIPO')) return 'Hipocalórico';
  return String(v||'Sin opción').trim()||'Sin opción';
}
export function ordenOpcion(v?:string|null){const s=opcionVisible(v);return s==='Opción 1'?1:s==='Opción 2'?2:s==='Hipocalórico'?3:4;}

export function agruparProduccion<T extends ProduccionAgrupable>(rows:T[]){
  const servicios=[...new Set(rows.map(r=>r.servicio))];
  return servicios.map(servicio=>{
    const serviceRows=rows.filter(r=>r.servicio===servicio);
    const keys=[...new Set(serviceRows.map(r=>`${String(r.tipo_opcion||'Sin opción')}|||${r.plato}`))]
      .sort((a,b)=>{const [oa,pa]=a.split('|||');const [ob,pb]=b.split('|||');return ordenOpcion(oa)-ordenOpcion(ob)||pa.localeCompare(pb,'es');});
    const preparaciones=keys.map(key=>{
      const [opcionRaw,plato]=key.split('|||');
      const people=serviceRows.filter(r=>String(r.tipo_opcion||'Sin opción')===opcionRaw&&r.plato===plato);
      const instituciones=[...new Set(people.map(r=>r.institucion))].sort((a,b)=>a.localeCompare(b,'es')).map(institucion=>({
        institucion,
        personas:people.filter(r=>r.institucion===institucion).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')),
      }));
      return {opcion:opcionVisible(opcionRaw),opcionRaw,plato,total:people.length,instituciones};
    });
    return {servicio,total:serviceRows.length,preparaciones};
  });
}
