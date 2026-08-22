export const SERVICIOS_MINUTA=['Desayuno','Almuerzo','Once','Cena'] as const;
export const OPCIONES_MINUTA=['OPCION 1','OPCION 2','HIPOCALORICO','TIPO R'] as const;

export type FilaMinutaInput={fecha:string;servicio:string;tipo_opcion:string;plato:string};
export type ErrorFilaMinuta={fila:number;campo:string;mensaje:string};

export function normalizarFilaMinuta(row:FilaMinutaInput):FilaMinutaInput{
  return {fecha:String(row.fecha||'').trim(),servicio:String(row.servicio||'').trim(),tipo_opcion:String(row.tipo_opcion||'').trim().toUpperCase(),plato:String(row.plato||'').trim().replace(/\s+/g,' ')};
}

export function validarFilasMinuta(rows:FilaMinutaInput[]):ErrorFilaMinuta[]{
  const errores:ErrorFilaMinuta[]=[];
  const combinaciones=new Map<string,number>();
  const platosPorServicio=new Map<string,Map<string,{plato:string;fila:number}>>();
  rows.forEach((original,index)=>{
    const row=normalizarFilaMinuta(original); const fila=index+1;
    const fechaValida=/^\d{4}-\d{2}-\d{2}$/.test(row.fecha)&&!Number.isNaN(new Date(`${row.fecha}T12:00:00Z`).getTime());
    if(!fechaValida) errores.push({fila,campo:'fecha',mensaje:'Fecha inválida; usa YYYY-MM-DD.'});
    if(!SERVICIOS_MINUTA.includes(row.servicio as typeof SERVICIOS_MINUTA[number])) errores.push({fila,campo:'servicio',mensaje:'Servicio no permitido.'});
    if(!OPCIONES_MINUTA.includes(row.tipo_opcion as typeof OPCIONES_MINUTA[number])) errores.push({fila,campo:'opcion',mensaje:'Opción no permitida.'});
    if(!row.plato) errores.push({fila,campo:'plato',mensaje:'Plato obligatorio.'});
    const key=`${row.fecha}|${row.servicio}|${row.tipo_opcion}`;
    const anterior=combinaciones.get(key);
    if(anterior) errores.push({fila,campo:'opcion',mensaje:`Combinación duplicada con fila ${anterior}.`}); else combinaciones.set(key,fila);
    if(['OPCION 1','OPCION 2'].includes(row.tipo_opcion)){
      const servicioKey=`${row.fecha}|${row.servicio}`;
      const opciones=platosPorServicio.get(servicioKey)||new Map();
      const otra=row.tipo_opcion==='OPCION 1'?'OPCION 2':'OPCION 1';
      const contraparte=opciones.get(otra);
      if(contraparte&&contraparte.plato.toLocaleLowerCase('es-CL')===row.plato.toLocaleLowerCase('es-CL')) errores.push({fila,campo:'plato',mensaje:`Opción 1 y Opción 2 repiten plato (fila ${contraparte.fila}).`});
      opciones.set(row.tipo_opcion,{plato:row.plato,fila}); platosPorServicio.set(servicioKey,opciones);
    }
  });
  return errores;
}
